import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { checkPublishingGate } from "../../../../lib/publishing-gate";
import { ROLES, requireRole, getRoleLevel } from "../../../../lib/roles";

/**
 * PUT /api/wiki/articles/[id]
 *
 * Updates a wiki article by creating a new revision.
 * Requires MAKER role minimum. Must be author or moderator/admin.
 *
 * Body: { content: string, editSummary?: string }
 */
export const PUT: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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
  const userRole = ctx.locals.user.role;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Require MAKER role minimum
  if (!requireRole(userRole, ROLES.MAKER)) {
    return new Response(
      JSON.stringify({
        error: "insufficient_permissions",
        message: "Only makers, moderators, and admins can edit wiki articles",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse and validate request body
  let body: { content?: string; editSummary?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, editSummary } = body;

  // Validate required fields
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  // Fetch the article to check ownership
  const articles = await db
    .select({
      id: schema.wikiArticles.id,
      authorId: schema.wikiArticles.authorId,
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

  // Check if user is author or moderator/admin
  const isAuthor = article.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(
      JSON.stringify({
        error: "You do not have permission to edit this article",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check if this maker is newly promoted (within 30 days) for soft review flagging
  // We flag edits by makers who became makers less than 30 days ago
  let needsReview = false;
  if (userRole === "maker") {
    const userResult = await db
      .select({
        firstBuildPublishedAt: schema.user.firstBuildPublishedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (userResult.length > 0 && userResult[0].firstBuildPublishedAt) {
      const firstPublished = new Date(userResult[0].firstBuildPublishedAt).getTime();
      const nowMs = Date.now();
      const daysSinceFirstBuild = (nowMs - firstPublished) / (1000 * 60 * 60 * 24);
      // Flag for review if maker for less than 30 days
      needsReview = daysSinceFirstBuild < 30;
    }
  }

  const revisionId = crypto.randomUUID();

  try {
    // Use batch to create revision and update article in one operation
    await db.batch([
      // Insert new revision with diff summary
      db.insert(schema.wikiRevisions).values({
        id: revisionId,
        articleId,
        content: content.trim(),
        title: article.title, // Keep title from article
        authorId: userId,
        diffSummary: editSummary || null,
        createdAt: now,
      }),
      // Update article with new content and timestamp
      db
        .update(schema.wikiArticles)
        .set({
          content: content.trim(),
          updatedAt: now,
        })
        .where(eq(schema.wikiArticles.id, articleId)),
    ]);

    // Return success with revision ID and review flag info
    return new Response(
      JSON.stringify({
        success: true,
        revisionId,
        needsReview
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to update article:", err);
    return new Response(
      JSON.stringify({ error: "Failed to update article" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
