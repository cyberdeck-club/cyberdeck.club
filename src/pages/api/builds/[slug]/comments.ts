import type { APIRoute } from "astro";
import { eq, isNull, and } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { checkPublishingGate } from "../../../../lib/publishing-gate";

/**
 * GET /api/builds/[slug]/comments
 * Fetch all comments for a build by build slug.
 * Excludes soft-deleted comments (where deletedAt is not null).
 * Supports threaded replies via parentId.
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

  // Look up build by slug to get build ID
  const buildResults = await db
    .select({ id: schema.builds.id })
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (buildResults.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const buildId = buildResults[0].id;

  // Fetch all non-deleted comments for this build with author info
  const comments = await db
    .select({
      id: schema.buildComments.id,
      content: schema.buildComments.content,
      parentId: schema.buildComments.parentId,
      createdAt: schema.buildComments.createdAt,
      updatedAt: schema.buildComments.updatedAt,
      authorId: schema.buildComments.authorId,
      authorName: schema.user.name,
    })
    .from(schema.buildComments)
    .innerJoin(schema.user, eq(schema.buildComments.authorId, schema.user.id))
    .where(
      and(
        eq(schema.buildComments.buildId, buildId),
        isNull(schema.buildComments.deletedAt)
      )
    )
    .orderBy(schema.buildComments.createdAt);

  return new Response(JSON.stringify({ comments }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * POST /api/builds/[slug]/comments
 * Create a new comment on a build.
 * Requires auth + publishing gate.
 */
export const POST: APIRoute = async (ctx) => {
  const rawSlug = ctx.params.slug;

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!rawSlug || typeof rawSlug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Look up build by slug to get build ID
  const buildResults = await db
    .select({ id: schema.builds.id })
    .from(schema.builds)
    .where(eq(schema.builds.slug, rawSlug))
    .limit(1);

  if (buildResults.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const buildId = buildResults[0].id;

  // Parse and validate request body
  let body: { content?: string; parentId?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, parentId } = body;

  // Validate required fields
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate parentId if provided (must exist and belong to same build)
  if (parentId) {
    const parentComment = await db
      .select({ id: schema.buildComments.id, buildId: schema.buildComments.buildId })
      .from(schema.buildComments)
      .where(eq(schema.buildComments.id, parentId))
      .limit(1);

    if (parentComment.length === 0) {
      return new Response(JSON.stringify({ error: "Parent comment not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (parentComment[0].buildId !== buildId) {
      return new Response(JSON.stringify({ error: "Parent comment does not belong to this build" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const commentId = crypto.randomUUID();

  try {
    await db.insert(schema.buildComments).values({
      id: commentId,
      buildId,
      authorId: userId,
      content: content.trim(),
      parentId: parentId || null,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created comment with author info
    const createdComment = await db
      .select({
        id: schema.buildComments.id,
        content: schema.buildComments.content,
        parentId: schema.buildComments.parentId,
        createdAt: schema.buildComments.createdAt,
        updatedAt: schema.buildComments.updatedAt,
        authorId: schema.buildComments.authorId,
        authorName: schema.user.name,
      })
      .from(schema.buildComments)
      .innerJoin(schema.user, eq(schema.buildComments.authorId, schema.user.id))
      .where(eq(schema.buildComments.id, commentId))
      .limit(1);

    return new Response(JSON.stringify({ comment: createdComment[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to create build comment:", err);
    return new Response(JSON.stringify({ error: "Failed to create comment" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};