import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { checkPublishingGate } from "../../../../lib/publishing-gate";

/**
 * PUT /api/wiki/comments/[id]
 * Update a wiki comment's content.
 * - Author can edit within 30-minute window
 * - Moderator/Admin can edit anytime (bypass window)
 */
export const PUT: APIRoute = async (ctx) => {
  const commentId = ctx.params.id;

  if (!commentId || typeof commentId !== "string") {
    return new Response(JSON.stringify({ error: "comment id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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

  // Fetch the existing comment
  const comments = await db
    .select()
    .from(schema.wikiComments)
    .where(eq(schema.wikiComments.id, commentId))
    .limit(1);

  if (comments.length === 0) {
    return new Response(JSON.stringify({ error: "Comment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const comment = comments[0];

  // Check if user is author or moderator/admin
  const isAuthor = comment.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For non-moderators, check 30-minute edit window
  if (!isModeratorOrAdmin && comment.createdAt) {
    const now = Math.floor(Date.now() / 1000);
    const thirtyMinutesInSeconds = 30 * 60;
    const timeSinceCreation = now - comment.createdAt;

    if (timeSinceCreation > thirtyMinutesInSeconds) {
      return new Response(
        JSON.stringify({
          error: "Edit window expired",
          message: "Comments can only be edited within 30 minutes of posting",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Parse and validate request body
  let body: { content?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await db
      .update(schema.wikiComments)
      .set({
        content: content.trim(),
        updatedAt: now,
      })
      .where(eq(schema.wikiComments.id, commentId));

    // Fetch updated comment with author info
    const updatedComment = await db
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

    return new Response(JSON.stringify({ comment: updatedComment[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update wiki comment:", err);
    return new Response(JSON.stringify({ error: "Failed to update comment" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/wiki/comments/[id]
 * Soft-delete a wiki comment.
 * - Author can delete
 * - Moderator/Admin can delete anytime
 */
export const DELETE: APIRoute = async (ctx) => {
  const commentId = ctx.params.id;

  if (!commentId || typeof commentId !== "string") {
    return new Response(JSON.stringify({ error: "comment id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Fetch the existing comment
  const comments = await db
    .select()
    .from(schema.wikiComments)
    .where(eq(schema.wikiComments.id, commentId))
    .limit(1);

  if (comments.length === 0) {
    return new Response(JSON.stringify({ error: "Comment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const comment = comments[0];

  // Check if user is author or moderator/admin
  const isAuthor = comment.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await db
      .update(schema.wikiComments)
      .set({
        deletedAt: now,
      })
      .where(eq(schema.wikiComments.id, commentId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to delete wiki comment:", err);
    return new Response(JSON.stringify({ error: "Failed to delete comment" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;