import type { APIRoute } from "astro";
import { desc } from "drizzle-orm";
import { requireAuth } from "../../../../lib/require-auth";
import { ROLES } from "../../../../lib/roles";
import { user } from "../../../../db/schema";

/**
 * GET /api/admin/users
 *
 * Returns all users with pagination.
 * Requires ADMIN (50) role.
 *
 * Query params:
 *   - page (default 1)
 *   - limit (default 50, max 100)
 *   - role (optional filter by role string)
 */
export const GET: APIRoute = async (ctx) => {
  // Require ADMIN role
  const authResult = requireAuth(ctx.locals.user, ROLES.ADMIN);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = ctx.locals.db;

  // Parse pagination params
  const url = new URL(ctx.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const offset = (page - 1) * pageSize;

  // Parse optional role filter
  const roleFilter = url.searchParams.get("role");

  // Build query
  let usersQuery = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      bio: user.bio,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Apply role filter if provided
  if (roleFilter) {
    usersQuery = usersQuery.where(
      // @ts-expect-error - role is stored as text but Drizzle expects proper type
      (u, { eq }) => eq(u.role, roleFilter)
    ) as typeof usersQuery;
  }

  const users = await usersQuery;

  // Get total count
  const countResult = roleFilter
    ? await db
      .select()
      .from(user)
      // @ts-expect-error - role is stored as text but Drizzle expects proper type
      .where((u, { eq }) => eq(u.role, roleFilter))
    : await db.select().from(user);

  const total = countResult.length;

  return new Response(
    JSON.stringify({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        image: u.image,
        bio: u.bio,
        createdAt: u.createdAt,
      })),
      total,
      page,
      pageSize,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const prerender = false;
