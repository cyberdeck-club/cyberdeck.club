import type { APIRoute } from "astro";
import { eq, desc } from "drizzle-orm";
import { staticPages } from "../../../../db/schema";

/**
 * GET /api/admin/static-pages
 * List all static pages
 * 
 * PUT /api/admin/static-pages
 * Create a new static page (admin only)
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

  const db = ctx.locals.db;

  const pages = await db
    .select()
    .from(staticPages)
    .orderBy(desc(staticPages.updatedAt));

  return new Response(JSON.stringify(pages), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

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

  const { slug, title, content, metaDescription, metaImage, featuredImage, featuredImageAlt, status } = body;

  // Validate required fields
  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!title || typeof title !== "string") {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const now = Math.floor(Date.now() / 1000);
  const userId = ctx.locals.user.id;

  // Check if page with slug already exists
  const existing = await db
    .select({ id: staticPages.id })
    .from(staticPages)
    .where(eq(staticPages.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return new Response(JSON.stringify({ error: "A page with this slug already exists" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Generate ID
  const id = crypto.randomUUID();

  try {
    await db.insert(staticPages).values({
      id,
      slug,
      title,
      content: content || "",
      metaDescription: metaDescription || "",
      metaImage: metaImage || "",
      featuredImage: featuredImage || "",
      featuredImageAlt: featuredImageAlt || "",
      status: status || "published",
      authorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db
      .select()
      .from(staticPages)
      .where(eq(staticPages.id, id))
      .limit(1);

    return new Response(JSON.stringify(created[0]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to create static page:", err);
    return new Response(JSON.stringify({ error: "Failed to create page" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
