// @ts-nocheck
/**
 * Site-wide middleware to check authentication session
 * and populate Astro.locals.user for all routes.
 */

import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  // Initialize user as undefined (not logged in)
  locals.user = undefined;

  // Check for session cookie
  const cookies = request.headers.get("cookie");
  if (!cookies) {
    return next();
  }

  // Parse session cookie - EmDash uses a session cookie
  const sessionMatch = cookies.match(/session=([^;]+)/);
  if (!sessionMatch) {
    return next();
  }

  // Fetch user from session via EmDash API
  try {
    const response = await fetch(new URL("/_emdash/api/auth/me", request.url), {
      headers: {
        Cookie: `session=${sessionMatch[1]}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.user) {
        locals.user = data.user;
      }
    }
  } catch (error) {
    console.error("Failed to fetch user session:", error);
  }

  return next();
});
