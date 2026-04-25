import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { staticPages } from "../../../db/schema";

/**
 * GET /api/static-pages/[slug]
 * Public endpoint to get a static page by slug
 */
export const GET: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  const page = await db
    .select()
    .from(staticPages)
    .where(eq(staticPages.slug, slug))
    .limit(1);

  if (page.length === 0) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only return published pages to public
  if (page[0].status !== "published") {
    // For non-published, only return if user is authenticated
    if (!ctx.locals.user) {
      return new Response(JSON.stringify({ error: "Page not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify(page[0]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
