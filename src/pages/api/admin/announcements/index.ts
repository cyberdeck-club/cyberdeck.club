import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { requireAuth } from "@/lib/require-auth";
import { ROLES } from "@/lib/roles";
import { sendAnnouncementEmailBlast } from "@/lib/announcement-emails";

/**
 * GET /api/admin/announcements
 *
 * Lists all announcements (including unpublished), excluding soft-deleted.
 * Requires ADMIN role.
 */
export const GET: APIRoute = async (ctx) => {
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = ctx.locals.db;

  try {
    const announcements = await db
      .select()
      .from(schema.announcements)
      .orderBy(desc(schema.announcements.createdAt));

    return new Response(JSON.stringify(announcements), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch announcements" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/admin/announcements
 *
 * Creates a new announcement.
 * Requires ADMIN role.
 *
 * Body: { title: string, content: string, isPublished?: boolean }
 */
export const POST: APIRoute = async (ctx) => {
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;
  const db = ctx.locals.db;

  // Parse request body
  let body: {
    title?: string;
    content?: string;
    isPublished?: boolean;
  };

  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, content, isPublished } = body;

  // Validate required fields
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
  const id = crypto.randomUUID();
  const published = isPublished === true;

  try {
    await db.insert(schema.announcements).values({
      id,
      title: title.trim(),
      content: content.trim(),
      isPublished: published,
      publishedAt: published ? now : null,
      authorId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .limit(1);

    // Fire email blast if publishing on create (fire-and-forget)
    if (published) {
      sendAnnouncementEmailBlast({
        db,
        announcementTitle: title.trim(),
        announcementContent: content.trim(),
        announcementId: id,
      }).catch((err) => {
        console.error("[announcements] Email blast failed (create):", err);
      });
    }

    return new Response(JSON.stringify(created[0]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to create announcement:", err);
    return new Response(JSON.stringify({ error: "Failed to create announcement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;