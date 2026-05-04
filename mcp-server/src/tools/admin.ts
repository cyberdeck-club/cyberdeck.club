/**
 * Admin MCP tools
 *
 * Tools for administrative operations like managing tokens, viewing usage logs,
 * listing users, and updating user roles.
 *
 * All tools in this file require ADMIN role.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CyberdeckClient, CyberdeckApiError } from "../client.js";
import type { McpToolResult } from "../types.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const ListAllTokensSchema = z.object({
  page: z.number().optional().describe("Page number (default: 1)"),
  pageSize: z.number().optional().describe("Results per page (default: 50, max: 100)"),
  userId: z.string().optional().describe("Filter by user ID"),
});

const ListTokenLogsSchema = z.object({
  page: z.number().optional().describe("Page number (default: 1)"),
  limit: z.number().optional().describe("Results per page (default: 50, max: 100)"),
  userId: z.string().optional().describe("Filter by user ID"),
  tokenId: z.string().optional().describe("Filter by token ID"),
});

const ListUsersSchema = z.object({
  page: z.number().optional().describe("Page number (default: 1)"),
  limit: z.number().optional().describe("Results per page (default: 50)"),
});

const UpdateUserRoleSchema = z.object({
  userId: z.string().describe("The user ID to update"),
  role: z.enum(["member", "maker", "trusted_maker", "moderator", "admin"]).describe("New role for the user"),
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
            text: `Permission denied: ${err.message}. Check your token scopes and user role for ${context}. Requires ADMIN role.`,
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

export function registerAdminTools(server: McpServer, client: CyberdeckClient): void {
  // list_all_tokens — List all tokens across all users (admin only)
  server.tool(
    "list_all_tokens",
    "List all personal access tokens across all users. Includes revoked tokens. Requires ADMIN role.",
    ListAllTokensSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listAllTokens({
          page: args.page,
          pageSize: args.pageSize,
          userId: args.userId,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_all_tokens");
      }
    }
  );

  // list_token_logs — List token usage logs (admin only)
  server.tool(
    "list_token_logs",
    "List API usage logs for personal access tokens. Filter by userId or tokenId. Requires ADMIN role.",
    ListTokenLogsSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listTokenLogs({
          page: args.page,
          limit: args.limit,
          userId: args.userId,
          tokenId: args.tokenId,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_token_logs");
      }
    }
  );

  // list_users — List all users (admin only)
  server.tool(
    "list_users",
    "List all users in the system with pagination. Requires ADMIN role.",
    ListUsersSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listUsers({
          page: args.page,
          limit: args.limit,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_users");
      }
    }
  );

  // update_user_role — Update a user's role (admin only)
  server.tool(
    "update_user_role",
    "Update a user's role. Valid roles: member, maker, trusted_maker, moderator, admin. Requires ADMIN role. Cannot change your own role.",
    UpdateUserRoleSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.updateUserRole(args.userId, { role: args.role });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "update_user_role");
      }
    }
  );
}
