import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import { user } from "../../../db/auth-schema";
import {
  deleteUserAccount,
  getOrCreateDeletedUser,
  sendAccountDeletionEmails,
} from "../../../lib/account-deletion";

/**
 * GET /api/users/me
 *
 * Returns the authenticated user's own profile.
 * Requires MEMBER role minimum.
 */
export const GET: APIRoute = async (ctx) => {
  // Require authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;

  const currentUser = authResult.user;
  const db = ctx.locals.db;

  try {
    // Fetch the user's profile
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        bio: user.bio,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .limit(1);

    if (users.length === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(users[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/users/me
 *
 * Updates the authenticated user's own profile.
 * Accepts: { name?: string, bio?: string, image?: string }
 * - name: non-empty string if provided
 * - bio: max 500 characters if provided
 * - image: valid URL if provided
 */
export const PATCH: APIRoute = async (ctx) => {
  // Require authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;

  const currentUser = authResult.user;
  const db = ctx.locals.db;

  // Parse request body
  let body: { name?: string; bio?: string; image?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name, bio, image } = body;

  // Build update object with validation
  const updates: { name?: string; bio?: string | null; image?: string | null } = {};

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "name must be a non-empty string" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (name.length > 200) {
      return new Response(
        JSON.stringify({ error: "name must be 200 characters or less" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.name = name.trim();
  }

  // Validate bio if provided
  if (bio !== undefined) {
    if (typeof bio !== "string") {
      return new Response(
        JSON.stringify({ error: "bio must be a string" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (bio.length > 500) {
      return new Response(
        JSON.stringify({ error: "bio must be 500 characters or less" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.bio = bio.trim() || null;
  }

  // Validate image URL if provided
  if (image !== undefined) {
    if (image !== null && image !== "") {
      if (typeof image !== "string") {
        return new Response(
          JSON.stringify({ error: "image must be a string URL" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      try {
        new URL(image);
      } catch {
        return new Response(
          JSON.stringify({ error: "image must be a valid URL" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      updates.image = image;
    } else {
      // Allow clearing image by passing empty string or null
      updates.image = null;
    }
  }

  // Check if there's anything to update
  if (Object.keys(updates).length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid fields to update" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Update the user record
    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, currentUser.id));

    // Fetch updated user (excluding sensitive fields)
    const updatedUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        bio: user.bio,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .limit(1);

    if (updatedUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found after update" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(updatedUsers[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update user profile:", err);
    return new Response(
      JSON.stringify({ error: "Failed to update profile" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/users/me
 *
 * Permanently deletes the authenticated user's own account.
 * All authored content is reassigned to the system [deleted] user
 * and scrubbed to '[deleted]'.
 *
 * Requires MEMBER role minimum.
 * Body: { "confirm": "DELETE MY ACCOUNT" }
 */
export const DELETE: APIRoute = async (ctx) => {
  // Require authentication — any member can delete their own account
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;

  const currentUser = authResult.user;
  const db = ctx.locals.db;

  // Parse and validate confirmation body
  let body: Record<string, unknown>;
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.confirm !== "DELETE MY ACCOUNT") {
    return new Response(
      JSON.stringify({
        error: 'Confirmation required: body must include { "confirm": "DELETE MY ACCOUNT" }',
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Capture user details BEFORE deletion (record is removed during deletion)
    const userEmail = currentUser.email as string;
    const userName = currentUser.name as string;

    // Get or create the system [deleted] user
    const deletedUserId = await getOrCreateDeletedUser(db);

    // Perform the account deletion (reassign + scrub + delete)
    const result = await deleteUserAccount(db, currentUser.id, deletedUserId);

    // Fire-and-forget: send deletion notification emails
    const cfEnv = env as App.Env;
    const resendApiKey = cfEnv.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? "";
    const fromAddress = cfEnv.EMAIL_FROM
      ?? cfEnv.RESEND_FROM_ADDRESS
      ?? import.meta.env.RESEND_FROM_ADDRESS
      ?? "cyberdeck.club <noreply@cyberdeck.club>";
    const adminEmail = (cfEnv.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? "").toLowerCase().trim();

    if (resendApiKey) {
      void sendAccountDeletionEmails({
        resendApiKey,
        fromAddress,
        deletedUserEmail: userEmail,
        deletedUserName: userName,
        adminEmail,
        deletedBy: "self",
      }).catch((err) => {
        console.error("[account-deletion] Email notification failed:", err);
      });
    }

    // Session cleanup happens via cascade when user row is deleted
    return new Response(
      JSON.stringify({ success: true, reassigned: result.reassigned }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to delete user account:", err);
    return new Response(
      JSON.stringify({ error: "Failed to delete account" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
