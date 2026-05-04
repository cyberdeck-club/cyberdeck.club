/**
 * POST /api/admin/beta/[id]
 *
 * Approve, reject, or waitlist a beta signup.
 * Requires admin role.
 *
 * Body: { action: "approve" | "reject" | "waitlist", reason?: string }
 */

import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getResend } from "../../../../lib/resend";
import { getAuth } from "../../../../lib/auth";
import { betaSignups } from "../../../../db/schema";
import { ROLES } from "../../../../lib/roles";
import { requireAuth } from "../../../../lib/require-auth";
import {
  approveBetaSignup,
  rejectBetaSignup,
  waitlistBetaSignup,
  sendBetaRejectionEmail,
  sendBetaWaitlistEmail,
} from "../../../../lib/beta";

export const POST: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  const signupId = ctx.params.id;
  if (!signupId || typeof signupId !== "string") {
    return new Response(JSON.stringify({ error: "Signup ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  if (!db) {
    return new Response(JSON.stringify({ error: "Database not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: { action?: string; reason?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action, reason } = body;

  if (!action || typeof action !== "string" || !["approve", "reject", "waitlist"].includes(action)) {
    return new Response(
      JSON.stringify({ error: 'action must be "approve", "reject", or "waitlist"' }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get the signup
  const signups = await db
    .select()
    .from(betaSignups)
    .where(eq(betaSignups.id, signupId))
    .limit(1);

  if (signups.length === 0) {
    return new Response(JSON.stringify({ error: "Signup not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signup = signups[0];
  const reviewerId = ctx.locals.user?.id;

  if (!reviewerId) {
    return new Response(JSON.stringify({ error: "Reviewer ID not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resend = getResend();
  const fromAddress =
    env.EMAIL_FROM ??
    env.RESEND_FROM_ADDRESS ??
    import.meta.env.RESEND_FROM_ADDRESS ??
    "cyberdeck.club <noreply@cyberdeck.club>";

  try {
    if (action === "approve") {
      // Update signup status to approved
      await approveBetaSignup(db, signupId, reviewerId);

      // Use Better Auth's signInMagicLink with metadata to trigger the
      // custom beta approval email via the sendMagicLink callback.
      // Better Auth handles token generation, storage, and URL construction.
      const auth = getAuth(env as App.Env);
      try {
        await auth.api.signInMagicLink({
          body: {
            email: signup.email,
            name: signup.displayName,
            metadata: {
              betaApproval: true,
              displayName: signup.displayName,
            },
          },
          headers: ctx.request.headers,
        });
      } catch (err) {
        console.error("[admin/beta] Failed to send approval email:", err);
        // Continue even if email fails - the signup is still approved
      }

      return new Response(
        JSON.stringify({ success: true, status: "approved" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (action === "reject") {
      // Reject the signup
      await rejectBetaSignup(db, signupId, reviewerId, reason);

      // Send rejection email
      try {
        await sendBetaRejectionEmail(
          resend,
          fromAddress,
          signup.displayName,
          signup.email
        );
      } catch (err) {
        console.error("[admin/beta] Failed to send rejection email:", err);
        // Continue even if email fails - the signup is still rejected
      }

      return new Response(
        JSON.stringify({ success: true, status: "rejected" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Waitlist the signup
      await waitlistBetaSignup(db, signupId, reviewerId);

      // Send waitlist email
      try {
        await sendBetaWaitlistEmail(
          resend,
          fromAddress,
          signup.displayName,
          signup.email
        );
      } catch (err) {
        console.error("[admin/beta] Failed to send waitlist email:", err);
        // Continue even if email fails - the signup is still waitlisted
      }

      return new Response(
        JSON.stringify({ success: true, status: "waitlisted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (err) {
    console.error("[admin/beta] Failed to process signup:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process signup" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// PATCH /api/admin/beta/[id]
// Save review notes for a beta signup
export const PATCH: APIRoute = async (ctx) => {
  // Require admin authentication
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) return authResult;

  const signupId = ctx.params.id;
  if (!signupId || typeof signupId !== "string") {
    return new Response(JSON.stringify({ error: "Signup ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  if (!db) {
    return new Response(JSON.stringify({ error: "Database not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: { notes?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { notes } = body;

  try {
    // Update the review notes
    await db
      .update(betaSignups)
      .set({ reviewNotes: notes ?? null })
      .where(eq(betaSignups.id, signupId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[admin/beta] Failed to update review notes:", err);
    return new Response(JSON.stringify({ error: "Failed to update notes" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};