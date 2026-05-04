/**
 * Wiki-related MCP tools
 *
 * Tools for listing, viewing, creating, and editing wiki articles.
 * Also includes article history for viewing revisions.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CyberdeckClient, CyberdeckApiError } from "../client.js";
import type { McpToolResult } from "../types.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const ListWikiArticlesSchema = z.object({
  category: z.string().optional().describe("Filter by category ID"),
  page: z.number().optional().describe("Page number (default: 1)"),
});

const GetWikiArticleSchema = z.object({
  id: z.string().describe("The wiki article ID"),
});

const CreateWikiArticleSchema = z.object({
  categoryId: z.string().describe("The category ID to create the article in"),
  title: z.string().min(1).describe("Article title"),
  slug: z.string().min(1).describe("URL-friendly slug for the article"),
  content: z.string().min(1).describe("Article content in Markdown"),
});

const UpdateWikiArticleSchema = z.object({
  id: z.string().describe("The wiki article ID to update"),
  content: z.string().min(1).describe("New article content in Markdown"),
  editSummary: z.string().optional().describe("Brief description of what changed"),
});

const GetWikiArticleHistorySchema = z.object({
  id: z.string().describe("The wiki article ID"),
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

export function registerWikiTools(server: McpServer, client: CyberdeckClient): void {
  // list_wiki_articles — List wiki articles with optional category filter
  server.tool(
    "list_wiki_articles",
    "List wiki articles. Returns published articles with pagination. Filter by category ID to narrow results.",
    ListWikiArticlesSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.listWikiArticles({
          category: args.category,
          page: args.page,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "list_wiki_articles");
      }
    }
  );

  // get_wiki_article — Get a specific wiki article by ID
  server.tool(
    "get_wiki_article",
    "Get a specific wiki article by its ID. Returns full article content and metadata.",
    GetWikiArticleSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.getWikiArticle(args.id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "get_wiki_article");
      }
    }
  );

  // create_wiki_article — Create a new wiki article
  server.tool(
    "create_wiki_article",
    "Create a new wiki article. Requires MAKER role or higher. The article is published immediately.",
    CreateWikiArticleSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.createWikiArticle({
          categoryId: args.categoryId,
          title: args.title,
          slug: args.slug,
          content: args.content,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "create_wiki_article");
      }
    }
  );

  // update_wiki_article — Update an existing wiki article
  server.tool(
    "update_wiki_article",
    "Update an existing wiki article by creating a new revision. Requires MAKER role or higher. You must be the article author or a moderator/admin.",
    UpdateWikiArticleSchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.updateWikiArticle(args.id, {
          content: args.content,
          editSummary: args.editSummary,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "update_wiki_article");
      }
    }
  );

  // get_wiki_article_history — Get revision history for a wiki article
  server.tool(
    "get_wiki_article_history",
    "Get the revision history of a wiki article. Shows all past versions with author and timestamp information.",
    GetWikiArticleHistorySchema.shape,
    async (args): Promise<McpToolResult> => {
      try {
        const result = await client.getWikiArticleHistory(args.id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return handleApiError(err, "get_wiki_article_history");
      }
    }
  );
}
