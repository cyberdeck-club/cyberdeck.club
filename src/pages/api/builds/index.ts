import type { APIRoute } from "astro";
import * as schema from "../../../db/schema";
import { eq, and, sql, count, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { checkPublishingGate } from "../../../lib/publishing-gate";
import { autoReviewBuild } from "../../../lib/moderation";
import { autoSubscribe } from "../../../lib/notifications";
import { requireAuth } from "../../../lib/require-auth";
import { ROLES, requireRole } from "../../../lib/roles";
import { serializeBuildJsonFields, validateBuildField } from "../../../lib/builds";
import { getResend } from "../../../lib/resend";

/**
 * GET /api/builds
 *
 * Lists builds with optional filters.
 * Supports PAT auth (via middleware) or session auth.
 *
 * Query params:
 * - status: filter by build status (e.g., 'published')
 * - category: filter by category slug (category_id in DB)
 * - page: page number (default: 1)
 * - limit: results per page (default: 20, max: 100)
 */
export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  // Parse query params
  const url = new URL(ctx.request.url);
  const status = url.searchParams.get("status");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  // Build where conditions — always exclude soft-deleted builds
  const conditions = [isNull(schema.builds.deletedAt)];
  if (status) {
    conditions.push(eq(schema.builds.status, status));
  }

  try {
    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(schema.builds)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalResult[0]?.count ?? 0;

    // Get builds with author name
    const builds = await db
      .select({
        build: schema.builds,
        authorName: schema.user.name,
      })
      .from(schema.builds)
      .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${schema.builds.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return new Response(
      JSON.stringify({
        builds: builds.map((b) => b.build),
        total,
        page,
        pageSize: limit,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to list builds:", err);
    return new Response(JSON.stringify({ error: "Failed to list builds" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/builds
 *
 * Creates a new build.
 * Requires MEMBER role minimum.
 *
 * Moderation flow:
 * - MAKER+ roles: published directly (skip moderation)
 * - MEMBER role: enters auto-review, then human review queue
 *
 * Body: { title: string, slug?: string, description?: string, content?: string, imageUrl?: string, ... }
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication and MEMBER role minimum
  const authResult = requireAuth(ctx.locals.user, ROLES.MEMBER);
  if (authResult instanceof Response) {
    return authResult;
  }
  const { user } = authResult;

  const db = ctx.locals.db;
  const userId = user.id;
  const userRole = user.role ?? "member";

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Parse and validate request body
  let body: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    imageUrl?: string;
    buildStage?: string;
    // New fields
    difficulty?: string;
    computePlatform?: string;
    estimatedCost?: number;
    buildTime?: string;
    tags?: string[];
    wiring?: schema.WiringData;
    codebase?: schema.CodebaseData;
    models3d?: schema.Models3dData;
    photos?: schema.PhotosData;
    videos?: schema.VideosData;
    tiktokLinks?: string[];
    billOfMaterials?: schema.BillOfMaterialsData;
    circuitBoards?: schema.CircuitBoardsData;
    inspirations?: schema.InspirationsData;
    powerDetails?: schema.PowerDetailsData;
    connectivity?: schema.ConnectivityData;
    displayInfo?: schema.DisplayInfoData;
    enclosureDetails?: schema.EnclosureDetailsData;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    title,
    slug: providedSlug,
    description,
    content,
    imageUrl,
    buildStage,
    // New fields
    difficulty,
    computePlatform,
    estimatedCost,
    buildTime,
    tags,
    wiring,
    codebase,
    models3d,
    photos,
    videos,
    tiktokLinks,
    billOfMaterials,
    circuitBoards,
    inspirations,
    powerDetails,
    connectivity,
    displayInfo,
    enclosureDetails,
  } = body;

  // Validate required fields
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (title.trim().length < 3) {
    return new Response(
      JSON.stringify({ error: "title must be at least 3 characters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (description && typeof description === "string" && description.trim().length > 0 && description.trim().length < 10) {
    return new Response(
      JSON.stringify({ error: "description must be at least 10 characters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate all new fields
  const validationFields = [
    { name: "difficulty", value: difficulty },
    { name: "computePlatform", value: computePlatform },
    { name: "estimatedCost", value: estimatedCost },
    { name: "buildTime", value: buildTime },
    { name: "tags", value: tags },
    { name: "wiring", value: wiring },
    { name: "codebase", value: codebase },
    { name: "models3d", value: models3d },
    { name: "photos", value: photos },
    { name: "videos", value: videos },
    { name: "tiktokLinks", value: tiktokLinks },
    { name: "billOfMaterials", value: billOfMaterials },
    { name: "circuitBoards", value: circuitBoards },
    { name: "inspirations", value: inspirations },
    { name: "powerDetails", value: powerDetails },
    { name: "connectivity", value: connectivity },
    { name: "displayInfo", value: displayInfo },
    { name: "enclosureDetails", value: enclosureDetails },
  ];

  const allErrors: string[] = [];
  for (const field of validationFields) {
    const result = validateBuildField(field.name, field.value);
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }

  if (allErrors.length > 0) {
    return new Response(JSON.stringify({ error: "Validation failed", details: allErrors }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Serialize new fields for DB storage
  const serializedFields = serializeBuildJsonFields({
    tags,
    wiring,
    codebase,
    models3d,
    photos,
    videos,
    tiktokLinks,
    billOfMaterials,
    circuitBoards,
    inspirations,
    powerDetails,
    connectivity,
    displayInfo,
    enclosureDetails,
  });

  const now = Math.floor(Date.now() / 1000);

  // Generate a unique slug
  const baseSlug = providedSlug && typeof providedSlug === "string" && providedSlug.trim().length > 0
    ? providedSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

  // Check if slug exists and generate unique one if needed
  let slug = baseSlug;
  let slugCounter = 1;
  while (true) {
    const existing = await db
      .select({ id: schema.builds.id })
      .from(schema.builds)
      .where(eq(schema.builds.slug, slug))
      .limit(1);
    if (existing.length === 0) {
      break;
    }
    slug = `${baseSlug}-${slugCounter}`;
    slugCounter++;
  }

  // Determine initial status based on user role
  const isMakerOrAbove = requireRole(userRole, ROLES.MAKER);

  if (isMakerOrAbove) {
    // MAKER+ roles: publish directly, skip moderation
    try {
      const id = crypto.randomUUID();
      const publishedAt = new Date().toISOString();

      await db.insert(schema.builds).values({
        id,
        slug,
        title: title.trim(),
        description: description?.trim() ?? null,
        content: content?.trim() ?? null,
        heroImageUrl: imageUrl?.trim() ?? null,
        status: "published",
        authorId: userId,
        createdAt: now,
        updatedAt: now,
        publishedAt,
        // New fields
        buildStage: buildStage ?? null,
        difficulty: difficulty ?? null,
        computePlatform: computePlatform ?? null,
        estimatedCost: estimatedCost ?? null,
        buildTime: buildTime ?? null,
        ...serializedFields,
      });

      // Background: auto-subscribe the build author to their own build
      const subscriptionWork = (async () => {
        try {
          await autoSubscribe(db, userId, "build", id);
        } catch (err) {
          console.error("[notifications] Failed to auto-subscribe build author:", err);
        }
      })();

      const execCtx = ctx.locals.cfContext;
      if (execCtx?.waitUntil) {
        execCtx.waitUntil(subscriptionWork);
      } else {
        void subscriptionWork;
      }

      return new Response(JSON.stringify({ id, slug, status: "published" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Failed to create build:", err);
      return new Response(JSON.stringify({ error: "Failed to create build" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    // MEMBER role: go through moderation pipeline
    const id = crypto.randomUUID();

    try {
      // Insert with pending_auto status
      await db.insert(schema.builds).values({
        id,
        slug,
        title: title.trim(),
        description: description?.trim() ?? null,
        content: content?.trim() ?? null,
        heroImageUrl: imageUrl?.trim() ?? null,
        status: "pending_auto",
        authorId: userId,
        createdAt: now,
        updatedAt: now,
        // New fields
        buildStage: buildStage ?? null,
        difficulty: difficulty ?? null,
        computePlatform: computePlatform ?? null,
        estimatedCost: estimatedCost ?? null,
        buildTime: buildTime ?? null,
        ...serializedFields,
      });

      // Background: auto-subscribe the build author to their own build
      const subscriptionWork = (async () => {
        try {
          await autoSubscribe(db, userId, "build", id);
        } catch (err) {
          console.error("[notifications] Failed to auto-subscribe build author:", err);
        }
      })();

      const execCtx = ctx.locals.cfContext;
      if (execCtx?.waitUntil) {
        execCtx.waitUntil(subscriptionWork);
      } else {
        void subscriptionWork;
      }

      // Run auto-review
      const reviewResult = await autoReviewBuild({
        title: title.trim(),
        description: description?.trim() ?? "",
        content: content?.trim() ?? "",
      });

      // Update build based on review result
      if (reviewResult.passed) {
        await db
          .update(schema.builds)
          .set({
            status: "pending_human",
            autoReviewResult: reviewResult.rawResult,
            updatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(schema.builds.id, id));

        // Send admin email notification for member build submissions
        // Fire-and-forget — do not block the response on email delivery
        const adminEmail = (
          env.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? ""
        ).toLowerCase().trim();
        const fromAddress =
          env.RESEND_FROM_ADDRESS ??
          import.meta.env.RESEND_FROM_ADDRESS ??
          "cyberdeck.club <noreply@cyberdeck.club>";
        const baseUrl =
          env.PUBLIC_BASE_URL ??
          import.meta.env.PUBLIC_BASE_URL ??
          "https://cyberdeck.club";
        const submitterName = String(user.name ?? "A member");

        if (adminEmail) {
          try {
            const resend = getResend();
            await resend.emails.send({
              from: fromAddress,
              to: adminEmail,
              subject: `[cyberdeck.club] New build submitted for review: ${title.trim()}`,
              html: `
                <h2>New Build Submitted for Review</h2>
                <p><strong>${submitterName}</strong> has submitted a new build that passed automated review and is waiting for human review.</p>
                <table style="border-collapse: collapse; margin: 1rem 0;">
                  <tr>
                    <td style="padding: 0.5rem 1rem; font-weight: bold;">Build Title</td>
                    <td style="padding: 0.5rem 1rem;">${title.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.5rem 1rem; font-weight: bold;">Submitted By</td>
                    <td style="padding: 0.5rem 1rem;">${submitterName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  </tr>
                </table>
                <p><a href="${baseUrl}/admin/builds">Review in the moderation queue →</a></p>
                <p><em>Sent automatically by cyberdeck.club</em></p>
              `,
            });
          } catch (emailErr) {
            // Log but do not fail the build submission if email fails
            console.error("[builds] Failed to send admin notification email:", emailErr);
          }
        }

        return new Response(JSON.stringify({ id, slug, status: "pending_human" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Auto-review failed
        await db
          .update(schema.builds)
          .set({
            status: "rejected_auto",
            rejectionReason: reviewResult.reason ?? "Automated review found issues with your submission",
            autoReviewResult: reviewResult.rawResult,
            updatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(schema.builds.id, id));

        return new Response(
          JSON.stringify({
            error: "Your build needs a small adjustment before it can be reviewed. Please review the feedback and try again.",
            status: "rejected_auto",
            reason: reviewResult.reason,
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (err: any) {
      console.error("Failed to create build:", err);
      return new Response(JSON.stringify({ error: "Failed to create build" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
};
