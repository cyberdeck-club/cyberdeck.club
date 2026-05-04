/**
 * GET /api/admin/beta
 *
 * List beta signup requests.
 * Requires admin role.
 * Optional query param: ?status=pending
 */

import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import { betaSignups } from "../../../../db/schema";
import { ROLES } from "../../../../lib/roles";
import { requireAuth } from "../../../../lib/require-auth";

export const GET: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  const db = ctx.locals.db;
  if (!db) {
    return new Response(JSON.stringify({ error: "Database not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(ctx.request.url);
  const statusFilter = url.searchParams.get("status");

  try {
    let query = db.select().from(betaSignups);

    // Apply status filter if provided
    if (statusFilter && ["pending", "approved", "rejected", "waitlisted"].includes(statusFilter)) {
      query = query.where(eq(betaSignups.status, statusFilter)) as typeof query;
    }

    // Order by requestedAt desc
    const signups = await query.orderBy(desc(betaSignups.requestedAt));

    return new Response(JSON.stringify({ signups }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[admin/beta] Failed to list signups:", err);
    return new Response(JSON.stringify({ error: "Failed to list signups" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};