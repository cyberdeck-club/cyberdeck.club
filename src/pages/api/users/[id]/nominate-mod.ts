import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { ROLES, requireRole, getRoleLevel } from "../../../../lib/roles";

/**
 * POST /api/users/[id]/nominate-mod
 *
 * Allows a trusted maker to nominate a user for moderator.
 * Requires TRUSTED_MAKER role (30).
 *
 * Steps:
 * 1. Validate the target user exists
 * 2. Verify target user is at least a MAKER (role >= MAKER level)
 * 3. Check target is not already a moderator or admin
 * 4. Set nomination fields on the target user
 * 5. Return success
 *
 * Edge cases:
 * - Cannot nominate yourself
 * - Cannot nominate someone already a moderator or admin
 * - Target must exist and not be banned
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userRole = ctx.locals.user.role;
  const nominatorId = ctx.locals.user.id;

  // Require TRUSTED_MAKER role minimum
  if (!requireRole(userRole, ROLES.TRUSTED_MAKER)) {
    return new Response(
      JSON.stringify({ error: "Insufficient permissions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get target user ID from URL params
  const targetUserId = ctx.params.id;
  if (!targetUserId || typeof targetUserId !== "string") {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cannot nominate yourself
  if (targetUserId === nominatorId) {
    return new Response(
      JSON.stringify({ error: "You cannot nominate yourself" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const db = ctx.locals.db;

  // Fetch the target user
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      role: schema.user.role,
      bannedAt: schema.user.bannedAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1);

  if (users.length === 0) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const targetUser = users[0];

  // Check if user is banned
  if (targetUser.bannedAt) {
    return new Response(
      JSON.stringify({ error: "This user is not available for nomination" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Verify target user is at least a MAKER
  const targetRoleLevel = getRoleLevel(targetUser.role);
  if (targetRoleLevel < ROLES.MAKER) {
    return new Response(
      JSON.stringify({
        error: "Cannot nominate this user",
        message: "Only makers, trusted makers, moderators, and admins can be nominated for moderator",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check target is not already a moderator or admin
  if (targetRoleLevel >= ROLES.MODERATOR) {
    return new Response(
      JSON.stringify({
        error: "Cannot nominate this user",
        message: "This user already has moderator or admin privileges",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const now = new Date().toISOString();

  try {
    // Update the user with nomination fields
    await db
      .update(schema.user)
      .set({
        isModNominated: true,
        modNominatedBy: nominatorId,
        modNominatedAt: now,
      })
      .where(eq(schema.user.id, targetUserId));

    return new Response(
      JSON.stringify({
        success: true,
        message: `${targetUser.name} has been nominated for moderator`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to nominate user:", err);
    return new Response(
      JSON.stringify({ error: "Failed to nominate user" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
