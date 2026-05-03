/**
 * Authorization helper for API routes.
 *
 * Usage in API routes:
 *
 * ```ts
 * import { requireAuth } from '../../../lib/require-auth';
 * import { ROLES } from '../../../lib/roles';
 *
 * export async function POST({ locals }) {
 *   const result = requireAuth(locals.user, ROLES.MAKER);
 *   if (result instanceof Response) return result;
 *   const { user } = result;
 *   // ... handler logic
 * }
 * ```
 */

import { ROLES, type RoleLevel, requireRole } from "./roles";

type AuthUser = {
  id: string;
  role: string;
  bannedAt?: string | null;
  banned_at?: string | null;
  [key: string]: unknown;
};

/**
 * Check authentication and authorization for API routes.
 * Returns the user object if authorized, or a Response to return immediately.
 */
export function requireAuth(
  user: AuthUser | null,
  minRole: RoleLevel = ROLES.MEMBER
): { user: AuthUser } | Response {
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check for ban (handle both naming conventions)
  const bannedAt = user.bannedAt ?? user.banned_at;
  if (bannedAt) {
    return new Response(JSON.stringify({ error: "Account suspended" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!requireRole(user.role, minRole)) {
    return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user };
}