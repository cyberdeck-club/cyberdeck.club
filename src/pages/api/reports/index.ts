import type { APIRoute } from "astro";
import * as schema from "../../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES, requireRole } from "../../../lib/roles";
import { checkReportAbuse } from "../../../lib/reporting";

export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  // Check authentication and authorization
  const authResult = requireAuth(ctx.locals.user, ROLES.MODERATOR);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  const url = new URL(ctx.request.url);
  const status = url.searchParams.get("status");
  const reporterId = url.searchParams.get("reporterId");
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");

  // Build conditions array
  const conditions = [];
  if (status) {
    conditions.push(eq(schema.reports.status, status));
  }
  if (reporterId) {
    conditions.push(eq(schema.reports.reporterId, reporterId));
  }
  if (entityType) {
    conditions.push(eq(schema.reports.entityType, entityType));
  }
  if (entityId) {
    conditions.push(eq(schema.reports.entityId, entityId));
  }

  // Build query
  let query = db
    .select({
      id: schema.reports.id,
      reporterId: schema.reports.reporterId,
      entityType: schema.reports.entityType,
      entityId: schema.reports.entityId,
      reason: schema.reports.reason,
      details: schema.reports.details,
      status: schema.reports.status,
      createdAt: schema.reports.createdAt,
      reviewedBy: schema.reports.reviewedBy,
      reviewedAt: schema.reports.reviewedAt,
      moderatorNotes: schema.reports.moderatorNotes,
      actionTaken: schema.reports.actionTaken,
    })
    .from(schema.reports);

  // Apply where clause if conditions exist
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query.orderBy(desc(schema.reports.createdAt));

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  // Check authentication and authorization (Members+ can report)
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await ctx.request.json();
    const { entityType, entityId, reason, details } = body;

    // Validate required fields
    if (!entityType || !entityId || !reason) {
      return new Response(
        JSON.stringify({ error: "entityType, entityId, and reason are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate reason
    const validReasons = ["spam", "harassment", "inappropriate_content", "off_topic", "other"];
    if (!validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: "Invalid reason" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate report (same reporter, entity)
    const existing = await db
      .select()
      .from(schema.reports)
      .where(
        and(
          eq(schema.reports.reporterId, user.id),
          eq(schema.reports.entityType, entityType),
          eq(schema.reports.entityId, entityId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "You have already reported this content" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for report abuse patterns before creating
    const isAbusiveReporter = await checkReportAbuse(db, user.id);

    // Create report — if reporter is flagged, allow but auto-flag with moderator note
    const reportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(schema.reports).values({
      id: reportId,
      reporterId: user.id,
      entityType,
      entityId,
      reason,
      details: details || null,
      status: "pending",
      createdAt: now,
      ...(isAbusiveReporter
        ? { moderatorNotes: "[Auto-flagged] This reporter has a pattern of dismissed reports. Please review with additional scrutiny." }
        : {}),
    });

    return new Response(
      JSON.stringify({ id: reportId, message: "Report submitted successfully" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating report:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
