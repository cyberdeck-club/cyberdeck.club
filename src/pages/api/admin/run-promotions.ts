/**
 * POST /api/admin/run-promotions
 *
 * Admin-only endpoint to manually trigger batch role promotions.
 * Useful for running promotions on-demand outside the cron schedule.
 *
 * Requires admin role (via session or PAT auth).
 */

import type { APIRoute } from "astro";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import { runBatchPromotions } from "../../../lib/batch-promotion";

export const POST: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  const db = ctx.locals.db;

  try {
    const result = await runBatchPromotions(db);

    const hasErrors = result.errors.length > 0;

    return new Response(
      JSON.stringify({
        ok: !hasErrors,
        ...result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: hasErrors ? 207 : 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin/run-promotions] Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: "Batch promotion failed", details: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
