import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../../db/schema";
import { ROLES, requireRole } from "../../../../../lib/roles";

/**
 * POST /api/wiki/articles/[id]/revert
 *
 * Allows moderators to revert to a previous revision.
 * Requires MODERATOR role (40).
 *
 * Body: { revisionId: string }
 *
 * Steps:
 * 1. Fetch the target revision
 * 2. Verify it belongs to this article
 * 3. Create a NEW revision with the old content (append-only)
 * 4. Update the wiki article with the reverted content
 * 5. Return the new revision
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userRole = ctx.locals.user.role;

  // Require MODERATOR role minimum
  if (!requireRole(userRole, ROLES.MODERATOR)) {
    return new Response(
      JSON.stringify({ error: "Insufficient permissions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get article ID from URL params
  const articleId = ctx.params.id;
  if (!articleId || typeof articleId !== "string") {
    return new Response(JSON.stringify({ error: "Article ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;

  // Parse and validate request body
  let body: { revisionId?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { revisionId } = body;

  if (!revisionId || typeof revisionId !== "string") {
    return new Response(JSON.stringify({ error: "revisionId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch the target revision
  const revisions = await db
    .select({
      id: schema.wikiRevisions.id,
      articleId: schema.wikiRevisions.articleId,
      content: schema.wikiRevisions.content,
      title: schema.wikiRevisions.title,
      createdAt: schema.wikiRevisions.createdAt,
    })
    .from(schema.wikiRevisions)
    .where(eq(schema.wikiRevisions.id, revisionId))
    .limit(1);

  if (revisions.length === 0) {
    return new Response(JSON.stringify({ error: "Revision not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const targetRevision = revisions[0];

  // Verify it belongs to this article
  if (targetRevision.articleId !== articleId) {
    return new Response(
      JSON.stringify({ error: "Revision does not belong to this article" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Fetch the article to get current title
  const articles = await db
    .select({
      id: schema.wikiArticles.id,
      title: schema.wikiArticles.title,
    })
    .from(schema.wikiArticles)
    .where(eq(schema.wikiArticles.id, articleId))
    .limit(1);

  if (articles.length === 0) {
    return new Response(JSON.stringify({ error: "Article not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const article = articles[0];
  const now = Math.floor(Date.now() / 1000);

  // Format the revert date for the diff summary
  const revertDate = new Date(targetRevision.createdAt * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Create a new revision with the old content (append-only)
  const newRevisionId = crypto.randomUUID();

  try {
    await db.batch([
      // Insert new revision with reverted content
      db.insert(schema.wikiRevisions).values({
        id: newRevisionId,
        articleId,
        content: targetRevision.content,
        title: article.title,
        authorId: userId,
        diffSummary: `Reverted to revision from ${revertDate}`,
        createdAt: now,
      }),
      // Update article with reverted content
      db
        .update(schema.wikiArticles)
        .set({
          content: targetRevision.content,
          updatedAt: now,
        })
        .where(eq(schema.wikiArticles.id, articleId)),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        revisionId: newRevisionId,
        revertedFrom: revisionId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to revert article:", err);
    return new Response(
      JSON.stringify({ error: "Failed to revert article" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
