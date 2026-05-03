import type { APIRoute } from "astro";
import { eq, isNull, and } from "drizzle-orm";
import * as schema from "../../../../../db/schema";
import { checkPublishingGate } from "../../../../../lib/publishing-gate";

/**
 * GET /api/wiki/articles/[id]/comments
 * Fetch all comments for a wiki article by article ID.
 * Excludes soft-deleted comments (where deletedAt is not null).
 * Supports threaded replies via parentId.
 */
export const GET: APIRoute = async (ctx) => {
  const articleId = ctx.params.id;

  if (!articleId || typeof articleId !== "string") {
    return new Response(JSON.stringify({ error: "article ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db!;

  // Fetch all non-deleted comments for this article with author info
  const comments = await db
    .select({
      id: schema.wikiComments.id,
      content: schema.wikiComments.content,
      parentId: schema.wikiComments.parentId,
      createdAt: schema.wikiComments.createdAt,
      updatedAt: schema.wikiComments.updatedAt,
      authorId: schema.wikiComments.authorId,
      authorName: schema.user.name,
    })
    .from(schema.wikiComments)
    .innerJoin(schema.user, eq(schema.wikiComments.authorId, schema.user.id))
    .where(
      and(
        eq(schema.wikiComments.articleId, articleId),
        isNull(schema.wikiComments.deletedAt)
      )
    )
    .orderBy(schema.wikiComments.createdAt);

  return new Response(JSON.stringify({ comments }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * POST /api/wiki/articles/[id]/comments
 * Create a new comment on a wiki article.
 * Requires auth + publishing gate.
 */
export const POST: APIRoute = async (ctx) => {
  const articleId = ctx.params.id;

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!articleId || typeof articleId !== "string") {
    return new Response(JSON.stringify({ error: "article ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

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

  // Parse and validate request body
  let body: { content?: string; parentId?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, parentId } = body;

  // Validate required fields
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate parentId if provided (must exist and belong to same article)
  if (parentId) {
    const parentComment = await db
      .select({ id: schema.wikiComments.id, articleId: schema.wikiComments.articleId })
      .from(schema.wikiComments)
      .where(eq(schema.wikiComments.id, parentId))
      .limit(1);

    if (parentComment.length === 0) {
      return new Response(JSON.stringify({ error: "Parent comment not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (parentComment[0].articleId !== articleId) {
      return new Response(JSON.stringify({ error: "Parent comment does not belong to this article" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const commentId = crypto.randomUUID();

  try {
    await db.insert(schema.wikiComments).values({
      id: commentId,
      articleId,
      authorId: userId,
      content: content.trim(),
      parentId: parentId || null,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created comment with author info
    const createdComment = await db
      .select({
        id: schema.wikiComments.id,
        content: schema.wikiComments.content,
        parentId: schema.wikiComments.parentId,
        createdAt: schema.wikiComments.createdAt,
        updatedAt: schema.wikiComments.updatedAt,
        authorId: schema.wikiComments.authorId,
        authorName: schema.user.name,
      })
      .from(schema.wikiComments)
      .innerJoin(schema.user, eq(schema.wikiComments.authorId, schema.user.id))
      .where(eq(schema.wikiComments.id, commentId))
      .limit(1);

    return new Response(JSON.stringify({ comment: createdComment[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to create wiki comment:", err);
    return new Response(JSON.stringify({ error: "Failed to create comment" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;