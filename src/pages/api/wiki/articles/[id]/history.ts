import type { APIRoute } from "astro";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../../../../db/schema";
import { ROLES, requireRole } from "../../../../../lib/roles";

/**
 * GET /api/wiki/articles/[id]/history
 *
 * Returns revision history for a wiki article.
 * Requires MEMBER role (logged-in users can view history).
 * Returns all revisions for the article, newest first.
 * Includes: revision ID, author name, createdAt, diffSummary
 */
export const GET: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userRole = ctx.locals.user.role;

  // Require MEMBER role minimum
  if (!requireRole(userRole, ROLES.MEMBER)) {
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

  // Verify article exists
  const articles = await db
    .select({ id: schema.wikiArticles.id })
    .from(schema.wikiArticles)
    .where(eq(schema.wikiArticles.id, articleId))
    .limit(1);

  if (articles.length === 0) {
    return new Response(JSON.stringify({ error: "Article not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch all revisions for this article, newest first
  const revisions = await db
    .select({
      revisionId: schema.wikiRevisions.id,
      content: schema.wikiRevisions.content,
      title: schema.wikiRevisions.title,
      diffSummary: schema.wikiRevisions.diffSummary,
      createdAt: schema.wikiRevisions.createdAt,
      authorId: schema.wikiRevisions.authorId,
      authorName: schema.user.name,
    })
    .from(schema.wikiRevisions)
    .leftJoin(schema.user, eq(schema.wikiRevisions.authorId, schema.user.id))
    .where(eq(schema.wikiRevisions.articleId, articleId))
    .orderBy(desc(schema.wikiRevisions.createdAt));

  return new Response(JSON.stringify({ revisions }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
