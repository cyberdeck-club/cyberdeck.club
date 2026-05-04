/**
 * Core PAT (Personal Access Token) authentication module.
 *
 * Provides token generation, validation, scope enforcement, and usage logging.
 * Uses Web Crypto API (not Node.js crypto) for Cloudflare Workers compatibility.
 *
 * @see plans/PAT-MCP-SERVER-DESIGN.md §3 for the full authentication flow
 */

import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { personalAccessTokens, patUsageLogs } from "../db/schema";
import { user } from "../db/auth-schema";
import type * as schema from "../db/schema";
import type { TokenScope } from "./token-scopes";
import { hasScope, validateScopesForRole } from "./token-scopes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the user object that PAT auth places on `ctx.locals.user` */
type PATUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  acceptedBuildCount: number;
  firstBuildPublishedAt: string | null;
  isModNominated: boolean;
  modNominatedBy: string | null;
  modNominatedAt: string | null;
  bannedAt: string | null;
  bannedBy: string | null;
  banReason: string | null;
};

/** Discriminated union for PAT validation results */
export type PatAuthResult =
  | { ok: true; user: PATUser; scopes: string[]; tokenId: string }
  | { ok: false; error: string; status: 401 | 403 };

type DrizzleClient = DrizzleD1Database<typeof schema>;

// ---------------------------------------------------------------------------
// SHA-256 hashing (Web Crypto API)
// ---------------------------------------------------------------------------

/**
 * Hash a string with SHA-256 using the Web Crypto API.
 * Returns the hex-encoded hash.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

/**
 * Generate a new PAT with the `cdc_` prefix.
 *
 * Returns the raw token (shown once to the user), the SHA-256 hash
 * (stored in DB), and the display prefix (first 8 chars for identification).
 *
 * Token format: `cdc_<64 hex chars>` (32 random bytes → 68 total chars)
 */
export async function generateToken(): Promise<{
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
}> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const rawToken = `cdc_${hex}`;

  const tokenHash = await sha256(rawToken);
  const tokenPrefix = rawToken.slice(0, 8); // e.g. "cdc_ab12"

  return { rawToken, tokenHash, tokenPrefix };
}

// ---------------------------------------------------------------------------
// Token validation (called by middleware)
// ---------------------------------------------------------------------------

/**
 * Validate a PAT from an `Authorization: Bearer cdc_...` header.
 *
 * Steps:
 * 1. Verify the token starts with `cdc_`
 * 2. SHA-256 hash the raw token
 * 3. Look up `token_hash` in the `personal_access_tokens` table (joined with `user`)
 * 4. Check: token exists, not revoked, not expired
 * 5. Check: user is not banned
 * 6. Parse scopes from JSON
 * 7. Validate scopes still match user's current role
 * 8. Return user + token + scopes
 *
 * `last_used_at` is updated separately (non-blocking via `waitUntil`).
 */
