import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { meetups } from "../../../db/schema";
import { recordEdit } from "../../../lib/edit-history";
import { ROLES, requireRole } from "../../../lib/roles";
import { checkPublishingGate } from "../../../lib/publishing-gate";

/**
 * PUT /api/meetups/[slug]
 * Update a meetup.
 * - Only meetup organizer or moderator/admin can edit
 */
export const PUT: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db!;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Check publishing gate (guidelines acceptance)
  const gateResult = await checkPublishingGate(db, userId);
  if (gateResult) {
    return gateResult;
  }

  // Fetch the existing meetup
  const existingMeetups = await db
    .select()
    .from(meetups)
    .where(eq(meetups.slug, slug))
    .limit(1);

  if (existingMeetups.length === 0) {
    return new Response(JSON.stringify({ error: "Meetup not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const meetup = existingMeetups[0];

  // Check if user is organizer or moderator/admin
  const isOrganizer = meetup.organizerId === userId;
  const isModeratorOrAdmin = requireRole(userRole, ROLES.MODERATOR);

  if (!isOrganizer && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: {
    title?: string;
    description?: string;
    content?: string;
    location?: string;
    startsAt?: number;
    endsAt?: number;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, description, content, location, startsAt, endsAt } = body;

  // Validate required fields if provided
  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    return new Response(JSON.stringify({ error: "title cannot be empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build update object
  const updates: Partial<{
    title: string;
    description: string | null;
    content: string | null;
    location: string | null;
    startsAt: number;
    endsAt: number | null;
    updatedAt: number;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (title !== undefined) {
    updates.title = title.trim();
  }

  if (description !== undefined) {
    updates.description = description?.trim() ?? null;
  }

  if (content !== undefined) {
    updates.content = content?.trim() ?? null;
  }

  if (location !== undefined) {
    updates.location = location?.trim() ?? null;
  }

  if (startsAt !== undefined) {
    updates.startsAt = startsAt;
  }

  if (endsAt !== undefined) {
    updates.endsAt = endsAt;
  }

  // Track changes for edit history
  const changes: string[] = [];
  if (title !== undefined && title.trim() !== meetup.title) {
    changes.push("Title changed");
  }
  if (description !== undefined && description?.trim() !== meetup.description) {
    changes.push("Description changed");
  }
  if (content !== undefined && content?.trim() !== meetup.content) {
    changes.push("Content changed");
  }
  if (location !== undefined && location?.trim() !== meetup.location) {
    changes.push("Location changed");
  }
  if (startsAt !== undefined && startsAt !== meetup.startsAt) {
    changes.push("Start time changed");
  }
  if (endsAt !== undefined && endsAt !== meetup.endsAt) {
    changes.push("End time changed");
  }

  try {
    await db
      .update(meetups)
      .set(updates)
      .where(eq(meetups.slug, slug));

    // Record edit history
    await recordEdit(db, {
      entityType: "meetup",
      entityId: meetup.id,
      editorId: userId,
      changesSummary: changes.length > 0 ? changes.join("; ") : "Meetup updated",
    });

    // Fetch the updated meetup
    const updatedMeetups = await db
      .select()
      .from(meetups)
      .where(eq(meetups.slug, slug))
      .limit(1);

    return new Response(JSON.stringify({ meetup: updatedMeetups[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update meetup:", err);
    return new Response(JSON.stringify({ error: "Failed to update meetup" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;