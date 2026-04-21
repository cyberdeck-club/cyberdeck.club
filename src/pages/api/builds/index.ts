import type { APIRoute } from "astro";
import * as schema from "../../../db/schema";

/**
 * POST /api/builds
 *
 * Creates a new build.
 * Requires authenticated user.
 *
 * Body: { title: string, slug?: string, description?: string, content?: string, imageUrl?: string, specs?: string }
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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
    specs?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, slug: providedSlug, description, content, imageUrl, specs } = body;

  // Validate required fields
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
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

  try {
    await db.insert(schema.builds).values({
      id,
      slug,
      title: title.trim(),
      description: description?.trim() ?? null,
      content: content?.trim() ?? null,
      heroImageUrl: imageUrl?.trim() ?? null,
      status: "draft",
      authorId: userId,
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
      return new Response(JSON.stringify({ error: "A build with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Failed to create build:", err);
    return new Response(JSON.stringify({ error: "Failed to create build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
