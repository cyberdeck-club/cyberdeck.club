import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../db/schema";

/**
 * POST /api/forum/posts
 *
 * Creates a reply to an existing forum thread.
 * Requires authenticated user.
 *
 * Body: { threadId: string, content: string }
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: { threadId?: string; content?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { threadId, content } = body;

  // Validate required fields
  if (!threadId || typeof threadId !== "string") {
    return new Response(JSON.stringify({ error: "threadId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const now = Math.floor(Date.now() / 1000);

  // Verify thread exists
  const threads = await db
    .select({ id: schema.forumThreads.id })
    .from(schema.forumThreads)
    .where(eq(schema.forumThreads.id, threadId))
    .limit(1);

  if (threads.length === 0) {
    return new Response(JSON.stringify({ error: "Thread not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if thread is locked
  const thread = threads[0];
  const threadData = await db
    .select({ isLocked: schema.forumThreads.isLocked })
    .from(schema.forumThreads)
    .where(eq(schema.forumThreads.id, threadId))
    .limit(1);

  if (threadData[0]?.isLocked === 1) {
    return new Response(JSON.stringify({ error: "Thread is locked" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const postId = crypto.randomUUID();

  try {
    // Use batch to create post and update thread in one operation
    await db.batch([
      // Insert the new post
      db.insert(schema.forumPosts).values({
        id: postId,
        threadId,
        authorId: userId,
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
      }),
      // Update thread's last_reply info and increment post count
      db
        .update(schema.forumThreads)
        .set({
          lastReplyAt: now,
          lastReplyUserId: userId,
          updatedAt: now,
        })
        .where(eq(schema.forumThreads.id, threadId)),
    ]);

    // Return success with post ID
    return new Response(
      JSON.stringify({ success: true, postId }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to create post:", err);
    return new Response(JSON.stringify({ error: "Failed to create post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
