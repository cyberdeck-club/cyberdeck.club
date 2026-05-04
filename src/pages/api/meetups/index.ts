import type { APIRoute } from "astro";
import { eq, asc } from "drizzle-orm";
import * as schema from "../../../db/schema";
import { requireAuth } from "@/lib/require-auth";
import { ROLES } from "@/lib/roles";

/**
 * POST /api/meetups
 *
 * Creates a new meetup.
 * Requires TRUSTED_MAKER role or above.
 *
 * Body: { title: string, slug?: string, description?: string, content?: string, location?: string, startsAt?: number, endsAt?: number, maxAttendees?: number }
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication and TRUSTED_MAKER role minimum
  const authResult = requireAuth(ctx.locals.user, ROLES.TRUSTED_MAKER);
  if (authResult instanceof Response) {
    return authResult;
  }
  const { user } = authResult;

  // Parse and validate request body
  let body: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    location?: string;
    startsAt?: number;
    endsAt?: number;
    maxAttendees?: number;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    title,
    slug: providedSlug,
    description,
    content,
    location,
    startsAt,
    endsAt,
    maxAttendees,
  } = body;

  // Validate required fields
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = user.id;
  const now = Math.floor(Date.now() / 1000);

  // Generate ID and slug
  const id = crypto.randomUUID();
  const slug =
    providedSlug && typeof providedSlug === "string" && providedSlug.trim().length > 0
      ? providedSlug.trim()
      : title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100);

  // Validate timestamps if provided
  if (startsAt !== undefined && typeof startsAt !== "number") {
    return new Response(JSON.stringify({ error: "startsAt must be a Unix timestamp" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (endsAt !== undefined && typeof endsAt !== "number") {
    return new Response(JSON.stringify({ error: "endsAt must be a Unix timestamp" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await db.insert(schema.meetups).values({
      id,
      slug,
      title: title.trim(),
      description: description?.trim() ?? null,
      content: content?.trim() ?? null,
      location: location?.trim() ?? null,
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
      status: "upcoming",
      organizerId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return new Response(JSON.stringify({ id, slug }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Check for unique constraint violation (duplicate slug)
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return new Response(JSON.stringify({ error: "A meetup with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Failed to create meetup:", err);
    return new Response(JSON.stringify({ error: "Failed to create meetup" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * GET /api/meetups
 *
 * Lists published meetups with pagination.
 * Public endpoint - no authentication required.
 *
 * Query params:
 *   - page: number (default 1) - Page number for pagination
 *   - limit: number (default 20, max 100) - Results per page
 */
export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db;
  const url = new URL(ctx.request.url);

  // Parse pagination params
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  // Fetch published meetups with organizer name
  const results = await db
    .select({
      meetup: schema.meetups,
      organizerName: schema.user.name,
    })
    .from(schema.meetups)
    .innerJoin(schema.user, eq(schema.meetups.organizerId, schema.user.id))
    .where(eq(schema.meetups.status, "published"))
    .orderBy(asc(schema.meetups.startsAt))
    .limit(limit)
    .offset(offset);

  const meetups = results.map((row) => ({
    id: row.meetup.id,
    slug: row.meetup.slug,
    title: row.meetup.title,
    description: row.meetup.description,
    content: row.meetup.content,
    location: row.meetup.location,
    startsAt: row.meetup.startsAt,
    endsAt: row.meetup.endsAt,
    status: row.meetup.status,
    organizerId: row.meetup.organizerId,
    organizerName: row.organizerName,
    createdAt: row.meetup.createdAt,
    updatedAt: row.meetup.updatedAt,
  }));

  return new Response(
    JSON.stringify({
      meetups,
      total: meetups.length,
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
