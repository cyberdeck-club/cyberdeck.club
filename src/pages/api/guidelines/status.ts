/**
 * GET /api/guidelines/status
 *
 * Returns the current user's guidelines acceptance status.
 * Requires authenticated user.
 */

import type { APIRoute } from "astro";
import { getGuidelinesStatus } from "../../../lib/guidelines";

export const GET: APIRoute = async ({ locals, request }) => {
  // Check authentication
  if (!locals.user || !locals.db) {
    return new Response(
      JSON.stringify({ error: "authentication_required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const status = await getGuidelinesStatus(locals.db, locals.user.id);

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[guidelines/status] Error:", error);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};