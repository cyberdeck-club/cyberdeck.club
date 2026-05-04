import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../db/schema";
import { checkPublishingGate } from "../../../lib/publishing-gate";

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