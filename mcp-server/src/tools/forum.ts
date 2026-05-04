/**
 * Forum-related MCP tools
 *
 * Tools for listing, viewing, creating forum threads and posts.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CyberdeckClient, CyberdeckApiError } from "../client.js";
import type { McpToolResult } from "../types.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const ListForumThreadsSchema = z.object({
  category: z.string().optional().describe("Filter by category ID"),
  page: z.number().optional().describe("Page number (default: 1)"),
});

const GetForumThreadSchema = z.object({
  id: z.string().describe("The forum thread ID"),
});

const CreateForumThreadSchema = z.object({
  categoryId: z.string().describe("The category ID to create the thread in"),
  title: z.string().min(1).describe("Thread title"),
  content: z.string().min(1).describe("First post content in Markdown"),
});

const ListForumPostsSchema = z.object({
  threadId: z.string().describe("The forum thread ID"),
  page: z.number().optional().describe("Page number (default: 1)"),
});

const CreateForumPostSchema = z.object({
  threadId: z.string().describe("The forum thread ID to reply to"),
  content: z.string().min(1).describe("Reply content in Markdown"),
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

export function registerForumTools(server: McpServer, client: CyberdeckClient): void {
  // list_forum_threads — List forum threads with optional category filter
  server.tool(
    "list_forum_threads",
    "List forum threads. Returns threads with pagination. Filter by category ID to narrow results to a specific forum category.",
    ListForumThreadsSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listForumThreads({
          category: args.category,
          page: args.page,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_forum_threads");
      }
    }
  );

  // get_forum_thread — Get a specific forum thread by ID
  server.tool(
    "get_forum_thread",
    "Get a specific forum thread by its ID. Returns thread information.",
    GetForumThreadSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.getForumThread(args.id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "get_forum_thread");
      }
    }
  );

  // create_forum_thread — Create a new forum thread
  server.tool(
    "create_forum_thread",
    "Create a new forum thread with its first post. Requires MAKER role or higher.",
    CreateForumThreadSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.createForumThread({
          categoryId: args.categoryId,
          title: args.title,
          content: args.content,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "create_forum_thread");
      }
    }
  );

  // list_forum_posts — List posts in a forum thread
  server.tool(
    "list_forum_posts",
    "List all posts in a specific forum thread. Returns posts with pagination ordered by creation time.",
    ListForumPostsSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listForumPosts({
          threadId: args.threadId,
          page: args.page,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_forum_posts");
      }
    }
  );

  // create_forum_post — Post a reply to a forum thread
  server.tool(
    "create_forum_post",
    "Post a reply to an existing forum thread. Requires MAKER role or higher. Cannot reply to locked threads.",
    CreateForumPostSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.createForumPost({
          threadId: args.threadId,
          content: args.content,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "create_forum_post");
      }
    }
  );
}
