/**
 * API route for reporting an attempt to block a moderator or admin.
 *
 * POST — Report a mod/admin block attempt.
 *        Body: { targetUserId: string, details?: string }
 *        Sends an email to the site admin for investigation.
 */

import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { user } from "../../../db/auth-schema";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES, getRoleLevel } from "../../../lib/roles";
import { sendModBlockNotification } from "../../../lib/blocking";

export const POST: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user: authedUser } = authResult;

  try {
    const body = await ctx.request.json();
    const { targetUserId, details } = body;

    // Validate required field
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(
        JSON.stringify({ error: "targetUserId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify target user exists
    const targetUsers = await db
      .select({ id: user.id, name: user.name, role: user.role })
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1);

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const targetUser = targetUsers[0];

    // Verify the target is actually a mod or admin
    if (getRoleLevel(targetUser.role) < ROLES.MODERATOR) {
      return new Response(
        JSON.stringify({
          error: "Target user is not a moderator or admin. Use /api/blocks to block regular users.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve admin email and from address from Cloudflare env
    const cfEnv = env as App.Env;
    const adminEmail = (
      cfEnv.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? ""
    )
      .toLowerCase()
      .trim();

    if (!adminEmail) {
      console.error("[blocks/mod-report] ADMIN_EMAIL not configured");
      return new Response(
        JSON.stringify({
          error: "Admin notification is not configured. Please contact the site administrators directly.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const fromAddress =
      cfEnv.EMAIL_FROM ??
      cfEnv.RESEND_FROM_ADDRESS ??
      import.meta.env.RESEND_FROM_ADDRESS ??
      "cyberdeck.club <noreply@cyberdeck.club>";

    const blockerName =
      typeof authedUser.name === "string" ? authedUser.name : "Unknown User";
    const targetRole = targetUser.role ?? "moderator";

    // Send the admin notification email
    await sendModBlockNotification(
      blockerName,
      targetUser.name,
      targetRole,
      typeof details === "string" ? details : undefined,
      adminEmail,
      fromAddress
    );

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Your report has been sent to the site administrators. They will investigate.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[blocks/mod-report] Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
