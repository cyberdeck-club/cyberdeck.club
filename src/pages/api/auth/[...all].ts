import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getAuth } from "../../../lib/auth";

/**
 * Better Auth catch-all API handler.
 *
 * All Better Auth routes (sign-in, sign-out, magic-link verify, etc.)
 * are handled by this single file via Astro's [...all] route catch-all.
 *
 * In @astrojs/cloudflare v13, Workers env is accessed via
 * `import { env } from "cloudflare:workers"` — NOT ctx.locals.runtime.env.
 */

export const ALL: APIRoute = async (ctx) => {
  console.log('[Auth API] Received request:', ctx.request.method, ctx.request.url);
  const auth = getAuth(env as App.Env);
  return auth.handler(ctx.request);
};

export const prerender = false;
