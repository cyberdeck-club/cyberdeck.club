/**
 * Community Guidelines acceptance helpers.
 *
 * Manages the guidelines gate that prevents users from publishing content
 * until they've read and accepted the community guidelines.
 */

import { eq, and, desc } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

/**
 * Current guidelines version - bump when guidelines change.
 * All users must re-accept when this version changes.
 */
export const CURRENT_GUIDELINES_VERSION = "1.0";

/**
 * Check if a user has accepted the current version of guidelines.
 *
 * @param db - Drizzle database instance
 * @param userId - The user's ID
 * @returns true if the user has accepted the current guidelines version
 */
export async function hasAcceptedGuidelines(
  db: DrizzleD1Database<typeof schema>,
  userId: string
): Promise<boolean> {
  const acceptance = await db.query.communityGuidelinesAcceptances.findFirst({
    where: and(
      eq(schema.communityGuidelinesAcceptances.userId, userId),
      eq(schema.communityGuidelinesAcceptances.version, CURRENT_GUIDELINES_VERSION)
    ),
  });

  return !!acceptance;
}

/**
 * Record a user's acceptance of the guidelines.
 *
 * @param db - Drizzle database instance
 * @param userId - The user's ID
 * @param options - Optional acceptance details
 * @param options.ipAddress - User's IP address for audit
 * @param options.turnstileToken - Turnstile token for verification audit
 */
export async function acceptGuidelines(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  options: { ipAddress?: string; turnstileToken?: string } = {}
): Promise<void> {
  const id = crypto.randomUUID();
  const acceptedAt = Date.now();

  await db.insert(schema.communityGuidelinesAcceptances).values({
    id,
    userId,
    version: CURRENT_GUIDELINES_VERSION,
    acceptedAt,
    ipAddress: options.ipAddress ?? null,
    turnstileToken: options.turnstileToken ?? null,
  });
}

/**
 * Get a user's guidelines acceptance status for admin views.
 *
 * @param db - Drizzle database instance
 * @param userId - The user's ID
 * @returns Acceptance status including version and timestamp if accepted
 */
export async function getGuidelinesStatus(
  db: DrizzleD1Database<typeof schema>,
  userId: string
): Promise<{ accepted: boolean; version?: string; acceptedAt?: string }> {
  // Check current version first
  const currentAcceptance = await db.query.communityGuidelinesAcceptances.findFirst({
    where: and(
      eq(schema.communityGuidelinesAcceptances.userId, userId),
      eq(schema.communityGuidelinesAcceptances.version, CURRENT_GUIDELINES_VERSION)
    ),
  });

  if (currentAcceptance) {
    return {
      accepted: true,
      version: currentAcceptance.version,
      acceptedAt: new Date(currentAcceptance.acceptedAt).toISOString(),
    };
  }

  // Check if they've accepted any version
  const latestAcceptance = await db.query.communityGuidelinesAcceptances.findFirst({
    where: eq(schema.communityGuidelinesAcceptances.userId, userId),
    orderBy: [desc(schema.communityGuidelinesAcceptances.acceptedAt)],
  });

  if (latestAcceptance) {
    return {
      accepted: false,
      version: latestAcceptance.version,
      acceptedAt: new Date(latestAcceptance.acceptedAt).toISOString(),
    };
  }

  return { accepted: false };
}