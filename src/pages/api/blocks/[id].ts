/**
 * API route for a single user block.
 *
 * DELETE — Remove a block (unblock a user).
 *          Only the original blocker can remove their own block.
 */

import type { APIRoute } from "astro";
import { eq, and } from "drizzle-orm";
import * as schema from "../../../db/schema";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import { removeBlock } from "../../../lib/blocking";

export const DELETE: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;
  const { id } = ctx.params;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (!id || typeof id !== "string") {
    return new Response(
      JSON.stringify({ error: "Block ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify block exists and belongs to this user
  const existing = await db
    .select({
      id: schema.userBlocks.id,
      blockerId: schema.userBlocks.blockerId,
    })
    .from(schema.userBlocks)
    .where(eq(schema.userBlocks.id, id))
    .limit(1);

  if (existing.length === 0) {
    return new Response(
      JSON.stringify({ error: "Block not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (existing[0].blockerId !== user.id) {
    return new Response(
      JSON.stringify({ error: "You can only remove your own blocks" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  await removeBlock(db, id, user.id);

  return new Response(
    JSON.stringify({ success: true, message: "Block removed" }),
    { headers: { "Content-Type": "application/json" } }
  );
};
