/**
 * Build-related MCP tools
 *
 * Tools for listing, viewing, creating, and updating cyberdeck builds.
 * Also includes build comments.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CyberdeckClient, CyberdeckApiError } from "../client.js";
import type { McpToolResult } from "../types.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const ListBuildsSchema = z.object({
  page: z.number().optional().describe("Page number (default: 1)"),
  status: z.string().optional().describe("Filter by build status (e.g., 'published')"),
  category: z.string().optional().describe("Filter by category slug"),
});

const GetBuildSchema = z.object({
  slug: z.string().describe("The build slug"),
});

const CreateBuildSchema = z.object({
  title: z.string().min(3).describe("Build title (minimum 3 characters)"),
  description: z.string().optional().describe("Short description of the build"),
  content: z.string().optional().describe("Full build content in Markdown format"),
  imageUrl: z.string().url().optional().describe("Hero image URL"),
});

const UpdateBuildSchema = z.object({
  slug: z.string().describe("The build slug to update"),
  title: z.string().optional().describe("New build title"),
  description: z.string().optional().describe("New description"),
  content: z.string().optional().describe("New content in Markdown format"),
  imageUrl: z.string().url().optional().describe("New hero image URL"),
});

const ListBuildCommentsSchema = z.object({
  slug: z.string().describe("The build slug"),
});

const AddBuildCommentSchema = z.object({
  slug: z.string().describe("The build slug"),
  content: z.string().min(1).describe("Comment content"),
});

// ---------------------------------------------------------------------------
// Error handler helper
// ---------------------------------------------------------------------------

function handleApiError(err: unknown, context: string): McpToolResult {
  if (err instanceof CyberdeckApiError) {
    if (err.status === 401) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Authentication failed: ${err.message}. Your token may be expired or revoked. Create a new token at https://cyberdeck.club/settings`,
          },
        ],
        isError: true,
      };
    }
    if (err.status === 403) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Permission denied: ${err.message}. Check your token scopes and user role for ${context}.`,
          },
        ],
        isError: true,
      };
    }
    if (err.status === 404) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Not found: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `API error (${err.status}) on ${err.path}: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      },
    ],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Register tools
// ---------------------------------------------------------------------------

export function registerBuildTools(server: McpServer, client: CyberdeckClient): void {
  // list_builds — List published cyberdeck builds with optional filters
  server.tool(
    "list_builds",
    "List cyberdeck builds. Returns published builds with pagination. Use status='published' to see all public builds, or filter by category slug.",
    ListBuildsSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listBuilds({
          page: args.page,
          status: args.status,
          category: args.category,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_builds");
      }
    }
  );

  // get_build — Get details of a specific cyberdeck build by slug
  server.tool(
    "get_build",
    "Get details of a specific cyberdeck build by its slug. Returns full build information including content, author, and status.",
    GetBuildSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.getBuild(args.slug);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "get_build");
      }
    }
  );

  // create_build — Create a new cyberdeck build
  server.tool(
    "create_build",
    "Create a new cyberdeck build. The build will be published immediately if you have MAKER role or higher, or enter moderation review if you have MEMBER role.",
    CreateBuildSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.createBuild({
          title: args.title,
          description: args.description,
          content: args.content,
          imageUrl: args.imageUrl,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "create_build");
      }
    }
  );

  // update_build — Update an existing cyberdeck build
  server.tool(
    "update_build",
    "Update an existing cyberdeck build. You must be the build author or a moderator/admin to edit.",
    UpdateBuildSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.updateBuild(args.slug, {
          title: args.title,
          description: args.description,
          content: args.content,
          imageUrl: args.imageUrl,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "update_build");
      }
    }
  );

  // list_build_comments — List comments on a build
  server.tool(
    "list_build_comments",
    "List all comments on a specific cyberdeck build.",
    ListBuildCommentsSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listBuildComments(args.slug);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_build_comments");
      }
    }
  );

  // add_build_comment — Add a comment to a build
  server.tool(
    "add_build_comment",
    "Add a comment to a cyberdeck build. Requires authentication.",
    AddBuildCommentSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.addBuildComment(args.slug, { content: args.content });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "add_build_comment");
      }
    }
  );
}
