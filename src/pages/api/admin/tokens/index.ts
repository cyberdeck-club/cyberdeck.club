import type { APIRoute } from "astro";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../../../../lib/require-auth";
import { ROLES } from "../../../../lib/roles";
import { personalAccessTokens, user } from "../../../../db/schema";

/**
 * GET /api/admin/tokens
 *
 * Returns all tokens across all users (including revoked tokens).
 * Requires ADMIN (50) role.
 *
 * Query params: page (default 1), pageSize (default 50), userId (optional filter)
 */
export const GET: APIRoute = async (ctx) => {
  // Require ADMIN role
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = ctx.locals.db;

  // Parse pagination params
  const url = new URL(ctx.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50));
  const offset = (page - 1) * pageSize;

  // Parse optional userId filter
  const userIdFilter = url.searchParams.get("userId");

  // Build query
  let tokensQuery = db
    .select({
      id: personalAccessTokens.id,
      userId: personalAccessTokens.userId,
      name: personalAccessTokens.name,
      tokenPrefix: personalAccessTokens.tokenPrefix,
      scopes: personalAccessTokens.scopes,
      expiresAt: personalAccessTokens.expiresAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
      revokedAt: personalAccessTokens.revokedAt,
      createdAt: personalAccessTokens.createdAt,
      ownerId: user.id,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(personalAccessTokens)
    .innerJoin(user, eq(personalAccessTokens.userId, user.id))
    .orderBy(desc(personalAccessTokens.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Apply userId filter if provided
  if (userIdFilter) {
    tokensQuery = tokensQuery.where(eq(personalAccessTokens.userId, userIdFilter)) as typeof tokensQuery;
  }

  const tokens = await tokensQuery;

  // Get total count
  const countResult = userIdFilter
    ? await db
      .select()
      .from(personalAccessTokens)
      .where(eq(personalAccessTokens.userId, userIdFilter))
    : await db.select().from(personalAccessTokens);

  const total = countResult.length;

  return new Response(
    JSON.stringify({
      tokens: tokens.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: t.name,
        tokenPrefix: t.tokenPrefix,
        scopes: JSON.parse(t.scopes) as string[],
        expiresAt: t.expiresAt,
        lastUsedAt: t.lastUsedAt,
        revokedAt: t.revokedAt,
        createdAt: t.createdAt,
        ownerName: t.ownerName,
        ownerEmail: t.ownerEmail,
      })),
      total,
      page,
      pageSize,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
