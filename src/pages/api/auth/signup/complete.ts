/**
 * POST /api/auth/signup/complete
 *
 * Simplified signup completion - no passkey required.
 * Verifies token, creates user, and establishes session.
 * User will log in via magic link each time.
 *
 * NOTE: This is a custom route outside /_emdash/, so locals.emdash.db
 * is NOT populated by the EmDash middleware (it only sets db for /_emdash
 * routes or authenticated sessions). We use getDb() from emdash/runtime
 * instead, which is the same loader used by getSiteSettings(), getMenu(), etc.
 */
import type { APIRoute } from "astro";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { completeSignup, SignupError } from "@emdash-cms/auth";
import { getDb } from "emdash/runtime";

function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function apiSuccess(data: unknown): Response {
  return Response.json({ data }, { status: 200 });
}

export const prerender = false;

export const POST: APIRoute = async ({ request, session }) => {
  let db;
  try {
    db = await getDb();
  } catch (e) {
    console.error("Failed to get EmDash database:", e);
    return apiError("NOT_CONFIGURED", "EmDash database is not available", 500);
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return apiError("INVALID_JSON", "Invalid request body", 400);
    }
    const { token, name } = body;

    if (!token) {
      return apiError("MISSING_TOKEN", "Token is required", 400);
    }

    const adapter = createKyselyAdapter(db);

    // Complete signup - creates the user
    const user = await completeSignup(adapter, token, {
      name: name || undefined,
    });

    // Create session
    if (session) {
      session.set("user", { id: user.id });
    }

    return apiSuccess({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof SignupError) {
      const statusMap: Record<string, number> = {
        invalid_token: 404,
        token_expired: 410,
        user_exists: 409,
        domain_not_allowed: 403,
      };
      return apiError(error.code.toUpperCase(), error.message, statusMap[error.code] ?? 400);
    }

    console.error("Signup complete error:", error);
    return apiError("SIGNUP_COMPLETE_ERROR", "Failed to complete signup", 500);
  }
};