export async function validatePATRequest(
  db: DrizzleClient,
  authHeader: string
): Promise<PatAuthResult> {
  // 1. Extract token from "Bearer cdc_..." header
  const rawToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!rawToken.startsWith("cdc_")) {
    return { ok: false, error: "Invalid token format", status: 401 };
  }

  // 2. Hash the raw token
  const tokenHash = await sha256(rawToken);

  // 3. Look up by hash, joined with user table
  const results = await db
    .select({
      tokenId: personalAccessTokens.id,
      tokenScopes: personalAccessTokens.scopes,
      tokenExpiresAt: personalAccessTokens.expiresAt,
      tokenRevokedAt: personalAccessTokens.revokedAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userEmailVerified: user.emailVerified,
      userImage: user.image,
      userRole: user.role,
      userBio: user.bio,
      userCreatedAt: user.createdAt,
      userUpdatedAt: user.updatedAt,
      userAcceptedBuildCount: user.acceptedBuildCount,
      userFirstBuildPublishedAt: user.firstBuildPublishedAt,
      userIsModNominated: user.isModNominated,
      userModNominatedBy: user.modNominatedBy,
      userModNominatedAt: user.modNominatedAt,
      userBannedAt: user.bannedAt,
      userBannedBy: user.bannedBy,
      userBanReason: user.banReason,
    })
    .from(personalAccessTokens)
    .innerJoin(user, eq(personalAccessTokens.userId, user.id))
    .where(eq(personalAccessTokens.tokenHash, tokenHash))
    .limit(1);

  if (results.length === 0) {
    return { ok: false, error: "Invalid token", status: 401 };
  }

  const row = results[0];

  // 4. Check revocation
  if (row.tokenRevokedAt !== null) {
    return { ok: false, error: "Token has been revoked", status: 401 };
  }

  // 5. Check expiration (unix timestamp in seconds)
  if (row.tokenExpiresAt !== null) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (row.tokenExpiresAt <= nowSeconds) {
      return { ok: false, error: "Token has expired", status: 401 };
    }
  }

  // 6. Check ban
  if (row.userBannedAt) {
    return { ok: false, error: "Account suspended", status: 403 };
  }

  // 7. Parse scopes
  let scopes: string[];
  try {
    scopes = JSON.parse(row.tokenScopes) as string[];
  } catch {
    return { ok: false, error: "Malformed token scopes", status: 401 };
  }

  // 8. Validate scopes still match user's current role
  //    (user may have been demoted since token creation)
  const scopeCheck = validateScopesForRole(scopes, row.userRole);
  if (!scopeCheck.valid) {
    // Filter down to only scopes the user still qualifies for.
    // We don't reject the request outright — we just narrow the effective scopes.
    scopes = scopes.filter((s) => !scopeCheck.invalidScopes.includes(s));
    if (scopes.length === 0) {
      return {
        ok: false,
        error: "Token scopes exceed current role permissions",
        status: 403,
      };
    }
  }

  // 9. Build user object matching App.Locals.user shape
  const authUser: PATUser = {
    id: row.userId,
    name: row.userName,
    email: row.userEmail,
    emailVerified: row.userEmailVerified,
    image: row.userImage ?? null,
    role: row.userRole ?? "member",
    bio: row.userBio ?? null,
    createdAt: row.userCreatedAt,
    updatedAt: row.userUpdatedAt,
    acceptedBuildCount: row.userAcceptedBuildCount,
    firstBuildPublishedAt: row.userFirstBuildPublishedAt ?? null,
    isModNominated: row.userIsModNominated,
    modNominatedBy: row.userModNominatedBy ?? null,
    modNominatedAt: row.userModNominatedAt ?? null,
    bannedAt: row.userBannedAt ?? null,
    bannedBy: row.userBannedBy ?? null,
    banReason: row.userBanReason ?? null,
  };

  return { ok: true, user: authUser, scopes, tokenId: row.tokenId };
}

// ---------------------------------------------------------------------------
// last_used_at update (non-blocking)
// ---------------------------------------------------------------------------

/**
 * Update the `last_used_at` timestamp on a token.
 * Intended to be called via `waitUntil()` so it doesn't block the response.
 */
export async function updateTokenLastUsed(
  db: DrizzleClient,
  tokenId: string
): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  await db
    .update(personalAccessTokens)
    .set({ lastUsedAt: nowSeconds })
    .where(eq(personalAccessTokens.id, tokenId));
}

// ---------------------------------------------------------------------------
// Usage logging
// ---------------------------------------------------------------------------

/**
 * Log a PAT-authenticated API request for audit purposes.
 * Intended to be called via `waitUntil()` so it doesn't block the response.
 */
export async function logTokenUsage(
  db: DrizzleClient,
  params: {
    tokenId: string;
    userId: string;
    method: string;
    path: string;
    statusCode: number;
    ipAddress: string | null;
    userAgent: string | null;
  }
): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  await db.insert(patUsageLogs).values({
    id: crypto.randomUUID(),
    tokenId: params.tokenId,
    userId: params.userId,
    method: params.method,
    path: params.path,
    statusCode: params.statusCode,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    createdAt: nowSeconds,
  });
}

// ---------------------------------------------------------------------------
// Scope enforcement helper for API routes (Option B — explicit check)
// ---------------------------------------------------------------------------

/**
 * Check that the current request has the required scope.
 * Returns `null` if the check passes, or a 403 Response if it fails.
 *
 * For session-authenticated requests (no `tokenScopes`), this is a no-op
 * — session auth has full access and scopes don't apply.
 *
 * Usage in API routes:
 * ```ts
 * const scopeError = requireScope(locals, "wiki:write");
 * if (scopeError) return scopeError;
 * ```
 */
export function requireScope(
  locals: { tokenScopes?: string[] },
  requiredScope: TokenScope
): Response | null {
  // Session auth — no scope restrictions
  if (!locals.tokenScopes) return null;

  if (!hasScope(locals.tokenScopes, requiredScope)) {
    return new Response(
      JSON.stringify({
        error: "Insufficient token scope",
        required: requiredScope,
        granted: locals.tokenScopes,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return null;
}
