/**
 * GitHub integration for the feedback widget.
 *
 * Handles creating GitHub issues via REST API and adding them to
 * the cyberdeck-club org's Project #1 via GraphQL API.
 */

import { env } from "cloudflare:workers";

type FeedbackIssueData = {
  title: string;
  description: string;
  pageUrl: string;
  submitterEmail: string;
  submitterName: string;
  submitterId: string;
  submitterUsername: string;
  baseUrl: string;
  autoScreenshotUrl?: string;
  userScreenshotUrls: string[];
  submittedAt: string;
};

/**
 * Sanitize a username for use in GitHub label names.
 * - Lowercases the string
 * - Replaces non-alphanumeric chars (except hyphens/underscores) with underscores
 * - Trims leading/trailing underscores
 */
function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "");
}

type CreateIssueResponse = {
  number: number;
  node_id: string;
  html_url: string;
};

type GitHubGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

/**
 * Ensure a user-specific label exists in the repository.
 * Creates the label if it doesn't exist, silently succeeds if it already does.
 *
 * @param username - The sanitized username for the label
 */
export async function ensureUserLabel(username: string): Promise<void> {
  const mediaEnv = env as App.Env;
  const pat = mediaEnv.GITHUB_FEEDBACK_PAT;

  if (!pat) {
    throw new Error("GITHUB_FEEDBACK_PAT is not set in environment variables");
  }

  const labelName = `user:${sanitizeUsername(username)}`;

  const response = await fetch(
    "https://api.github.com/repos/cyberdeck-club/cyberdeck.club/labels",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cyberdeck-feedback-bot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: labelName,
        color: "c5def5",
        description: `Feedback from ${username}`,
      }),
    }
  );

  // 422 with "already_exists" error means the label already exists — that's fine
  if (response.status === 422) {
    const errorJson = await response.json().catch(() => null);
    if (
      errorJson?.errors?.some(
        (e: { code: string }) => e.code === "already_exists"
      )
    ) {
      return; // Label already exists, silently succeed
    }
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(
      `GitHub REST API error (create label): ${response.status} ${response.statusText} — ${errorText}`
    );
  }
}

/**
 * Create a GitHub issue for a feedback submission via the REST API.
 *
 * @param data - Feedback issue data
 * @returns Object containing issue number, node ID, and URL
 */
export async function createFeedbackIssue(
  data: FeedbackIssueData
): Promise<{ issueNumber: number; issueNodeId: string; issueUrl: string }> {
  const mediaEnv = env as App.Env;
  const pat = mediaEnv.GITHUB_FEEDBACK_PAT;

  if (!pat) {
    throw new Error("GITHUB_FEEDBACK_PAT is not set in environment variables");
  }

  // Ensure the user-specific label exists before creating the issue
  await ensureUserLabel(data.submitterUsername);

  // Build markdown body for the issue
  const screenshotSections: string[] = [];

  if (data.autoScreenshotUrl) {
    screenshotSections.push(
      "### Auto-captured Screenshot\n\n",
      `![Auto screenshot](${data.autoScreenshotUrl})\n`,
    );
  } else {
    screenshotSections.push(
      "### Auto-captured Screenshot\n\n",
      "_Auto-screenshot was not available._\n",
    );
  }

  if (data.userScreenshotUrls.length > 0) {
    screenshotSections.push("---\n\n### User-provided Screenshots\n\n");
    data.userScreenshotUrls.forEach((url, i) => {
      screenshotSections.push(`![User screenshot ${i + 1}](${url})\n`);
    });
  }

  const issueBody = [
    `## 📋 Feedback Report`,
    ``,
    `**Submitted:** ${data.submittedAt}`,
    `**Page:** [${data.pageUrl}](${data.pageUrl})`,
    `**Reporter:** ${data.submitterName} (${data.submitterEmail})`,
    `**Admin link:** [${data.baseUrl}/admin/users](${data.baseUrl}/admin/users?highlight=${data.submitterId})`,
    ``,
    `---`,
    ``,
    `### Description`,
    ``,
    `${data.description}`,
    ``,
    `---`,
    ...screenshotSections,
  ].join("\n");

  const response = await fetch(
    "https://api.github.com/repos/cyberdeck-club/cyberdeck.club/issues",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cyberdeck-feedback-bot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        body: issueBody,
        labels: ["feedback", "from-widget", `user:${sanitizeUsername(data.submitterUsername)}`],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(
      `GitHub REST API error: ${response.status} ${response.statusText} — ${errorText}`
    );
  }

  const json = (await response.json()) as CreateIssueResponse;

  return {
    issueNumber: json.number,
    issueNodeId: json.node_id,
    issueUrl: json.html_url,
  };
}

const GET_PROJECT_ID_QUERY = `
  query {
    organization(login: "cyberdeck-club") {
      projectV2(number: 1) {
        id
      }
    }
  }
`;

