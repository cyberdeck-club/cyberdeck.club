/**
 * API route for content subscriptions.
 *
 * POST   — Subscribe to a target (forum_thread, wiki_article, build).
 * DELETE — Unsubscribe from a target.
 * GET    — Check subscription status or list current user's subscriptions.
 */

import type { APIRoute } from "astro";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "../../../db/schema";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES } from "../../../lib/roles";
import {
  subscribe,
  unsubscribe,
  isSubscribed,
  getUserSubscriptions,
  type TargetType,
} from "../../../lib/notifications";

export const prerender = false;

const VALID_TARGET_TYPES: TargetType[] = [
  "forum_thread",
  "wiki_article",
  "build",
];

function isValidTargetType(value: unknown): value is TargetType {
  return (
    typeof value === "string" &&
    VALID_TARGET_TYPES.includes(value as TargetType)
  );
}

export const POST: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await ctx.request.json();
    const { targetType, targetId } = body;

    if (!targetType || !targetId || typeof targetId !== "string") {
      return new Response(
        JSON.stringify({ error: "targetType and targetId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isValidTargetType(targetType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await subscribe(db, user.id, targetType, targetId);

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[subscriptions] Error subscribing:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await ctx.request.json();
    const { targetType, targetId } = body;

    if (!targetType || !targetId || typeof targetId !== "string") {
      return new Response(
        JSON.stringify({ error: "targetType and targetId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isValidTargetType(targetType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await unsubscribe(db, user.id, targetType, targetId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[subscriptions] Error unsubscribing:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const url = new URL(ctx.request.url);
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");

    // If both targetType and targetId are provided, check subscription status
    if (targetType && targetId) {
      if (!isValidTargetType(targetType)) {
        return new Response(
          JSON.stringify({
            error: `Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(", ")}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const subscribed = await isSubscribed(db, user.id, targetType, targetId);

      return new Response(JSON.stringify({ subscribed }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate targetType if provided without targetId (list filter)
    if (targetType && !isValidTargetType(targetType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // List subscriptions with optional filtering and pagination
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
      0
    );

    const filterType = isValidTargetType(targetType)
      ? targetType
      : undefined;

    const subscriptions = await getUserSubscriptions(db, user.id, {
      targetType: filterType,
      limit,
      offset,
    });

    // Get total count for pagination
    const countConditions = [eq(schema.subscriptions.userId, user.id)];
    if (filterType) {
      countConditions.push(
        eq(schema.subscriptions.targetType, filterType)
      );
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.subscriptions)
      .where(and(...countConditions));

    const total = countResult[0]?.count ?? 0;

    return new Response(JSON.stringify({ subscriptions, total }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[subscriptions] Error listing subscriptions:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
