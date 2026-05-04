/**
 * User profile MCP tools
 *
 * Tools for viewing and updating the authenticated user's profile.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CyberdeckClient, CyberdeckApiError } from "../client.js";
import type { McpToolResult } from "../types.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const UpdateMyProfileSchema = z.object({
  name: z.string().optional().describe("New display name"),
  bio: z.string().optional().describe("New bio (max 500 characters)"),
  image: z.string().optional().describe("New profile image URL"),
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

export function registerProfileTools(server: McpServer, client: CyberdeckClient): void {
  // get_my_profile — Get the authenticated user's profile
  server.tool(
    "get_my_profile",
    "Get the current user's profile information including display name, email, bio, role, and profile image.",
    {},
    async (): Promise<McpToolResult> => {
      try {
        const result = await client.getMyProfile();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "get_my_profile");
      }
    }
  );

  // update_my_profile — Update the authenticated user's profile
  server.tool(
    "update_my_profile",
    "Update the current user's profile. All fields are optional — only provided fields will be updated.",
    UpdateMyProfileSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.updateMyProfile({
          name: args.name,
          bio: args.bio,
          image: args.image,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "update_my_profile");
      }
    }
  );
}