const ADD_TO_PROJECT_MUTATION = `
  mutation AddToProject($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
      item {
        id
      }
    }
  }
`;

type GetProjectIdResponseData = {
  organization: {
    projectV2: {
      id: string;
    };
  };
};

type AddToProjectResponseData = {
  addProjectV2ItemById: {
    item: {
      id: string;
    };
  };
};

/**
 * Add a GitHub issue to Project #1 (cyberdeck-club org) via GraphQL API.
 *
 * @param issueNodeId - The node_id of the GitHub issue (from REST API response)
 * @returns The project item ID
 */
export async function addIssueToProject(issueNodeId: string): Promise<string> {
  const mediaEnv = env as App.Env;
  const pat = mediaEnv.GITHUB_FEEDBACK_PAT;

  if (!pat) {
    throw new Error("GITHUB_FEEDBACK_PAT is not set in environment variables");
  }

  // Step 1: Get the project node ID
  const projectResponse = await fetch(
    "https://api.github.com/graphql",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "User-Agent": "cyberdeck-feedback-bot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: GET_PROJECT_ID_QUERY,
      }),
    }
  );

  if (!projectResponse.ok) {
    const errorText = await projectResponse.text().catch(() => "unknown error");
    throw new Error(
      `GitHub GraphQL API error (get project): ${projectResponse.status} ${projectResponse.statusText} — ${errorText}`
    );
  }

  const projectJson =
    (await projectResponse.json()) as GitHubGraphQLResponse<GetProjectIdResponseData>;

  if (
    projectJson.errors &&
    projectJson.errors.length > 0
  ) {
    throw new Error(
      `GitHub GraphQL errors: ${projectJson.errors.map((e) => e.message).join(", ")}`
    );
  }

  const projectId = projectJson.data?.organization?.projectV2?.id;
  if (!projectId) {
    throw new Error(
      "Could not retrieve Project #1 node ID from GitHub GraphQL API. " +
      "Check that the organization 'cyberdeck-club' has a project with number 1."
    );
  }

  // Step 2: Add the issue to the project
  const addResponse = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "User-Agent": "cyberdeck-feedback-bot",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: ADD_TO_PROJECT_MUTATION,
      variables: {
        projectId,
        contentId: issueNodeId,
      },
    }),
  });

  if (!addResponse.ok) {
    const errorText = await addResponse.text().catch(() => "unknown error");
    throw new Error(
      `GitHub GraphQL API error (add to project): ${addResponse.status} ${addResponse.statusText} — ${errorText}`
    );
  }

  const addJson =
    (await addResponse.json()) as GitHubGraphQLResponse<AddToProjectResponseData>;

  if (addJson.errors && addJson.errors.length > 0) {
    throw new Error(
      `GitHub GraphQL errors: ${addJson.errors.map((e) => e.message).join(", ")}`
    );
  }

  const itemId = addJson.data?.addProjectV2ItemById?.item?.id;
  if (!itemId) {
    throw new Error(
      "Could not retrieve project item ID from GitHub GraphQL API response."
    );
  }

  return itemId;
}

export type FeedbackIssue = {
  number: number;
  title: string;
  state: "open" | "closed";
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  commentsCount: number;
};

/**
 * Fetch feedback issues for a specific user from the GitHub repository.
 *
 * @param username - The username to fetch feedback issues for
 * @returns Array of FeedbackIssue objects, or empty array on failure
 */
export async function fetchUserFeedbackIssues(
  username: string
): Promise<FeedbackIssue[]> {
  try {
    const mediaEnv = env as App.Env;
    const pat = mediaEnv.GITHUB_FEEDBACK_PAT;

    if (!pat) {
      console.error("GITHUB_FEEDBACK_PAT is not set in environment variables");
      return [];
    }

    const sanitizedUsername = sanitizeUsername(username);
    const labelFilter = `user:${sanitizedUsername},feedback`;

    const url = new URL(
      "https://api.github.com/repos/cyberdeck-club/cyberdeck.club/issues"
    );
    url.searchParams.set("labels", labelFilter);
    url.searchParams.set("state", "all");
    url.searchParams.set("sort", "created");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "50");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cyberdeck-feedback-bot",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      console.error(
        `GitHub REST API error (fetch user issues): ${response.status} ${response.statusText} — ${errorText}`
      );
      return [];
    }

    const issues = (await response.json()) as Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      created_at: string;
      updated_at: string;
      labels: Array<{ name: string }>;
      comments: number;
      pull_request?: unknown;
    }>;

    // Filter out pull requests (GitHub API returns PRs in issues endpoint)
    return issues
      .filter((issue) => !issue.pull_request)
      .map(
        (issue): FeedbackIssue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state as "open" | "closed",
          htmlUrl: issue.html_url,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          labels: issue.labels.map((label) => label.name),
          commentsCount: issue.comments,
        })
      );
  } catch (error) {
    console.error("Error fetching user feedback issues:", error);
    return [];
  }
}
