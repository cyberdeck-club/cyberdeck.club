import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import * as schema from "../../../../db/schema";
import { ROLES, requireRole } from "../../../../lib/roles";

/**
 * POST /api/admin/nominations/[id]
 *
 * Admin action on a moderator nomination.
 * Requires ADMIN role (50).
 *
 * Body: { action: 'appoint' | 'dismiss' }
 *
 * On APPOINT:
 *   1. Set user role to 'moderator'
 *   2. Clear nomination fields
 *
 * On DISMISS:
 *   1. Clear nomination fields only — do NOT change role
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

  // Require ADMIN role
  if (!requireRole(userRole, ROLES.ADMIN)) {
    return new Response(
      JSON.stringify({ error: "Insufficient permissions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get nomination/user ID from URL params
  const userId = ctx.params.id;
  if (!userId || typeof userId !== "string") {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;

  // Parse and validate request body
  let body: { action?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action } = body;

  if (!action || !["appoint", "dismiss"].includes(action)) {
    return new Response(
      JSON.stringify({ error: "action must be 'appoint' or 'dismiss'" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Fetch the user to verify they exist and are nominated
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      role: schema.user.role,
      isModNominated: schema.user.isModNominated,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (users.length === 0) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const targetUser = users[0];

  if (!targetUser.isModNominated) {
    return new Response(
      JSON.stringify({ error: "This user is not currently nominated" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    if (action === "appoint") {
      // Appoint as moderator: set role to 'moderator' and clear nomination fields
      await db
        .update(schema.user)
        .set({
          role: "moderator",
          isModNominated: false,
          modNominatedBy: null,
          modNominatedAt: null,
        })
        .where(eq(schema.user.id, userId));

      return new Response(
        JSON.stringify({
          success: true,
          message: `${targetUser.name} has been appointed as moderator`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Dismiss: clear nomination fields only, do NOT change role
      await db
        .update(schema.user)
        .set({
          isModNominated: false,
          modNominatedBy: null,
          modNominatedAt: null,
        })
        .where(eq(schema.user.id, userId));

      return new Response(
        JSON.stringify({
          success: true,
          message: `Nomination for ${targetUser.name} has been dismissed`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (err) {
    console.error("Failed to process nomination:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process nomination" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
