// @ts-nocheck
/**
 * Site-wide middleware.
 *
 * EmDash's built-in auth middleware already resolves the session cookie
 * and populates `Astro.locals.user` on every request.  A previous version
 * of this file made a loopback fetch to `/_emdash/api/auth/me`, which
 * triggered the middleware recursively on every request — creating an
 * infinite loop that broke the admin panel (and any authenticated route).
 *
 * This file is kept as a pass-through so Astro doesn't fall back to its
 * default middleware.  Add any custom per-request logic here; just avoid
 * making HTTP calls back to the same server.
 */

import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (ctx, next) => {
  const response = await next();

  // EmDash's magic link verify endpoint defaults to redirecting to
  // /_emdash/admin after login. For the public site, we want users
  // to land on the homepage instead (admins can still navigate to admin).
  if (
    ctx.url.pathname === "/_emdash/api/auth/magic-link/verify" &&
    response.status >= 300 &&
    response.status < 400
  ) {
    const location = response.headers.get("location");
    if (location === "/_emdash/admin" || location === "/_emdash/admin/") {
      return ctx.redirect("/");
    }
  }

  return response;
});
