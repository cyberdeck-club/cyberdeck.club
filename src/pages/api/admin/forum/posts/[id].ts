import type { APIRoute } from "astro";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../../../../db/schema";

/**
 * DELETE /api/admin/forum/posts/[id]
 *
 * Deletes a forum post and updates the thread's reply count.
 * Requires moderator or admin role.
 */
export const DELETE: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require moderator or admin role
  const userRole = (ctx.locals.user as any).role;
  if (userRole !== "moderator" && userRole !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get post ID from URL params
  const postId = ctx.params.id;
  if (!postId || typeof postId !== "string") {
    return new Response(JSON.stringify({ error: "Post ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  // Fetch the post to get its threadId
  const posts = await db
    .select({
      id: schema.forumPosts.id,
      threadId: schema.forumPosts.threadId,
    })
    .from(schema.forumPosts)
    .where(eq(schema.forumPosts.id, postId))
    .limit(1);

  if (posts.length === 0) {
    return new Response(JSON.stringify({ error: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const post = posts[0];
  const now = Math.floor(Date.now() / 1000);

  try {
    // Use batch to delete post and decrement thread post count atomically
    await db.batch([
      // Delete the post
      db.delete(schema.forumPosts).where(eq(schema.forumPosts.id, postId)),
      // Decrement the thread's post count
      db
        .update(schema.forumThreads)
        .set({
          postCount: sql`max(post_count - 1, 0)`,
          updatedAt: now,
        })
        .where(eq(schema.forumThreads.id, post.threadId)),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to delete post:", err);
    return new Response(JSON.stringify({ error: "Failed to delete post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
