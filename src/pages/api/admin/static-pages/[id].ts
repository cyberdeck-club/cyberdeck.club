import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { staticPages } from "../../../../db/schema";

/**
 * GET /api/admin/static-pages/[id]
 * Get a single static page by ID or slug
 */
export const GET: APIRoute = async (ctx) => {
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

  const idOrSlug = ctx.params.id;
  if (!idOrSlug) {
    return new Response(JSON.stringify({ error: "ID or slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  // Try to find by ID first, then by slug
  let page = await db
    .select()
    .from(staticPages)
    .where(eq(staticPages.id, idOrSlug))
    .limit(1);

  if (page.length === 0) {
    // Try by slug
    page = await db
      .select()
      .from(staticPages)
      .where(eq(staticPages.slug, idOrSlug))
      .limit(1);
  }

  if (page.length === 0) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(page[0]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * PUT /api/admin/static-pages/[id]
 * Update a static page
 */
export const PUT: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require admin role
  const userRole = (ctx.locals.user as any).role;
  if (userRole !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const id = ctx.params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: {
    slug?: string;
    title?: string;
    content?: string;
    metaDescription?: string;
    metaImage?: string;
    featuredImage?: string;
    featuredImageAlt?: string;
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

  const db = ctx.locals.db;
  const now = Math.floor(Date.now() / 1000);

  // Check if page exists
  const existing = await db
    .select({ id: staticPages.id })
    .from(staticPages)
    .where(eq(staticPages.id, id))
    .limit(1);

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If changing slug, check it's not already taken
  if (body.slug) {
    const slugConflict = await db
      .select({ id: staticPages.id })
      .from(staticPages)
      .where(eq(staticPages.slug, body.slug))
      .limit(1);

    if (slugConflict.length > 0 && slugConflict[0].id !== id) {
      return new Response(JSON.stringify({ error: "A page with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Build update object
  const updateData: Record<string, any> = { updatedAt: now };
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription;
  if (body.metaImage !== undefined) updateData.metaImage = body.metaImage;
  if (body.featuredImage !== undefined) updateData.featuredImage = body.featuredImage;
  if (body.featuredImageAlt !== undefined) updateData.featuredImageAlt = body.featuredImageAlt;
  if (body.status !== undefined) updateData.status = body.status;

  try {
    await db
      .update(staticPages)
      .set(updateData)
      .where(eq(staticPages.id, id));

    const updated = await db
      .select()
      .from(staticPages)
      .where(eq(staticPages.id, id))
      .limit(1);

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update static page:", err);
    return new Response(JSON.stringify({ error: "Failed to update page" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/admin/static-pages/[id]
 * Delete a static page
 */
export const DELETE: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require admin role
  const userRole = (ctx.locals.user as any).role;
  if (userRole !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const id = ctx.params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  // Check if page exists
  const existing = await db
    .select({ id: staticPages.id })
    .from(staticPages)
    .where(eq(staticPages.id, id))
    .limit(1);

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await db.delete(staticPages).where(eq(staticPages.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to delete static page:", err);
    return new Response(JSON.stringify({ error: "Failed to delete page" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
