import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../db/schema";

/**
 * POST /api/forum/threads
 *
 * Creates a new forum thread with its first post.
 * Requires authenticated user.
 *
 * Body: { categoryId: string, title: string, content: string }
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
  let body: { categoryId?: string; title?: string; content?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { categoryId, title, content } = body;

  // Validate required fields
  if (!categoryId || typeof categoryId !== "string") {
    return new Response(JSON.stringify({ error: "categoryId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: "title is required" }), {
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

  // Generate slugs for thread and first post
  const threadId = crypto.randomUUID();
  const postId = crypto.randomUUID();

  // Create slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

  try {
    // Use batch to create thread and first post atomically
    await db.batch([
      // Insert the new thread
      db.insert(schema.forumThreads).values({
        id: threadId,
        categoryId,
        authorId: userId,
        slug,
        title: title.trim(),
        isPinned: 0,
        isLocked: 0,
        postCount: 1,
        lastReplyAt: now,
        lastReplyUserId: userId,
        createdAt: now,
        updatedAt: now,
      }),
      // Insert the first post
      db.insert(schema.forumPosts).values({
        id: postId,
        threadId,
        authorId: userId,
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    // Return redirect to the new thread
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/forum/thread/${threadId}`,
      },
    });
  } catch (err) {
    console.error("Failed to create thread:", err);
    return new Response(JSON.stringify({ error: "Failed to create thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
