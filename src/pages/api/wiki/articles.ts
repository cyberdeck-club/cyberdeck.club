import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../db/schema";

/**
 * POST /api/wiki/articles
 *
 * Creates a new wiki article with initial revision.
 * Requires authenticated user.
 *
 * Body: { categoryId: string, title: string, slug: string, content: string }
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
    categoryId?: string;
    title?: string;
    slug?: string;
    content?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { categoryId, title, slug, content } = body;

  // Validate required fields
  if (!categoryId || typeof categoryId !== "string") {
    return new Response(
      JSON.stringify({ error: "categoryId is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
    return new Response(JSON.stringify({ error: "slug is required" }), {
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

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const now = Math.floor(Date.now() / 1000);

  // Verify category exists
  const categories = await db
    .select({ id: schema.wikiCategories.id })
    .from(schema.wikiCategories)
    .where(eq(schema.wikiCategories.id, categoryId))
    .limit(1);

  if (categories.length === 0) {
    return new Response(JSON.stringify({ error: "Category not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check for duplicate slug in same category
  const existing = await db
    .select({ id: schema.wikiArticles.id })
    .from(schema.wikiArticles)
    .where(
      eq(schema.wikiArticles.slug, slug.trim())
    )
    .limit(1);

  if (existing.length > 0) {
    return new Response(
      JSON.stringify({ error: "An article with this slug already exists" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const articleId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();

  try {
    // Use batch to create article and initial revision in one operation
    await db.batch([
      // Insert the new article
      db.insert(schema.wikiArticles).values({
        id: articleId,
        categoryId,
        slug: slug.trim(),
        title: title.trim(),
        content: content.trim(),
        authorId: userId,
        status: "published",
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      }),
      // Insert initial revision
      db.insert(schema.wikiRevisions).values({
        id: revisionId,
        articleId,
        content: content.trim(),
        title: title.trim(),
        authorId: userId,
        createdAt: now,
      }),
    ]);

    // Return success with article ID
    return new Response(
      JSON.stringify({ success: true, articleId }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to create article:", err);
    return new Response(JSON.stringify({ error: "Failed to create article" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
