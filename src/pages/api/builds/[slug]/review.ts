import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { requireAuth } from "../../../../lib/require-auth";
import { ROLES } from "../../../../lib/roles";
import { checkAndPromoteUser } from "../../../../lib/promotion";

/**
 * POST /api/builds/[slug]/review
 *
 * Human review endpoint for the moderation queue.
 * Requires TRUSTED_MAKER (30) role minimum — trusted makers and above can review.
 *
 * Request body: { action: 'approve' | 'reject', reason?: string }
 *
 * On APPROVE:
 *   1. Update build: status = 'published', publishedAt = now(), reviewedBy = reviewer.id, reviewedAt = now()
 *   2. Update build author: acceptedBuildCount += 1
 *   3. If this is the author's first published build, set firstBuildPublishedAt = now()
 *   4. Call checkAndPromoteUser() for the build author
 *   5. Return success with the build data
 *
 * On REJECT:
 *   1. Require reason (non-empty string, min 10 chars)
 *   2. Update build: status = 'rejected', rejectionReason = reason, reviewedBy = reviewer.id, reviewedAt = now()
 *   3. Return success
 *
 * Prevent self-review: reviewer cannot review their own build.
 */
export const POST: APIRoute = async (ctx) => {
  // Require TRUSTED_MAKER role minimum
  const authResult = requireAuth(ctx.locals.user, ROLES.TRUSTED_MAKER);
  if (authResult instanceof Response) {
    return authResult;
  }
  const { user: reviewer } = authResult;

  const slug = ctx.params.slug;
  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: { action?: string; reason?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action, reason } = body;

  // Validate action
  if (!action || (action !== "approve" && action !== "reject")) {
    return new Response(
      JSON.stringify({ error: "action must be 'approve' or 'reject'" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate reason for rejection
  if (action === "reject") {
    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return new Response(
        JSON.stringify({
          error: "A rejection reason of at least 10 characters is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  const db = ctx.locals.db;
  const reviewerId = reviewer.id;

  // Fetch the build
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

  // Prevent self-review
  if (build.authorId === reviewerId) {
    return new Response(
      JSON.stringify({ error: "You cannot review your own build" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check that build is in reviewable state
  if (build.status !== "pending_human") {
    return new Response(
      JSON.stringify({
        error: `Build is not pending review (current status: ${build.status})`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const reviewedAt = new Date().toISOString();

  if (action === "approve") {
    // APPROVE: Publish the build

    // 1. Update build status
    await db
      .update(schema.builds)
      .set({
        status: "published",
        publishedAt: reviewedAt,
        reviewedBy: reviewerId,
        reviewedAt: reviewedAt,
        updatedAt: now,
      })
      .where(eq(schema.builds.id, build.id));

    // 2. Update author: acceptedBuildCount += 1
    const authorUsers = await db
      .select({
        id: schema.user.id,
        acceptedBuildCount: schema.user.acceptedBuildCount,
        firstBuildPublishedAt: schema.user.firstBuildPublishedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, build.authorId))
      .limit(1);

    if (authorUsers.length > 0) {
      const author = authorUsers[0];
      const newAcceptedCount = (author.acceptedBuildCount ?? 0) + 1;
      const isFirstPublished = !author.firstBuildPublishedAt;

      await db
        .update(schema.user)
        .set({
          acceptedBuildCount: newAcceptedCount,
          ...(isFirstPublished ? { firstBuildPublishedAt: reviewedAt } : {}),
        })
        .where(eq(schema.user.id, build.authorId));
    }

    // 3. Check for role promotion
    const promotionResult = build.authorId
      ? await checkAndPromoteUser(db, build.authorId)
      : { promoted: false };

    // 4. Fetch updated build
    const updatedBuilds = await db
      .select({
        build: schema.builds,
        authorName: schema.user.name,
      })
      .from(schema.builds)
      .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
      .where(eq(schema.builds.id, build.id))
      .limit(1);

    return new Response(
      JSON.stringify({
        success: true,
        action: "approve",
        build: updatedBuilds[0]?.build,
        promotion: promotionResult,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } else {
    // REJECT: Send back for revision

    // 1. Update build status with rejection reason
    await db
      .update(schema.builds)
      .set({
        status: "rejected",
        rejectionReason: reason?.trim(),
        reviewedBy: reviewerId,
        reviewedAt: reviewedAt,
        updatedAt: now,
      })
      .where(eq(schema.builds.id, build.id));

    return new Response(
      JSON.stringify({
        success: true,
        action: "reject",
        message: "Build has been sent back for revision",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
