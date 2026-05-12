import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { recordEdit } from "../../../lib/edit-history";
import * as schema from "../../../db/schema";
import { checkPublishingGate } from "../../../lib/publishing-gate";
import { requireRole, ROLES } from "../../../lib/roles";

/**
 * GET /api/builds/[slug]
 * Fetch a single build by slug (for edit page)
 */
export const GET: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db!;

  // Fetch the build with author name
  const buildResults = await db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (buildResults.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ build: buildResults[0].build }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * PUT /api/builds/[slug]
 * Update a build.
 * - Only build author or moderator/admin can edit
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

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Fetch the existing build
  const builds = await db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (builds.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const build = builds[0];

  // Check if user is author or moderator/admin
  const isAuthor = build.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    imageUrl?: string;
    status?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, slug: newSlug, description, content, imageUrl, status } = body;

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
    slug: string;
    description: string | null;
    content: string | null;
    heroImageUrl: string | null;
    status: string;
    updatedAt: number;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (title !== undefined) {
    updates.title = title.trim();
  }

  if (newSlug !== undefined) {
    if (typeof newSlug !== "string" || newSlug.trim().length === 0) {
      return new Response(JSON.stringify({ error: "slug cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    updates.slug = newSlug.trim();
  }

  if (description !== undefined) {
    updates.description = description?.trim() ?? null;
  }

  if (content !== undefined) {
    updates.content = content?.trim() ?? null;
  }

  if (imageUrl !== undefined) {
    updates.heroImageUrl = imageUrl?.trim() ?? null;
  }

  if (status !== undefined) {
    // Validate status value
    const validStatuses = ["planning", "in-progress", "complete", "draft", "published"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.status = status;
  }

  try {
    await db
      .update(schema.builds)
      .set(updates)
      .where(eq(schema.builds.slug, slug));

    // Record edit history
    await recordEdit(db, {
      entityType: "build",
      entityId: build.id,
      editorId: userId,
      changesSummary: "Build updated",
    }).catch((err) => console.error("Failed to record edit history:", err));

    // Fetch the updated build
    const updatedBuilds = await db
      .select({
        build: schema.builds,
        authorName: schema.user.name,
      })
      .from(schema.builds)
      .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
      .where(eq(schema.builds.slug, updates.slug ?? slug))
      .limit(1);

    return new Response(JSON.stringify({ build: updatedBuilds[0].build }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Check for unique constraint violation (duplicate slug)
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return new Response(JSON.stringify({ error: "A build with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Failed to update build:", err);
    return new Response(JSON.stringify({ error: "Failed to update build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/builds/[slug]
 * Update a build (partial update).
 * Alias for PUT - uses the same logic.
 */
/**
 * DELETE /api/builds/[slug]
 * Soft-deletes a build by setting deletedAt timestamp.
 * Access: Build author OR Moderator/Admin
 */
export const DELETE: APIRoute = async (ctx) => {
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

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Fetch the existing build
  const builds = await db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (builds.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const build = builds[0];

  // Already soft-deleted
  if (build.deletedAt) {
    return new Response(JSON.stringify({ error: "Build already deleted" }), {
      status: 410,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user is author or moderator/admin (uses >= comparison)
  const isAuthor = build.authorId === userId;
  const isModerator = requireRole(userRole, ROLES.MODERATOR);

  if (!isAuthor && !isModerator) {
    return new Response(JSON.stringify({ error: "You can only delete your own builds" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await db
      .update(schema.builds)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.builds.slug, slug));

    return new Response(
      JSON.stringify({ success: true, deletedAt: now }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to delete build:", err);
    return new Response(JSON.stringify({ error: "Failed to delete build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PATCH: APIRoute = async (ctx) => {
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

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Fetch the existing build
  const builds = await db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (builds.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const build = builds[0];

  // Check if user is author or moderator/admin
  const isAuthor = build.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    imageUrl?: string;
    status?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, slug: newSlug, description, content, imageUrl, status } = body;

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
    slug: string;
    description: string | null;
    content: string | null;
    heroImageUrl: string | null;
    status: string;
    updatedAt: number;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (title !== undefined) {
    updates.title = title.trim();
  }

  if (newSlug !== undefined) {
    if (typeof newSlug !== "string" || newSlug.trim().length === 0) {
      return new Response(JSON.stringify({ error: "slug cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    updates.slug = newSlug.trim();
  }

  if (description !== undefined) {
    updates.description = description?.trim() ?? null;
  }

  if (content !== undefined) {
    updates.content = content?.trim() ?? null;
  }

  if (imageUrl !== undefined) {
    updates.heroImageUrl = imageUrl?.trim() ?? null;
  }

  if (status !== undefined) {
    // Validate status value
    const validStatuses = ["planning", "in-progress", "complete", "draft", "published"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.status = status;
  }

  try {
    await db
      .update(schema.builds)
      .set(updates)
      .where(eq(schema.builds.slug, slug));

    // Record edit history
    await recordEdit(db, {
      entityType: "build",
      entityId: build.id,
      editorId: userId,
      changesSummary: "Build updated",
    }).catch((err) => console.error("Failed to record edit history:", err));

    // Fetch the updated build
    const updatedBuilds = await db
      .select({
        build: schema.builds,
        authorName: schema.user.name,
      })
      .from(schema.builds)
      .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
      .where(eq(schema.builds.slug, updates.slug ?? slug))
      .limit(1);

    return new Response(JSON.stringify({ build: updatedBuilds[0].build }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Check for unique constraint violation (duplicate slug)
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return new Response(JSON.stringify({ error: "A build with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Failed to update build:", err);
    return new Response(JSON.stringify({ error: "Failed to update build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};