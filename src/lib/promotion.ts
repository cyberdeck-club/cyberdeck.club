/**
 * Automatic role promotion logic for cyberdeck.club.
 *
 * This module handles automatic role promotions based on user activity.
 *
 * Promotion paths:
 *   member → maker: first build published ≥ 7 days ago
 *   maker → trusted_maker: 3+ accepted builds
 *
 * NEVER promotes to moderator or admin — those require human action.
 */

import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export type PromotionResult = {
  promoted: boolean;
  previousRole?: string;
  newRole?: string;
};

/**
 * Check if a user qualifies for automatic role promotion and apply it.
 *
 * Promotion rules:
 * - member → maker: first published build was ≥ 7 days ago
 * - maker → trusted_maker: acceptedBuildCount >= 3
 *
 * This function only promotes one step at a time.
 * A member with 3 builds will first become a maker, then trusted_maker
 * on the next promotion check (e.g., after their next build approval).
 */
export async function checkAndPromoteUser(
  db: DrizzleD1Database<typeof schema>,
  userId: string
): Promise<PromotionResult> {
  // Fetch user from DB
  const users = await db
    .select({
      id: schema.user.id,
      role: schema.user.role,
      acceptedBuildCount: schema.user.acceptedBuildCount,
      firstBuildPublishedAt: schema.user.firstBuildPublishedAt,
      bannedAt: schema.user.bannedAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (users.length === 0) {
    return { promoted: false };
  }

  const user = users[0];

  // If banned, no promotion
  if (user.bannedAt) {
    return { promoted: false };
  }

  const currentRole = user.role ?? "member";

  // Helper to update role
  const updateRole = async (newRole: string) => {
    await db
      .update(schema.user)
      .set({ role: newRole })
      .where(eq(schema.user.id, userId));
  };

  // Member → Maker: first build published ≥ 7 days ago
  if (currentRole === "member" && user.firstBuildPublishedAt) {
    const firstPublished = new Date(user.firstBuildPublishedAt);
    const now = new Date();
    const daysSincePublished = Math.floor(
      (now.getTime() - firstPublished.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePublished >= 7) {
      await updateRole("maker");
      return {
        promoted: true,
        previousRole: "member",
        newRole: "maker",
      };
    }
  }

  // Maker → Trusted Maker: 3+ accepted builds
  if (currentRole === "maker" && user.acceptedBuildCount >= 3) {
    await updateRole("trusted_maker");
    return {
      promoted: true,
      previousRole: "maker",
      newRole: "trusted_maker",
    };
  }

  return { promoted: false };
}
