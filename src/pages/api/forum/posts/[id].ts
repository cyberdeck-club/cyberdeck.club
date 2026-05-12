import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { recordEdit } from "../../../../lib/edit-history";
import * as schema from "../../../../db/schema";
import { checkPublishingGate } from "../../../../lib/publishing-gate";
import { requireRole, ROLES } from "../../../../lib/roles";

/**
 * GET /api/forum/posts/[id]
 * Gets a single post by ID
 */
export const GET: APIRoute = async (ctx) => {
  const { id } = ctx.params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Post ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const postResult = await db
    .select({
      post: schema.forumPosts,
      authorName: schema.user.name,
    })
    .from(schema.forumPosts)
    .innerJoin(schema.user, eq(schema.forumPosts.authorId, schema.user.id))
    .where(eq(schema.forumPosts.id, id))
    .limit(1);

  if (postResult.length === 0) {
    return new Response(JSON.stringify({ error: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(postResult[0]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * PUT /api/forum/posts/[id]
 * Updates a post's content. 
 * Access: Post author (within 30-min window) OR Moderator/Admin (no time limit)
 */
export const PUT: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = ctx.params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Post ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check publishing gate
  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = (ctx.locals.user as { role: string }).role;
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Parse request body
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

  // Fetch the post to check ownership
  const postResult = await db
    .select()
    .from(schema.forumPosts)
    .where(eq(schema.forumPosts.id, id))
    .limit(1);

  if (postResult.length === 0) {
    return new Response(JSON.stringify({ error: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const post = postResult[0];
  const now = Math.floor(Date.now() / 1000);

  // Check access: Moderators and Admins can edit any post (uses >= comparison)
  const isModerator = requireRole(userRole, ROLES.MODERATOR);
  const isAuthor = post.authorId === userId;

  if (!isModerator && !isAuthor) {
    return new Response(JSON.stringify({ error: "You can only edit your own posts" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check 30-minute edit window for non-moderators
  if (!isModerator && isAuthor) {
    const postAgeMinutes = (now - post.createdAt) / 60;
    if (postAgeMinutes > 30) {
      return new Response(
        JSON.stringify({
          error: "edit_window_expired",
          message: "The 30-minute edit window has expired for this post",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Update the post
  try {
    await db
      .update(schema.forumPosts)
      .set({
        content: content.trim(),
        updatedAt: now,
      })
      .where(eq(schema.forumPosts.id, id));

    // Record edit history
    await recordEdit(db, {
      entityType: "forum_post",
      entityId: post.id,
      editorId: userId,
      changesSummary: "Post content updated",
    }).catch((err) => console.error("Failed to record edit history:", err));

    return new Response(
      JSON.stringify({ success: true, updatedAt: now }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to update post:", err);
    return new Response(JSON.stringify({ error: "Failed to update post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/forum/posts/[id]
 * Soft-deletes a post by setting deletedAt timestamp.
 * Access: Post author OR Moderator/Admin
 */
export const DELETE: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = ctx.params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Post ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = (ctx.locals.user as { role: string }).role;

  // Fetch the post to check ownership
  const postResult = await db
    .select()
    .from(schema.forumPosts)
    .where(eq(schema.forumPosts.id, id))
    .limit(1);

  if (postResult.length === 0) {
    return new Response(JSON.stringify({ error: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const post = postResult[0];

  // Already soft-deleted
  if (post.deletedAt) {
    return new Response(JSON.stringify({ error: "Post already deleted" }), {
      status: 410,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check access: Moderators and Admins can delete any post (uses >= comparison)
  const isModerator = requireRole(userRole, ROLES.MODERATOR);
  const isAuthor = post.authorId === userId;

  if (!isModerator && !isAuthor) {
    return new Response(JSON.stringify({ error: "You can only delete your own posts" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Perform soft delete
  const now = Math.floor(Date.now() / 1000);
  try {
    await db
      .update(schema.forumPosts)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.forumPosts.id, id));

    return new Response(
      JSON.stringify({ success: true, deletedAt: now }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to delete post:", err);
    return new Response(JSON.stringify({ error: "Failed to delete post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
