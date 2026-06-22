import type { APIRoute } from "astro";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "@/db/schema";
import { requireAuth } from "@/lib/require-auth";
import { ROLES } from "@/lib/roles";
import { sendAnnouncementEmailBlast } from "@/lib/announcement-emails";

/**
 * GET /api/admin/announcements/[id]
 *
 * Gets a single announcement by ID (excluding soft-deleted).
 * Requires ADMIN role.
 */
export const GET: APIRoute = async (ctx) => {
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const id = ctx.params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  try {
    const results = await db
      .select()
      .from(schema.announcements)
      .where(
        and(
          eq(schema.announcements.id, id),
          isNull(schema.announcements.deletedAt)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "Announcement not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to fetch announcement:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch announcement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PUT /api/admin/announcements/[id]
 *
 * Updates an announcement.
 * Requires ADMIN role.
 *
 * Body (all optional): { title?: string, content?: string, isPublished?: boolean, publishedAt?: number }
 */
export const PUT: APIRoute = async (ctx) => {
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const id = ctx.params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  // Parse request body
  let body: {
    title?: string;
    content?: string;
    isPublished?: boolean;
    publishedAt?: number;
  };

  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if announcement exists and is not soft-deleted
  const existing = await db
    .select()
    .from(schema.announcements)
    .where(
      and(
        eq(schema.announcements.id, id),
        isNull(schema.announcements.deletedAt)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: "Announcement not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const announcement = existing[0];

  // Detect draft → published transition (for email blast)
  const isNewlyPublished =
    !announcement.isPublished && body.isPublished === true;

  // Build update object
  const updateData: Record<string, unknown> = { updatedAt: now };

  if (body.title !== undefined) {
    updateData.title = body.title;
  }

  if (body.content !== undefined) {
    updateData.content = body.content;
  }

  if (body.isPublished !== undefined) {
    updateData.isPublished = body.isPublished;
    // If publishing and no publishedAt set, set it now
    if (body.isPublished && !announcement.publishedAt && body.publishedAt === undefined) {
      updateData.publishedAt = now;
    }
  }

  if (body.publishedAt !== undefined) {
    updateData.publishedAt = body.publishedAt;
  }

  try {
    await db
      .update(schema.announcements)
      .set(updateData)
      .where(eq(schema.announcements.id, id));

    const updated = await db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .limit(1);

    // Fire email blast on draft → published transition (fire-and-forget)
    if (isNewlyPublished && updated[0]) {
      sendAnnouncementEmailBlast({
        db,
        announcementTitle: updated[0].title,
        announcementContent: updated[0].content,
        announcementId: id,
      }).catch((err) => {
        console.error("[announcements] Email blast failed (update):", err);
      });
    }

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update announcement:", err);
    return new Response(JSON.stringify({ error: "Failed to update announcement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/admin/announcements/[id]
 *
 * Soft-deletes an announcement by setting deletedAt.
 * Requires ADMIN role.
 */
export const DELETE: APIRoute = async (ctx) => {
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const id = ctx.params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  // Check if announcement exists and is not already soft-deleted
  const existing = await db
    .select()
    .from(schema.announcements)
    .where(
      and(
        eq(schema.announcements.id, id),
        isNull(schema.announcements.deletedAt)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: "Announcement not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await db
      .update(schema.announcements)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(schema.announcements.id, id));

    return new Response(null, {
      status: 204,
    });
  } catch (err) {
    console.error("Failed to delete announcement:", err);
    return new Response(JSON.stringify({ error: "Failed to delete announcement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;