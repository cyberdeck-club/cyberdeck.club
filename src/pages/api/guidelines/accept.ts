/**
 * POST /api/guidelines/accept
 *
 * Records a user's acceptance of the community guidelines.
 * Requires authenticated user and valid Turnstile token.
 */

import type { APIRoute } from "astro";
import { acceptGuidelines } from "../../../lib/guidelines";
import { verifyTurnstile } from "../../../lib/turnstile";

export const POST: APIRoute = async ({ locals, request }) => {
  // Check authentication
  if (!locals.user || !locals.db) {
    return new Response(
      JSON.stringify({ error: "authentication_required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await request.json();
    const { turnstileToken } = body;

    if (!turnstileToken || typeof turnstileToken !== "string") {
      return new Response(
        JSON.stringify({ error: "turnstile_token_required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get client IP for Turnstile verification
    const ip = request.headers.get("CF-Connecting-IP") ?? undefined;

    // Verify Turnstile token
    const isValid = await verifyTurnstile(turnstileToken, ip);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "turnstile_verification_failed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Record acceptance
    await acceptGuidelines(locals.db, locals.user.id, {
      ipAddress: ip,
      turnstileToken,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[guidelines/accept] Error:", error);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};