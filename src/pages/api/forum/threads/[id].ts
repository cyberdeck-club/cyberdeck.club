import type { APIRoute } from "astro";
import { eq, asc } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { recordEdit } from "../../../../lib/edit-history";
import { checkPublishingGate } from "../../../../lib/publishing-gate";

type UserWithRole = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: string;
  bio?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * PUT /api/forum/threads/[id]
 * Updates a forum thread's title.
 * Access: Thread author OR Moderator/Admin
 */
export const PUT: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threadId = ctx.params.id;
  if (!threadId) {
    return new Response(JSON.stringify({ error: "Thread ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = (ctx.locals.user as UserWithRole).role;

  // Check publishing gate (guidelines acceptance)
  const gateResult = await checkPublishingGate(db, userId);
  if (gateResult) {
    return gateResult;
  }

  // Parse request body
  let body: { title?: string; content?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, content } = body;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch the thread to check ownership
  const threadResult = await db
    .select()
    .from(schema.forumThreads)
    .where(eq(schema.forumThreads.id, threadId))
    .limit(1);

  if (threadResult.length === 0) {
    return new Response(JSON.stringify({ error: "Thread not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const thread = threadResult[0];

  // Check access: Moderators and Admins can edit any thread
  const isModerator = userRole === "moderator" || userRole === "admin";
  const isAuthor = thread.authorId === userId;

  if (!isModerator && !isAuthor) {
    return new Response(
      JSON.stringify({ error: "You can only edit your own threads" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Track changes for edit history
  const changes: string[] = [];
  if (title.trim() !== thread.title) {
    changes.push(`Title changed from "${thread.title}" to "${title.trim()}"`);
  }

  // Update the thread
  try {
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(schema.forumThreads)
      .set({
        title: title.trim(),
        updatedAt: now,
      })
      .where(eq(schema.forumThreads.id, threadId));

    // Also update the first post's content if provided
    if (content !== undefined) {
      // Find the first post in this thread (the thread body)
      const [firstPost] = await db
        .select()
        .from(schema.forumPosts)
        .where(eq(schema.forumPosts.threadId, threadId))
        .orderBy(asc(schema.forumPosts.createdAt))
        .limit(1);

      if (firstPost) {
        // Check authorization for content edit
        const isPostAuthor = firstPost.authorId === userId;
        const canEditContent = isPostAuthor || isModerator;

        if (canEditContent) {
          if (content !== firstPost.content) {
            changes.push("Content updated");
          }

          await db
            .update(schema.forumPosts)
            .set({
              content,
              updatedAt: now,
            })
            .where(eq(schema.forumPosts.id, firstPost.id));

          // Record edit history for the post too
          await recordEdit(db, {
            entityType: "forum_post",
            entityId: firstPost.id,
            editorId: userId,
            changesSummary: "Post content updated",
          }).catch(() => { });
        }
      }
    }

    // Record edit history
    await recordEdit(db, {
      entityType: "forum_thread",
      entityId: threadId,
      editorId: userId,
      changesSummary: changes.length > 0 ? changes.join("; ") : "Thread updated",
    });

    return new Response(
      JSON.stringify({ success: true, id: threadId, updatedAt: now }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to update thread:", err);
    return new Response(JSON.stringify({ error: "Failed to update thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
