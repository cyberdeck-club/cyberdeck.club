import type { APIRoute } from "astro";
import * as schema from "../../../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES, requireRole } from "../../../lib/roles";

export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;
  const { id } = ctx.params;

  // Check authentication and authorization (Moderator+)
  const authResult = requireAuth(ctx.locals.user, ROLES.MODERATOR);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (!id || typeof id !== "string") {
    return new Response(JSON.stringify({ error: "Report ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const report = await db
    .select()
    .from(schema.reports)
    .where(eq(schema.reports.id, id))
    .limit(1);

  if (report.length === 0) {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(report[0]), {
    headers: { "Content-Type": "application/json" },
  });
};

export const PATCH: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;
  const { id } = ctx.params;

  // Check authentication and authorization (Moderator+)
  const authResult = requireAuth(ctx.locals.user, ROLES.MODERATOR);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (!id || typeof id !== "string") {
    return new Response(JSON.stringify({ error: "Report ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await ctx.request.json();
    const { status, moderatorNotes, actionTaken } = body;

    // Validate status if provided
    if (status) {
      const validStatuses = ["pending", "reviewed", "dismissed", "action_taken"];
      if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (moderatorNotes !== undefined) updateData.moderatorNotes = moderatorNotes;
    if (actionTaken !== undefined) updateData.actionTaken = actionTaken;

    // Always update reviewer info
    updateData.reviewedBy = user.id;
    updateData.reviewedAt = Math.floor(Date.now() / 1000);

    // Update report
    await db
      .update(schema.reports)
      .set(updateData)
      .where(eq(schema.reports.id, id));

    return new Response(
      JSON.stringify({ message: "Report updated successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating report:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
