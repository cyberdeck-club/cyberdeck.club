import type { APIRoute } from "astro";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../../../../lib/require-auth";
import { ROLES } from "../../../../lib/roles";
import { patUsageLogs, personalAccessTokens, user } from "../../../../db/schema";

/**
 * GET /api/admin/tokens/logs
 *
 * Returns paginated token usage logs across all tokens.
 * Requires ADMIN (50) role.
 *
 * Query params:
 * - page (default 1)
 * - pageSize (default 50, max 100)
 * - userId (optional filter)
 * - tokenId (optional filter)
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

  // Parse optional filters
  const userIdFilter = url.searchParams.get("userId");
  const tokenIdFilter = url.searchParams.get("tokenId");

  // Build where conditions
  const conditions = [];
  if (userIdFilter) {
    conditions.push(eq(patUsageLogs.userId, userIdFilter));
  }
  if (tokenIdFilter) {
    conditions.push(eq(patUsageLogs.tokenId, tokenIdFilter));
  }

  // Fetch logs with user and token info
  const logs = await db
    .select({
      id: patUsageLogs.id,
      tokenId: patUsageLogs.tokenId,
      userId: patUsageLogs.userId,
      method: patUsageLogs.method,
      path: patUsageLogs.path,
      statusCode: patUsageLogs.statusCode,
      ipAddress: patUsageLogs.ipAddress,
      userAgent: patUsageLogs.userAgent,
      createdAt: patUsageLogs.createdAt,
      tokenName: personalAccessTokens.name,
      ownerId: user.id,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(patUsageLogs)
    .innerJoin(personalAccessTokens, eq(patUsageLogs.tokenId, personalAccessTokens.id))
    .innerJoin(user, eq(patUsageLogs.userId, user.id))
    .orderBy(desc(patUsageLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Get total count
  const countResult = conditions.length > 0
    ? await db
      .select()
      .from(patUsageLogs)
      .where(and(...conditions))
    : await db.select().from(patUsageLogs);

  const total = countResult.length;

  return new Response(
    JSON.stringify({
      logs: logs.map((log) => ({
        id: log.id,
        tokenId: log.tokenId,
        tokenName: log.tokenName,
        userId: log.userId,
        ownerName: log.ownerName,
        ownerEmail: log.ownerEmail,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
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
