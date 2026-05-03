import type { APIRoute } from "astro";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../../../../db/schema";
import { ROLES, requireRole } from "../../../../../lib/roles";
import { requireAuth } from "../../../../../lib/require-auth";

/**
 * PUT /api/admin/users/[id]/role
 *
 * Updates a user's role.
 * Requires admin role.
 *
 * Body: { role: 'member' | 'maker' | 'trusted_maker' | 'moderator' | 'admin' }
 */
export const PUT: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  // Get user ID from URL params
  const targetUserId = ctx.params.id;
  if (!targetUserId || typeof targetUserId !== "string") {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Prevent self-demotion
  if (targetUserId === ctx.locals.user?.id) {
    return new Response(
      JSON.stringify({ error: "Cannot change your own role" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse and validate request body
  let body: { role?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { role } = body;
  const validRoles = ["member", "maker", "trusted_maker", "moderator", "admin"];
  if (!role || typeof role !== "string" || !validRoles.includes(role)) {
    return new Response(
      JSON.stringify({
        error: `role must be one of: ${validRoles.join(", ")}`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const db = ctx.locals.db;

  // Check target user exists
  const users = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1);

  if (users.length === 0) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Better Auth additionalFields (role, bio) are stored in the user table but
    // the generated auth-schema.ts doesn't include them in the Drizzle column map.
    // Use a raw SQL statement to update the column directly.
    await db.run(sql`UPDATE "user" SET "role" = ${role} WHERE "id" = ${targetUserId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update user role:", err);
    return new Response(JSON.stringify({ error: "Failed to update role" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
