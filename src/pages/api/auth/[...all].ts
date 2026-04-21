import type { APIRoute } from "astro";
import { getAuth } from "../../../lib/auth";

/**
 * Better Auth catch-all API handler.
 *
 * All Better Auth routes (sign-in, sign-out, magic-link verify, etc.)
 * are handled by this single file via Astro's [...all] route catch-all.
 *
 * The handler delegates to auth.handler() which routes based on the request path.
 */

export const ALL: APIRoute = async (ctx) => {
  const auth = getAuth(ctx.locals as any);
  return auth.handler(ctx.request);
};

export const prerender = false;
