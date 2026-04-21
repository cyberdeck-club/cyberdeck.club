/**
 * Site-wide middleware for Better Auth session resolution.
 *
 * CRITICAL: getAuth() and getDb() MUST be called per-request.
 * Module-level singletons cause SQLite WAL-lock hangs in local dev.
 */

import { defineMiddleware } from "astro:middleware";
import { getAuth } from "./lib/auth";
import { getDb } from "./db/client";

export const onRequest = defineMiddleware(async (ctx, next) => {
  // Create per-request auth and db instances
  const auth = getAuth(ctx.locals as any);
  const db = getDb(ctx.locals as any);

  // Resolve session from cookie
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

  // Make db available to pages via Astro.locals
  ctx.locals.db = db;

  return next();
});
