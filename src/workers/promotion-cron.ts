/**
 * Promotion Cron Worker
 * 
 * Cloudflare Scheduled Worker that runs daily as a safety net for
 * automatic role promotions:
 * 
 * 1. Member → Maker: After first build is published for 7+ days
 * 2. Maker → Trusted Maker: After 3+ builds are published
 * 
 * NOTE: This file uses raw types for Cloudflare Workers environment.
 * The @cloudflare/workers-types package provides the full type definitions.
 * 
 * TODO: Wire up in wrangler.jsonc with a separate worker configuration
 * or via the Astro adapter's scheduled handler approach for Cloudflare Pages.
 */

interface Env {
  DB: {
    prepare(sql: string): {
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export default {
  /**
   * Runs on a schedule (configured in wrangler.jsonc)
   * Daily at 6:00 AM UTC is recommended: triggers = [{ type: "schedule", cron: "0 6 * * *" }]
   */
  async scheduled(controller: ScheduledController, env: Env, _ctx: { waitUntil(promise: Promise<void>): void }): Promise<void> {
    console.log(`[PromotionCron] Running at ${new Date(controller.scheduledTime).toISOString()}`);

    let memberToMakerPromotions = 0;
    let makerToTrustedMakerPromotions = 0;

    try {
      // 1. Member → Maker promotion
      // Find members whose first build was published 7+ days ago and aren't banned
      const memberResult = await env.DB
        .prepare(`
          UPDATE users
          SET role = 'maker'
          WHERE role = 'member'
            AND first_build_published_at IS NOT NULL
            AND datetime(first_build_published_at) <= datetime('now', '-7 days')
            AND banned_at IS NULL
        `)
        .run();

      memberToMakerPromotions = memberResult.meta?.changes ?? 0;

      // 2. Maker → Trusted Maker promotion
      // Find makers with 3+ accepted builds who aren't banned
      const trustedResult = await env.DB
        .prepare(`
          UPDATE users
          SET role = 'trusted_maker'
          WHERE role = 'maker'
            AND accepted_build_count >= 3
            AND banned_at IS NULL
        `)
        .run();

      makerToTrustedMakerPromotions = trustedResult.meta?.changes ?? 0;

      console.log(
        `[PromotionCron] Completed. ` +
        `Member→Maker: ${memberToMakerPromotions}, ` +
        `Maker→TrustedMaker: ${makerToTrustedMakerPromotions}`
      );
    } catch (error) {
      console.error("[PromotionCron] Error during promotion check:", error);
      // Don't throw - let the cron continue and retry next run
    }
  }
};