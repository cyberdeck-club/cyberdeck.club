import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import { personalAccessTokens } from "../../../db/schema";

/**
 * GET /api/tokens/[id]
 *
 * Returns details for a specific token.
 * Requires session auth (PAT auth is blocked by middleware on /api/tokens/*).
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
    .select({
      id: personalAccessTokens.id,
      userId: personalAccessTokens.userId,
      name: personalAccessTokens.name,
      tokenPrefix: personalAccessTokens.tokenPrefix,
      scopes: personalAccessTokens.scopes,
      expiresAt: personalAccessTokens.expiresAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
      createdAt: personalAccessTokens.createdAt,
    })
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

  return new Response(
    JSON.stringify({
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      scopes: JSON.parse(token.scopes) as string[],
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

/**
 * DELETE /api/tokens/[id]
 *
 * Revokes a specific token by setting revokedAt to current timestamp.
 * Requires session auth (PAT auth is blocked by middleware on /api/tokens/*).
 */
export const DELETE: APIRoute = async (ctx) => {
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
  if (!token) {
    return new Response(JSON.stringify({ error: "Token not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (token.userId !== userId) {
    return new Response(JSON.stringify({ error: "Token not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Revoke the token
  const now = Math.floor(Date.now() / 1000);
  try {
    await db
      .update(personalAccessTokens)
      .set({ revokedAt: now })
      .where(eq(personalAccessTokens.id, tokenId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to revoke token:", err);
    return new Response(JSON.stringify({ error: "Failed to revoke token" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
