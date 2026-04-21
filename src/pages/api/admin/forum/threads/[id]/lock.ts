import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../../../db/schema";

/**
 * PUT /api/admin/forum/threads/[id]/lock
 *
 * Locks or unlocks a forum thread.
 * Requires moderator or admin role.
 *
 * Body: { locked: boolean }
 */
export const PUT: APIRoute = async (ctx) => {
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

  // Get thread ID from URL params
  const threadId = ctx.params.id;
  if (!threadId || typeof threadId !== "string") {
    return new Response(JSON.stringify({ error: "Thread ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: { locked?: boolean };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { locked } = body;
  if (typeof locked !== "boolean") {
    return new Response(JSON.stringify({ error: "locked must be a boolean" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const now = Math.floor(Date.now() / 1000);

  // Check thread exists
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

  try {
    await db
      .update(schema.forumThreads)
      .set({
        isLocked: locked ? 1 : 0,
        updatedAt: now,
      })
      .where(eq(schema.forumThreads.id, threadId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to lock/unlock thread:", err);
    return new Response(JSON.stringify({ error: "Failed to update thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
