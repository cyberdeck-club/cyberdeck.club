/**
 * Batch role promotion logic for cyberdeck.club.
 *
 * Runs bulk promotion queries via Drizzle ORM for all eligible users.
 * Called by the cron endpoint and the admin manual trigger.
 *
 * Promotion paths (same rules as per-user promotion in promotion.ts):
 *   member → maker:         first build published ≥ 7 days ago, not banned
 *   maker → trusted_maker:  3+ accepted builds, not banned
 *
 * NEVER promotes to moderator or admin — those require human action.
 */

import { eq, and, isNull, lte, gte, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export type BatchPromotionResult = {
  membersPromoted: number;
  makersPromoted: number;
  errors: string[];
};

/**
 * Run batch promotions for all eligible users.
 *
 * @param db - Drizzle D1 database instance
 * @returns Counts of promotions applied and any errors encountered
 */
export async function runBatchPromotions(
  db: DrizzleD1Database<typeof schema>
): Promise<BatchPromotionResult> {
  const result: BatchPromotionResult = {
    membersPromoted: 0,
    makersPromoted: 0,
    errors: [],
  };

  // ── Member → Maker ──────────────────────────────────────────────────
  // Eligible: role = 'member', firstBuildPublishedAt ≥ 7 days ago, not banned
  try {
    // Calculate the cutoff date: 7 days ago from now
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cutoffISO = sevenDaysAgo.toISOString();

    const memberUpdates = await db
      .update(schema.user)
      .set({ role: "maker" })
      .where(
        and(
          eq(schema.user.role, "member"),
          isNull(schema.user.bannedAt),
          // firstBuildPublishedAt must be set (not null) and ≤ cutoff
          // ISO 8601 strings compare lexicographically correctly
          lte(schema.user.firstBuildPublishedAt, cutoffISO),
          sql`${schema.user.firstBuildPublishedAt} IS NOT NULL`
        )
      )
      .returning({ id: schema.user.id });

    result.membersPromoted = memberUpdates.length;

    if (memberUpdates.length > 0) {
      console.log(
        `[batch-promotion] Member→Maker: promoted ${memberUpdates.length} user(s)`
      );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during Member→Maker promotion";
    console.error("[batch-promotion] Member→Maker error:", message);
    result.errors.push(`Member→Maker: ${message}`);
  }

  // ── Maker → Trusted Maker ──────────────────────────────────────────
  // Eligible: role = 'maker', acceptedBuildCount >= 3, not banned
  try {
    const makerUpdates = await db
      .update(schema.user)
      .set({ role: "trusted_maker" })
      .where(
        and(
          eq(schema.user.role, "maker"),
          isNull(schema.user.bannedAt),
          gte(schema.user.acceptedBuildCount, 3)
        )
      )
      .returning({ id: schema.user.id });

    result.makersPromoted = makerUpdates.length;

    if (makerUpdates.length > 0) {
      console.log(
        `[batch-promotion] Maker→TrustedMaker: promoted ${makerUpdates.length} user(s)`
      );
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error during Maker→TrustedMaker promotion";
    console.error("[batch-promotion] Maker→TrustedMaker error:", message);
    result.errors.push(`Maker→TrustedMaker: ${message}`);
  }

  console.log(
    `[batch-promotion] Complete. Member→Maker: ${result.membersPromoted}, Maker→TrustedMaker: ${result.makersPromoted}, errors: ${result.errors.length}`
  );

  return result;
}
