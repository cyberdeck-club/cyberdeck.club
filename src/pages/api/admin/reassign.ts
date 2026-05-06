import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import {
  builds,
  forumThreads,
  forumPosts,
  wikiArticles,
  wikiRevisions,
  wikiComments,
  buildComments,
  meetups,
  staticPages,
  user,
} from "../../../db/schema";
import { ROLES } from "../../../lib/roles";
import { requireAuth } from "../../../lib/require-auth";

/**
 * PUT /api/admin/reassign
 *
 * Reassigns authorship of content from one user to another.
 * Requires admin role.
 *
 * Body: { table: string, recordId: string, newAuthorId: string }
 */

// Table configuration: maps table name to Drizzle table object and column references
const TABLE_CONFIG = {
  builds: { table: builds, authorColumn: builds.authorId, idColumn: builds.id },
  forumThreads: {
    table: forumThreads,
    authorColumn: forumThreads.authorId,
    idColumn: forumThreads.id,
  },
  forumPosts: {
    table: forumPosts,
    authorColumn: forumPosts.authorId,
    idColumn: forumPosts.id,
  },
  wikiArticles: {
    table: wikiArticles,
    authorColumn: wikiArticles.authorId,
    idColumn: wikiArticles.id,
  },
  wikiRevisions: {
    table: wikiRevisions,
    authorColumn: wikiRevisions.authorId,
    idColumn: wikiRevisions.id,
  },
  wikiComments: {
    table: wikiComments,
    authorColumn: wikiComments.authorId,
    idColumn: wikiComments.id,
  },
  buildComments: {
    table: buildComments,
    authorColumn: buildComments.authorId,
    idColumn: buildComments.id,
  },
  meetups: {
    table: meetups,
    authorColumn: meetups.organizerId,
    idColumn: meetups.id,
  },
  staticPages: {
    table: staticPages,
    authorColumn: staticPages.authorId,
    idColumn: staticPages.id,
  },
} as const;

type TableName = keyof typeof TABLE_CONFIG;

export const PUT: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  // Parse request body
  let body: { table?: string; recordId?: string; newAuthorId?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { table, recordId, newAuthorId } = body;

  // Validate required fields
  if (!table || typeof table !== "string" || table.trim() === "") {
    return new Response(
      JSON.stringify({ error: "table is required and must be a non-empty string" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!recordId || typeof recordId !== "string" || recordId.trim() === "") {
    return new Response(
      JSON.stringify({ error: "recordId is required and must be a non-empty string" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!newAuthorId || typeof newAuthorId !== "string" || newAuthorId.trim() === "") {
    return new Response(
      JSON.stringify({ error: "newAuthorId is required and must be a non-empty string" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate table name is in allowed list
  if (!(table in TABLE_CONFIG)) {
    const validTables = Object.keys(TABLE_CONFIG).join(", ");
    return new Response(
      JSON.stringify({ error: `Invalid table. Must be one of: ${validTables}` }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const db = ctx.locals.db;
  const config = TABLE_CONFIG[table as TableName];

  // Validate new author exists
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, newAuthorId))
    .limit(1);

  if (!existingUser) {
    return new Response(JSON.stringify({ error: "New author not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate record exists
  const [existingRecord] = await db
    .select({ id: config.idColumn })
    .from(config.table)
    .where(eq(config.idColumn, recordId))
    .limit(1);

  if (!existingRecord) {
    return new Response(JSON.stringify({ error: "Record not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Perform the update
  try {
    await db
      .update(config.table)
      .set({ [config.authorColumn.name]: newAuthorId })
      .where(eq(config.idColumn, recordId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to reassign authorship:", err);
    return new Response(JSON.stringify({ error: "Failed to reassign authorship" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};