/**
 * Meetup-related MCP tools
 *
 * Tools for listing and creating meetup events.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CyberdeckClient, CyberdeckApiError } from "../client.js";
import type { McpToolResult } from "../types.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const ListMeetupsSchema = z.object({
  page: z.number().optional().describe("Page number (default: 1)"),
});

const CreateMeetupSchema = z.object({
  title: z.string().min(1).describe("Meetup title"),
  slug: z.string().optional().describe("URL-friendly slug (auto-generated if not provided)"),
  description: z.string().optional().describe("Short description of the meetup"),
  content: z.string().optional().describe("Full meetup details in Markdown"),
  location: z.string().optional().describe("Physical or virtual location"),
  startsAt: z.number().optional().describe("Start time as Unix timestamp"),
  endsAt: z.number().optional().describe("End time as Unix timestamp"),
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

export function registerMeetupTools(server: McpServer, client: CyberdeckClient): void {
  // list_meetups — List meetup events
  server.tool(
    "list_meetups",
    "List meetup events. Returns upcoming meetups with pagination.",
    ListMeetupsSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listMeetups({ page: args.page });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_meetups");
      }
    }
  );

  // create_meetup — Create a new meetup event
  server.tool(
    "create_meetup",
    "Create a new meetup event. Requires TRUSTED_MAKER role or higher.",
    CreateMeetupSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.createMeetup({
          title: args.title,
          slug: args.slug,
          description: args.description,
          content: args.content,
          location: args.location,
          startsAt: args.startsAt,
          endsAt: args.endsAt,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "create_meetup");
      }
    }
  );
}
