import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import * as schema from "../../../../../db/schema";
import { requireAuth } from "../../../../../lib/require-auth";
import { ROLES } from "../../../../../lib/roles";
import {
  deleteUserAccount,
  getOrCreateDeletedUser,
  sendAccountDeletionEmails,
} from "../../../../../lib/account-deletion";

/**
 * POST /api/admin/users/[id]/delete
 *
 * Permanently deletes a user account (admin only).
 * All authored content is reassigned to the system [deleted] user
 * and scrubbed to '[deleted]'.
 *
 * Requires ADMIN role.
 * Body: { "confirm": "DELETE ACCOUNT" }
 */
export const POST: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  // Get target user ID from URL params
  const targetUserId = ctx.params.id;
  if (!targetUserId || typeof targetUserId !== "string") {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Prevent admin from deleting themselves
  if (targetUserId === ctx.locals.user?.id) {
    return new Response(
      JSON.stringify({ error: "Cannot delete your own account via admin endpoint" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const db = ctx.locals.db;

  // Verify target user exists and capture details before deletion
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
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

  if (body.confirm !== "DELETE ACCOUNT") {
    return new Response(
      JSON.stringify({
        error: 'Confirmation required: body must include { "confirm": "DELETE ACCOUNT" }',
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate optional admin note
  const adminNote = body.note;
  if (adminNote !== undefined) {
    if (typeof adminNote !== "string") {
      return new Response(
        JSON.stringify({ error: "Note must be a string" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (adminNote.length > 500) {
      return new Response(
        JSON.stringify({ error: "Note must be 500 characters or fewer" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // Capture target user details BEFORE deletion
    const targetUser = users[0];

    // Get or create the system [deleted] user
    const deletedUserId = await getOrCreateDeletedUser(db);

    // Perform the account deletion (reassign + scrub + delete)
    const result = await deleteUserAccount(db, targetUserId, deletedUserId);

    // Fire-and-forget: send deletion notification emails
    const cfEnv = env as App.Env;
    const resendApiKey = cfEnv.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? "";
    const fromAddress = cfEnv.EMAIL_FROM
      ?? cfEnv.RESEND_FROM_ADDRESS
      ?? import.meta.env.RESEND_FROM_ADDRESS
      ?? "cyberdeck.club <noreply@cyberdeck.club>";
    const adminEmail = (cfEnv.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? "").toLowerCase().trim();

    if (resendApiKey) {
      try {
        await sendAccountDeletionEmails({
          resendApiKey,
          fromAddress,
          deletedUserEmail: targetUser.email,
          deletedUserName: targetUser.name,
          adminEmail,
          deletedBy: "admin",
          adminName: ctx.locals.user?.name ?? undefined,
          adminNote: typeof adminNote === "string" ? adminNote.trim() || undefined : undefined,
        });
      } catch (err) {
        console.error("[account-deletion] Email notification failed:", err);
      }
    }

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
