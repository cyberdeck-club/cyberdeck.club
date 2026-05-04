/**
 * POST /api/beta/signup
 *
 * Submit a beta access request.
 * Validates email, checks if on beta site, and creates a pending signup.
 */

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getAuth } from "../../../lib/auth";
import { getResend } from "../../../lib/resend";
import {
  getBetaSignupByEmail,
  createBetaSignup,
  sendBetaAdminNotification,
  sendBetaApplicationReceivedEmail,
} from "../../../lib/beta";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Parse request body
  let body: {
    email?: string;
    displayName?: string;
    interestReason?: string;
    makingBackground?: string;
    referralSource?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    email,
    displayName,
    interestReason,
    makingBackground,
    referralSource,
  } = body;

  // Validate email
  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return new Response(
      JSON.stringify({ error: "A valid email address is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate displayName
  if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Display name is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (displayName.length > 30) {
    return new Response(
      JSON.stringify({ error: "Display name must be 30 characters or less" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate interestReason
  if (!interestReason || typeof interestReason !== "string" || interestReason.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Interest reason is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (interestReason.length > 500) {
    return new Response(
      JSON.stringify({ error: "Interest reason must be 500 characters or less" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate optional makingBackground
  if (makingBackground && makingBackground.length > 500) {
    return new Response(
      JSON.stringify({ error: "Making background must be 500 characters or less" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate optional referralSource
  if (referralSource && referralSource.length > 200) {
    return new Response(
      JSON.stringify({ error: "Referral source must be 200 characters or less" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const db = locals.db;

  if (!db) {
    return new Response(JSON.stringify({ error: "Database not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ADMIN_EMAIL bypass - auto-approve and trigger magic link
  const adminEmail = (
    env.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? ""
  ).toLowerCase().trim();

  if (normalizedEmail === adminEmail) {
    // Auto-approve and send magic link
    const auth = getAuth(env as App.Env);
    try {
      // Trigger magic link sign-in for admin
      await auth.api.signInMagicLink({
        body: { email: normalizedEmail },
        request,
      });

      return new Response(
        JSON.stringify({
          status: "approved",
          message: "Magic link sent",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      console.error("[beta/signup] Admin magic link error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to send magic link" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Check if signup already exists
  const existingSignup = await getBetaSignupByEmail(db, normalizedEmail);

  if (existingSignup) {
    switch (existingSignup.status) {
      case "approved": {
        // Trigger magic link sign-in
        const auth = getAuth(env as App.Env);
        try {
          await auth.api.signInMagicLink({
            body: { email: normalizedEmail },
            request,
          });
        } catch (err) {
          console.error("[beta/signup] Approved user magic link error:", err);
        }

        return new Response(
          JSON.stringify({
            status: "approved",
            message: "Magic link sent",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      case "pending":
        return new Response(JSON.stringify({ status: "pending" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      case "rejected":
        return new Response(JSON.stringify({ status: "rejected" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      case "waitlisted":
        return new Response(JSON.stringify({ status: "waitlisted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }
  }

  // Create new pending signup
  try {
    await createBetaSignup(db, {
      email: normalizedEmail,
      displayName: displayName.trim(),
      interestReason: interestReason.trim(),
      makingBackground: makingBackground?.trim(),
      referralSource: referralSource?.trim(),
    });
  } catch (err) {
    console.error("[beta/signup] Failed to create signup:", err);
    return new Response(
      JSON.stringify({ error: "Failed to create signup" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Send application received email to user
  const resend = getResend();
  const fromAddress =
    env.EMAIL_FROM ??
    env.RESEND_FROM_ADDRESS ??
    import.meta.env.RESEND_FROM_ADDRESS ??
    "cyberdeck.club <noreply@cyberdeck.club>";

  try {
    await sendBetaApplicationReceivedEmail(
      resend,
      fromAddress,
      displayName.trim(),
      normalizedEmail
    );
  } catch (err) {
    // Log but don't fail the request
    console.error("[beta/signup] Failed to send application received email:", err);
  }

  // Send admin notification
  if (adminEmail) {
    try {
      await sendBetaAdminNotification(
        resend,
        fromAddress,
        adminEmail,
        {
          displayName: displayName.trim(),
          email: normalizedEmail,
          interestReason: interestReason.trim(),
          makingBackground: makingBackground?.trim(),
          referralSource: referralSource?.trim(),
        }
      );
    } catch (err) {
      // Log but don't fail the request
      console.error("[beta/signup] Failed to send admin notification:", err);
    }
  }

  return new Response(JSON.stringify({ status: "pending" }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};