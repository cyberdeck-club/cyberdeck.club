import type { APIRoute } from "astro";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "../../../db/schema";
import { checkPublishingGate } from "../../../lib/publishing-gate";

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

  // Check publishing gate (guidelines acceptance)
  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
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

/**
 * GET /api/forum/threads
 *
 * Lists forum threads with optional filters, or gets a single thread by ID.
 * Public endpoint - no authentication required.
 *
 * Query params:
 *   - id: string (optional) - Get a single thread by ID
 *   - category: string (optional) - Filter by category slug
 *   - page: number (default 1) - Page number for pagination
 *   - limit: number (default 20, max 100) - Results per page
 */
export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db;
  const url = new URL(ctx.request.url);

  // Check for single thread lookup by ID
  const threadId = url.searchParams.get("id");
  if (threadId) {
    const result = await db
      .select({
        thread: schema.forumThreads,
        authorName: schema.user.name,
        authorId: schema.forumThreads.authorId,
        categoryName: schema.forumCategories.name,
        categorySlug: schema.forumCategories.slug,
      })
      .from(schema.forumThreads)
      .innerJoin(
        schema.forumCategories,
        eq(schema.forumThreads.categoryId, schema.forumCategories.id)
      )
      .innerJoin(schema.user, eq(schema.forumThreads.authorId, schema.user.id))
      .where(eq(schema.forumThreads.id, threadId))
      .limit(1);

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const row = result[0];
    return new Response(
      JSON.stringify({
        thread: {
          id: row.thread.id,
          categoryId: row.thread.categoryId,
          authorId: row.thread.authorId,
          authorName: row.authorName,
          slug: row.thread.slug,
          title: row.thread.title,
          isPinned: row.thread.isPinned,
          isLocked: row.thread.isLocked,
          postCount: row.thread.postCount,
          lastReplyAt: row.thread.lastReplyAt,
          lastReplyUserId: row.thread.lastReplyUserId,
          createdAt: row.thread.createdAt,
          updatedAt: row.thread.updatedAt,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse pagination params
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;
  const categorySlug = url.searchParams.get("category");

  // Build conditions array
  const conditions = categorySlug
    ? eq(schema.forumCategories.slug, categorySlug)
    : undefined;

  const results = await db
    .select({
      thread: schema.forumThreads,
      authorName: schema.user.name,
      categoryName: schema.forumCategories.name,
    })
    .from(schema.forumThreads)
    .innerJoin(
      schema.forumCategories,
      eq(schema.forumThreads.categoryId, schema.forumCategories.id)
    )
    .innerJoin(schema.user, eq(schema.forumThreads.authorId, schema.user.id))
    .where(conditions)
    .orderBy(desc(schema.forumThreads.isPinned), desc(schema.forumThreads.lastReplyAt))
    .limit(limit)
    .offset(offset);

  const threads = results.map((row) => ({
    id: row.thread.id,
    categoryId: row.thread.categoryId,
    authorId: row.thread.authorId,
    authorName: row.authorName,
    slug: row.thread.slug,
    title: row.thread.title,
    isPinned: row.thread.isPinned,
    isLocked: row.thread.isLocked,
    postCount: row.thread.postCount,
    lastReplyAt: row.thread.lastReplyAt,
    lastReplyUserId: row.thread.lastReplyUserId,
    createdAt: row.thread.createdAt,
    updatedAt: row.thread.updatedAt,
  }));

  return new Response(
    JSON.stringify({
      threads,
      total: threads.length,
      page,
      pageSize: limit,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const prerender = false;
