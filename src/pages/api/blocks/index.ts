/**
 * API route for user blocks.
 *
 * GET  — List the current user's blocked users (with display details).
 * POST — Create a new block.
 *        Body: { blockedId: string }
 *        Validates: not self, not duplicate, target exists,
 *        target is not mod/admin (returns 400 with redirect hint).
 */

import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { user } from "../../../db/auth-schema";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES, getRoleLevel } from "../../../lib/roles";
import {
  createBlock,
  hasBlocked,
  getBlockedUsersWithDetails,
} from "../../../lib/blocking";

export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user: authedUser } = authResult;

  const blocks = await getBlockedUsersWithDetails(db, authedUser.id);

  return new Response(JSON.stringify(blocks), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user: authedUser } = authResult;

  try {
    const body = await ctx.request.json();
    const { blockedId } = body;

    // Validate required field
    if (!blockedId || typeof blockedId !== "string") {
      return new Response(
        JSON.stringify({ error: "blockedId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cannot block yourself
    if (blockedId === authedUser.id) {
      return new Response(
        JSON.stringify({ error: "You cannot block yourself" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check target user exists
    const targetUsers = await db
      .select({ id: user.id, name: user.name, role: user.role })
      .from(user)
      .where(eq(user.id, blockedId))
      .limit(1);

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const targetUser = targetUsers[0];

    // Check if target is a moderator or admin — redirect to mod-report endpoint
    if (getRoleLevel(targetUser.role) >= ROLES.MODERATOR) {
      return new Response(
        JSON.stringify({
          error: "mod_or_admin",
          message:
            "Use /api/blocks/mod-report for moderators and admins",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for existing block (duplicate prevention)
    const alreadyBlocked = await hasBlocked(db, authedUser.id, blockedId);
    if (alreadyBlocked) {
      return new Response(
        JSON.stringify({ error: "You have already blocked this user" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create the block
    const { id: blockId } = await createBlock(db, authedUser.id, blockedId);

    return new Response(
      JSON.stringify({ success: true, blockId }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[blocks] Error creating block:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
