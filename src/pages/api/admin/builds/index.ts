import type { APIRoute } from "astro";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { requireAuth } from "../../../../lib/require-auth";
import { ROLES } from "../../../../lib/roles";

/**
 * GET /api/admin/builds
 *
 * Returns builds pending human review.
 * Requires TRUSTED_MAKER (30) role minimum.
 *
 * Returns all builds with status = 'pending_human', ordered by createdAt DESC.
 * Includes build data + author info (name, email, role).
 */
export const GET: APIRoute = async (ctx) => {
  // Require TRUSTED_MAKER role minimum
  const authResult = requireAuth(ctx.locals.user, ROLES.TRUSTED_MAKER);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = ctx.locals.db;

  // Fetch builds pending human review with author info
  const buildsResult = await db
    .select({
      build: schema.builds,
      authorId: schema.user.id,
      authorName: schema.user.name,
      authorEmail: schema.user.email,
      authorRole: schema.user.role,
      authorAcceptedBuildCount: schema.user.acceptedBuildCount,
      authorFirstBuildPublishedAt: schema.user.firstBuildPublishedAt,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(eq(schema.builds.status, "pending_human"))
    .orderBy(desc(schema.builds.createdAt));

  return new Response(JSON.stringify({ builds: buildsResult }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
