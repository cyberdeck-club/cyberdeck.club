/**
 * Site-wide middleware for authentication (session + PAT).
 *
 * CRITICAL: getAuth() and getDb() MUST be called per-request.
 * Module-level singletons cause SQLite WAL-lock hangs in local dev.
 *
 * In @astrojs/cloudflare v13 / Astro v6, Workers env bindings are accessed via
 * `import { env } from "cloudflare:workers"` — ctx.locals.runtime.env is gone.
 *
 * PAT authentication flow:
 *   1. Check for `Authorization: Bearer cdc_...` header
 *   2. If present, validate the PAT and set locals (user, scopes, tokenId)
 *   3. Enforce scope permissions via route-to-scope mapping
 *   4. Block session-only paths (token management, auth changes)
 *   5. Log usage non-blocking via waitUntil()
 *   6. If no Bearer header, fall through to existing session cookie auth
 */

import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { getAuth } from "./lib/auth";
import { getDb } from "./db/client";
import {
  validatePATRequest,
  updateTokenLastUsed,
  logTokenUsage,
} from "./lib/pat-auth";
import { getRequiredScope, hasScope } from "./lib/token-scopes";

// ---------------------------------------------------------------------------
// Session-only paths — PAT auth is BLOCKED for these routes.
// Token management must go through session auth to prevent token-creates-token
// chains. Auth endpoints are session-only by nature.
// ---------------------------------------------------------------------------

const SESSION_ONLY_PATHS = [
  /^\/api\/tokens(\/|$)/,         // Token CRUD — session only
  /^\/api\/auth(\/|$)/,           // Auth endpoints (magic link, session)
];

function isSessionOnlyPath(path: string): boolean {
  return SESSION_ONLY_PATHS.some((pattern) => pattern.test(path));
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export const onRequest = defineMiddleware(async (ctx, next) => {
  // Create per-request auth and db instances using the Workers env binding
  const cfEnv = env as App.Env;
  const auth = getAuth(cfEnv);
  const db = getDb(cfEnv);

  // Make db available to pages via Astro.locals
  ctx.locals.db = db;

  // -------------------------------------------------------------------------
  // PAT authentication path
  // -------------------------------------------------------------------------
  const authHeader = ctx.request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer cdc_")) {
    const requestPath = new URL(ctx.request.url).pathname;

    // Block PAT auth on session-only paths
    if (isSessionOnlyPath(requestPath)) {
      return new Response(
        JSON.stringify({
          error: "This endpoint requires session authentication. PAT auth is not allowed.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate the PAT
    const patResult = await validatePATRequest(db, authHeader);

    if (!patResult.ok) {
      return new Response(
        JSON.stringify({ error: patResult.error }),
        { status: patResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check scope permissions for this route
    const requiredScope = getRequiredScope(ctx.request.method, requestPath);
    if (requiredScope && !hasScope(patResult.scopes, requiredScope)) {
      return new Response(
        JSON.stringify({
          error: "Insufficient token scope",
          required: requiredScope,
          granted: patResult.scopes,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Set locals — make the PAT user "look" like a session user
    // plus PAT-specific fields for downstream code
    ctx.locals.user = patResult.user as App.Locals["user"];
    ctx.locals.session = null;
    ctx.locals.isPATAuth = true;
    ctx.locals.patScopes = patResult.scopes;
    ctx.locals.patTokenId = patResult.tokenId;

    // Process the request
    const response = await next();

    // Non-blocking: update last_used_at and log usage after response
    // Use waitUntil if available (Cloudflare Workers ExecutionContext)
    const execCtx = ctx.locals.cfContext;
    if (execCtx?.waitUntil) {
      execCtx.waitUntil(
        Promise.all([
          updateTokenLastUsed(db, patResult.tokenId),
          logTokenUsage(db, {
            tokenId: patResult.tokenId,
            userId: patResult.user.id,
            method: ctx.request.method,
            path: requestPath,
            statusCode: response.status,
            ipAddress: ctx.request.headers.get("CF-Connecting-IP"),
            userAgent: ctx.request.headers.get("User-Agent"),
          }),
        ])
      );
    } else {
      // No waitUntil available (e.g. local dev) — fire and forget
      void Promise.all([
        updateTokenLastUsed(db, patResult.tokenId),
        logTokenUsage(db, {
          tokenId: patResult.tokenId,
          userId: patResult.user.id,
          method: ctx.request.method,
          path: requestPath,
          statusCode: response.status,
          ipAddress: ctx.request.headers.get("CF-Connecting-IP"),
          userAgent: ctx.request.headers.get("User-Agent"),
        }),
      ]).catch((err) => {
        console.error("[pat-auth] Failed to log token usage:", err);
      });
    }

    return response;
  }

  // -------------------------------------------------------------------------
  // Session cookie authentication path (existing flow, unchanged)
  // -------------------------------------------------------------------------
  const sessionData = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (sessionData) {
    ctx.locals.user = sessionData.user;
    ctx.locals.session = sessionData.session;
  } else {
    ctx.locals.user = null;
    ctx.locals.session = null;
  }

  return next();
});
