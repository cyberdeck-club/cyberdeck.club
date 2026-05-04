import type { APIRoute } from "astro";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../../../../lib/require-auth";
import { ROLES } from "../../../../lib/roles";
import { personalAccessTokens, patUsageLogs } from "../../../../db/schema";

/**
 * GET /api/tokens/[id]/logs
 *
 * Returns paginated usage logs for a specific token.
 * Requires session auth (PAT auth is blocked by middleware on /api/tokens/*).
 * Token must belong to the logged-in user.
 *
 * Query params: page (default 1), pageSize (default 50, max 100)
 */
export const GET: APIRoute = async (ctx) => {
  // Require authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) {
    return authResult;
  }
  const { user } = authResult;
  const db = ctx.locals.db;
  const userId = user.id;
  const tokenId = ctx.params.id;

  if (!tokenId) {
    return new Response(JSON.stringify({ error: "Token ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch token and verify it belongs to the logged-in user
  const tokens = await db
    .select({ id: personalAccessTokens.id, userId: personalAccessTokens.userId })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.id, tokenId))
    .limit(1);

  const token = tokens[0];

  // Check token exists and belongs to user
  if (!token || token.userId !== userId) {
    return new Response(JSON.stringify({ error: "Token not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse pagination params
  const url = new URL(ctx.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50));
  const offset = (page - 1) * pageSize;

  // Get total count
  const countResult = await db
    .select()
    .from(patUsageLogs)
    .where(eq(patUsageLogs.tokenId, tokenId));

  const total = countResult.length;

  // Fetch logs with pagination
  const logs = await db
    .select({
      id: patUsageLogs.id,
      method: patUsageLogs.method,
      path: patUsageLogs.path,
      statusCode: patUsageLogs.statusCode,
      ipAddress: patUsageLogs.ipAddress,
      userAgent: patUsageLogs.userAgent,
      createdAt: patUsageLogs.createdAt,
    })
    .from(patUsageLogs)
    .where(eq(patUsageLogs.tokenId, tokenId))
    .orderBy(desc(patUsageLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return new Response(
    JSON.stringify({
      logs: logs.map((log) => ({
        id: log.id,
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
