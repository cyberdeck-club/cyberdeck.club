/**
 * API route for user notifications.
 *
 * GET   — List current user's notifications (with optional unread filter and pagination).
 * PATCH — Mark notification(s) as read (single by ID or all at once).
 */

import type { APIRoute } from "astro";
import { eq, and, isNull, sql } from "drizzle-orm";
import * as schema from "../../../db/schema";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../../lib/notifications";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const url = new URL(ctx.request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
      0
    );

    const notifications = await getUserNotifications(db, user.id, {
      unreadOnly,
      limit,
      offset,
    });

    // Get total count for pagination
    const countConditions = [eq(schema.notifications.userId, user.id)];
    if (unreadOnly) {
      countConditions.push(isNull(schema.notifications.readAt));
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(...countConditions));

    const total = countResult[0]?.count ?? 0;

    return new Response(JSON.stringify({ notifications, total }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notifications] Error listing notifications:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await ctx.request.json();
    const { notificationId, all } = body;

    // Must provide either notificationId or all: true
    if (!notificationId && all !== true) {
      return new Response(
        JSON.stringify({
          error: "Provide either notificationId or { all: true }",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (all === true) {
      await markAllNotificationsRead(db, user.id);
    } else {
      if (typeof notificationId !== "string") {
        return new Response(
          JSON.stringify({ error: "notificationId must be a string" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await markNotificationRead(db, notificationId, user.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notifications] Error marking as read:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
