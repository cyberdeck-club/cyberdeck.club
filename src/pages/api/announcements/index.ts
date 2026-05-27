import type { APIRoute } from "astro";
import { and, desc, eq, isNull } from "drizzle-orm";
import * as schema from "@/db/schema";

/**
 * GET /api/announcements
 *
 * Returns ALL published, non-deleted announcements ordered by publishedAt DESC.
 * The client filters out already-acknowledged ones using ID-based localStorage tracking.
 * Public endpoint — no authentication required.
 */
export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db;

  try {
    const conditions = [
      eq(schema.announcements.isPublished, true),
      isNull(schema.announcements.deletedAt),
    ];

    const announcements = await db
      .select()
      .from(schema.announcements)
      .where(and(...conditions))
      .orderBy(desc(schema.announcements.publishedAt));

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

export const prerender = false;