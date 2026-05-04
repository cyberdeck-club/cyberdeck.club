/**
 * GET /api/beta/status
 *
 * Check beta signup status for an email address.
 * Query param: ?email=user@example.com
 */

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getBetaSignupByEmail } from "../../../lib/beta";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const GET: APIRoute = async ({ locals, request }) => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

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

  const normalizedEmail = email.toLowerCase().trim();

  // ADMIN_EMAIL bypass - always return approved status
  const adminEmail = (
    env.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? ""
  ).toLowerCase().trim();
  if (adminEmail && normalizedEmail === adminEmail) {
    return new Response(JSON.stringify({ status: "approved" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = locals.db;

  if (!db) {
    return new Response(JSON.stringify({ error: "Database not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signup = await getBetaSignupByEmail(db, normalizedEmail);

  if (!signup) {
    return new Response(JSON.stringify({ status: "none" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: signup.status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};