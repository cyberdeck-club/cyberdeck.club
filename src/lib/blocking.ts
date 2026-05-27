/**
 * User blocking/muting library.
 *
 * Provides functions for creating, removing, and querying user blocks.
 * Blocks are bidirectional for content filtering — if A blocks B,
 * neither A nor B sees the other's content.
 */

import { eq, and, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { user } from "../db/auth-schema";
import { getResend } from "./resend";

/**
 * Get all user IDs that should be filtered out for a given user.
 * Bidirectional — includes users the given user blocked AND users who blocked them.
 */
export async function getBlockedUserIds(
  db: DrizzleD1Database<typeof schema>,
  userId: string
): Promise<string[]> {
  const blocks = await db
    .select({
      blockerId: schema.userBlocks.blockerId,
      blockedId: schema.userBlocks.blockedId,
    })
    .from(schema.userBlocks)
    .where(
      or(
        eq(schema.userBlocks.blockerId, userId),
        eq(schema.userBlocks.blockedId, userId)
      )
    );

  const ids = new Set<string>();
  for (const block of blocks) {
    if (block.blockerId === userId) ids.add(block.blockedId);
    else ids.add(block.blockerId);
  }
  return Array.from(ids);
}

/**
 * Check if a block relationship exists between two users (bidirectional).
 * Returns true if either user has blocked the other.
 */
export async function isBlocked(
  db: DrizzleD1Database<typeof schema>,
  userA: string,
  userB: string
): Promise<boolean> {
  const block = await db
    .select({ id: schema.userBlocks.id })
    .from(schema.userBlocks)
    .where(
      or(
        and(
          eq(schema.userBlocks.blockerId, userA),
          eq(schema.userBlocks.blockedId, userB)
        ),
        and(
          eq(schema.userBlocks.blockerId, userB),
          eq(schema.userBlocks.blockedId, userA)
        )
      )
    )
    .limit(1);
  return block.length > 0;
}

/**
 * Check if blockerId has specifically blocked blockedId (one-directional).
 */
export async function hasBlocked(
  db: DrizzleD1Database<typeof schema>,
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const block = await db
    .select({ id: schema.userBlocks.id })
    .from(schema.userBlocks)
    .where(
      and(
        eq(schema.userBlocks.blockerId, blockerId),
        eq(schema.userBlocks.blockedId, blockedId)
      )
    )
    .limit(1);
  return block.length > 0;
}

/**
 * Create a new block relationship.
 * Returns the newly created block ID.
 */
export async function createBlock(
  db: DrizzleD1Database<typeof schema>,
  blockerId: string,
  blockedId: string
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  await db.insert(schema.userBlocks).values({
    id,
    blockerId,
    blockedId,
    createdAt: Math.floor(Date.now() / 1000),
  });
  return { id };
}

/**
 * Remove a block. Only the original blocker can remove their own block.
 * Returns true if a row was matched (block existed and belonged to blocker).
 */
export async function removeBlock(
  db: DrizzleD1Database<typeof schema>,
  blockId: string,
  blockerId: string
): Promise<boolean> {
  const result = await db
    .delete(schema.userBlocks)
    .where(
      and(
        eq(schema.userBlocks.id, blockId),
        eq(schema.userBlocks.blockerId, blockerId)
      )
    );
  return true;
}

/**
 * Get the list of users blocked by a given user, with display details.
 * Used for the settings/blocked-users page.
 */
export async function getBlockedUsersWithDetails(
  db: DrizzleD1Database<typeof schema>,
  userId: string
) {
  const blocks = await db
    .select({
      blockId: schema.userBlocks.id,
      blockedId: schema.userBlocks.blockedId,
      blockedName: user.name,
      blockedAt: schema.userBlocks.createdAt,
    })
    .from(schema.userBlocks)
    .innerJoin(user, eq(schema.userBlocks.blockedId, user.id))
    .where(eq(schema.userBlocks.blockerId, userId));

  return blocks;
}

/**
 * Send an admin notification when someone attempts to block a mod/admin.
 * This alerts admins that a moderator or admin may be behaving inappropriately.
 */
export async function sendModBlockNotification(
  blockerName: string,
  targetName: string,
  targetRole: string,
  details: string | undefined,
  adminEmail: string,
  fromAddress: string
): Promise<void> {
  const resend = getResend();

  const detailsSection = details
    ? `<h3>Additional Details from Reporter</h3><p>${details
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")}</p>`
    : "<p><em>No additional details provided.</em></p>";

  await resend.emails.send({
    from: fromAddress,
    to: adminEmail,
    subject: `[cyberdeck.club] User attempted to block ${targetRole}: ${targetName}`,
    html: `
      <h2>Mod/Admin Block Attempt</h2>
      <p><strong>${blockerName}</strong> attempted to block <strong>${targetName}</strong> (${targetRole}).</p>
      <p>This may indicate the ${targetRole.toLowerCase()} is behaving inappropriately, or it may be a misunderstanding. Please investigate.</p>
      ${detailsSection}
      <p><em>Sent automatically by cyberdeck.club</em></p>
    `,
  });
}
