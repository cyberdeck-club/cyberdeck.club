import type { APIRoute } from "astro";
import { eq, desc, isNull } from "drizzle-orm";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import { generateToken } from "../../../lib/pat-auth";
import { isValidScope, validateScopesForRole } from "../../../lib/token-scopes";
import { personalAccessTokens } from "../../../db/schema";

/**
 * GET /api/tokens
 *
 * Returns all non-revoked tokens for the authenticated user.
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

  // Fetch all tokens for the user
  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
      tokenPrefix: personalAccessTokens.tokenPrefix,
      scopes: personalAccessTokens.scopes,
      expiresAt: personalAccessTokens.expiresAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
      revokedAt: personalAccessTokens.revokedAt,
      createdAt: personalAccessTokens.createdAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.userId, userId))
    .orderBy(desc(personalAccessTokens.createdAt));

  // Parse scopes JSON and filter out revoked tokens
  const activeTokens = tokens
    .filter((t) => t.revokedAt === null)
    .map((t) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      scopes: JSON.parse(t.scopes) as string[],
      expiresAt: t.expiresAt,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
    }));

  return new Response(JSON.stringify({ tokens: activeTokens }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * POST /api/tokens
 *
 * Creates a new personal access token for the authenticated user.
 * Requires session auth (PAT auth is blocked by middleware on /api/tokens/*).
 *
 * Body: { name: string, scopes: string[], expiresAt?: number | null }
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) {
    return authResult;
  }
  const { user } = authResult;
  const db = ctx.locals.db;
  const userId = user.id;
  const userRole = user.role ?? "member";

  // Parse request body
  let body: { name?: string; scopes?: string[]; expiresAt?: number | null };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name, scopes, expiresAt } = body;

  // Validate name: non-empty, max 100 chars
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return new Response(JSON.stringify({ error: "name is required and must be a non-empty string" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (name.trim().length > 100) {
    return new Response(JSON.stringify({ error: "name must be 100 characters or less" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate scopes: non-empty array of valid scope strings
  if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
    return new Response(JSON.stringify({ error: "scopes is required and must be a non-empty array" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const scope of scopes) {
    if (typeof scope !== "string" || !isValidScope(scope)) {
      return new Response(JSON.stringify({ error: `Invalid scope: ${scope}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Validate scopes are valid for user's role
  const scopeValidation = validateScopesForRole(scopes, userRole);
  if (!scopeValidation.valid) {
    return new Response(
      JSON.stringify({
        error: "Some scopes are not available for your role",
        invalidScopes: scopeValidation.invalidScopes,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate expiresAt: null or a future unix timestamp
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt !== null && expiresAt !== undefined) {
    if (typeof expiresAt !== "number" || expiresAt <= now) {
      return new Response(JSON.stringify({ error: "expiresAt must be null or a future unix timestamp" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Check user has fewer than 10 active (non-revoked) tokens
  const existingTokens = await db
    .select({ id: personalAccessTokens.id, revokedAt: personalAccessTokens.revokedAt })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.userId, userId));

  const activeTokenCount = existingTokens.filter((t) => t.revokedAt === null).length;
  if (activeTokenCount >= 10) {
    return new Response(JSON.stringify({ error: "Maximum of 10 active tokens reached. Revoke an existing token to create a new one." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Generate token
  const { rawToken, tokenHash, tokenPrefix } = await generateToken();

  // Insert into database
  const id = crypto.randomUUID();
  try {
    await db.insert(personalAccessTokens).values({
      id,
      userId,
      name: name.trim(),
      tokenHash,
      tokenPrefix,
      scopes: JSON.stringify(scopes),
      expiresAt: expiresAt ?? null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: now,
    });

    return new Response(
      JSON.stringify({
        id,
        name: name.trim(),
        rawToken,
        tokenPrefix,
        scopes,
        expiresAt: expiresAt ?? null,
        createdAt: now,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to create token:", err);
    return new Response(JSON.stringify({ error: "Failed to create token" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
