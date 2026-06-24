/**
 * API route for unread notification count.
 *
 * GET — Returns the current user's unread notification count (for badge display).
 */

import type { APIRoute } from "astro";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import { getUnreadCount } from "../../../lib/notifications";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const count = await getUnreadCount(db, user.id);

    return new Response(JSON.stringify({ count }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notifications] Error getting unread count:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
