/**
 * GET /api/cron/promotions
 *
 * Cron-callable endpoint for batch role promotions.
 * Secured via a shared secret in the Authorization header.
 *
 * Called by:
 *   - Cloudflare Workers cron trigger (scheduled Worker fetches this endpoint)
 *   - External cron services (e.g., cron-job.org, GitHub Actions)
 *
 * Authorization: Bearer <CRON_SECRET>
 */

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { runBatchPromotions } from "../../../lib/batch-promotion";

export const GET: APIRoute = async (ctx) => {
  const cfEnv = env as App.Env;

  // Validate CRON_SECRET is configured
  const cronSecret = cfEnv.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/promotions] CRON_SECRET not configured in environment");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: CRON_SECRET not set" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate the Authorization header
  const authHeader = ctx.request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Run batch promotions using the DB from locals (set by middleware)
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
    console.error("[cron/promotions] Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: "Batch promotion failed", details: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
