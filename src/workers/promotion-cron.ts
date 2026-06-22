/**
 * Promotion Cron Worker
 *
 * Standalone Cloudflare Scheduled Worker that triggers batch role promotions
 * by calling the cron endpoint with a shared secret.
 *
 * This Worker is a thin proxy — all promotion logic lives in
 * src/lib/batch-promotion.ts, called via the /api/cron/promotions endpoint.
 *
 * Configure in wrangler.jsonc (or a separate wrangler config for this worker)
 * with a cron trigger: triggers = { crons = ["0 6 * * *"] }
 *
 * Required env vars:
 *   - CRON_SECRET: shared secret matching the Pages app's CRON_SECRET
 *   - PROMOTION_ENDPOINT: full URL to the cron endpoint
 *     (e.g., https://cyberdeck.club/api/cron/promotions)
 */

interface Env {
  CRON_SECRET: string;
  PROMOTION_ENDPOINT: string;
}

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: { waitUntil(promise: Promise<unknown>): void }
  ): Promise<void> {
    const timestamp = new Date(controller.scheduledTime).toISOString();
    console.log(`[promotion-cron] Scheduled run at ${timestamp} (cron: ${controller.cron})`);

    if (!env.CRON_SECRET || !env.PROMOTION_ENDPOINT) {
      console.error(
        "[promotion-cron] Missing required env vars: CRON_SECRET and/or PROMOTION_ENDPOINT"
      );
      return;
    }

    ctx.waitUntil(
      (async () => {
        try {
          const response = await fetch(env.PROMOTION_ENDPOINT, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${env.CRON_SECRET}`,
              "Content-Type": "application/json",
            },
          });

          const body = await response.text();

          if (!response.ok && response.status !== 207) {
            console.error(
              `[promotion-cron] Endpoint returned ${response.status}: ${body}`
            );
            return;
          }

          console.log(`[promotion-cron] Success (${response.status}): ${body}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown fetch error";
          console.error(`[promotion-cron] Failed to call endpoint: ${message}`);
        }
      })()
    );
  },
};
