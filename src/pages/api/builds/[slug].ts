import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { recordEdit } from "../../../lib/edit-history";
import * as schema from "../../../db/schema";
import { checkPublishingGate } from "../../../lib/publishing-gate";
import { requireRole, ROLES } from "../../../lib/roles";
import { serializeBuildJsonFields, validateBuildField } from "../../../lib/builds";
import { sendBuildResubmittedAdminEmail } from "../../../lib/build-emails";

/**
 * GET /api/builds/[slug]
 * Fetch a single build by slug (for edit page)
 */
export const GET: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db!;

  // Fetch the build with author name
  const buildResults = await db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (buildResults.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ build: buildResults[0].build }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * PUT /api/builds/[slug]
 * Update a build.
 * - Only build author or moderator/admin can edit
 */
export const PUT: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Fetch the existing build
  const builds = await db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (builds.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const build = builds[0];

  // Check if user is author or moderator/admin
  const isAuthor = build.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    imageUrl?: string;
    status?: string;
    buildStage?: string;
    // New fields
    difficulty?: string | null;
    computePlatform?: string | null;
    estimatedCost?: number | null;
    buildTime?: string | null;
    tags?: string[] | null;
    wiring?: schema.WiringData | null;
    codebase?: schema.CodebaseData | null;
    models3d?: schema.Models3dData | null;
    photos?: schema.PhotosData | null;
    videos?: schema.VideosData | null;
    tiktokLinks?: string[] | null;
    billOfMaterials?: schema.BillOfMaterialsData | null;
    circuitBoards?: schema.CircuitBoardsData | null;
    inspirations?: schema.InspirationsData | null;
    powerDetails?: schema.PowerDetailsData | null;
    connectivity?: schema.ConnectivityData | null;
    displayInfo?: schema.DisplayInfoData | null;
    enclosureDetails?: schema.EnclosureDetailsData | null;
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
    slug: newSlug,
    description,
    content,
    imageUrl,
    status,
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

  // Validate required fields if provided
  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    return new Response(JSON.stringify({ error: "title cannot be empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate all new fields that are provided (not undefined)
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
    // Only validate if the field was explicitly provided (not undefined)
    if (field.value !== undefined) {
      const result = validateBuildField(field.name, field.value);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }
  }

  if (allErrors.length > 0) {
    return new Response(JSON.stringify({ error: "Validation failed", details: allErrors }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build update object
  const updates: Partial<{
    title: string;
    slug: string;
    description: string | null;
    content: string | null;
    heroImageUrl: string | null;
    status: string;
    buildStage: string | null;
    updatedAt: number;
    // New fields
    difficulty: string | null;
    computePlatform: string | null;
    estimatedCost: number | null;
    buildTime: string | null;
    tags: string | null;
    wiring: string | null;
    codebase: string | null;
    models3d: string | null;
    photos: string | null;
    videos: string | null;
    tiktokLinks: string | null;
    billOfMaterials: string | null;
    circuitBoards: string | null;
    inspirations: string | null;
    powerDetails: string | null;
    connectivity: string | null;
    displayInfo: string | null;
    enclosureDetails: string | null;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (title !== undefined) {
    updates.title = title.trim();
  }

  if (newSlug !== undefined) {
    if (typeof newSlug !== "string" || newSlug.trim().length === 0) {
      return new Response(JSON.stringify({ error: "slug cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    updates.slug = newSlug.trim();
  }

  if (description !== undefined) {
    updates.description = description?.trim() ?? null;
  }

  if (content !== undefined) {
    updates.content = content?.trim() ?? null;
  }

  if (imageUrl !== undefined) {
    updates.heroImageUrl = imageUrl?.trim() ?? null;
  }

  if (status !== undefined) {
    // Validate status value — moderation pipeline statuses only.
    // Build-stage values ("planning", "in-progress", "complete") go in buildStage.
    const validStatuses = ["draft", "published", "pending_human"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // Members cannot change status away from moderation pipeline states
    // (only mods/admins can publish directly; resubmission sets pending_human)
    const protectedStatuses = ["pending_human", "pending_auto"];
    if (protectedStatuses.includes(build.status) && status !== "pending_human" && !isModeratorOrAdmin) {
      return new Response(
        JSON.stringify({ error: "Your build is in the review queue. You cannot change its review status." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.status = status;
  }

  if (buildStage !== undefined) {
    const validBuildStages = ["planning", "in-progress", "complete"];
    if (buildStage !== null && !validBuildStages.includes(buildStage)) {
      return new Response(
        JSON.stringify({ error: `buildStage must be one of: ${validBuildStages.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.buildStage = buildStage;
  }

  // Handle new fields - only include in update if explicitly provided
  // This preserves existing values when field is not in request
  const hasNewFields =
    difficulty !== undefined ||
    computePlatform !== undefined ||
    estimatedCost !== undefined ||
    buildTime !== undefined ||
    tags !== undefined ||
    wiring !== undefined ||
    codebase !== undefined ||
    models3d !== undefined ||
    photos !== undefined ||
    videos !== undefined ||
    tiktokLinks !== undefined ||
    billOfMaterials !== undefined ||
    circuitBoards !== undefined ||
    inspirations !== undefined ||
    powerDetails !== undefined ||
    connectivity !== undefined ||
    displayInfo !== undefined ||
    enclosureDetails !== undefined;

  if (hasNewFields) {
    // Serialize the new fields that were provided
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

    // Add simple string/number fields directly
    if (difficulty !== undefined) {
      updates.difficulty = difficulty;
    }
    if (computePlatform !== undefined) {
      updates.computePlatform = computePlatform;
    }
    if (estimatedCost !== undefined) {
      updates.estimatedCost = estimatedCost;
    }
    if (buildTime !== undefined) {
      updates.buildTime = buildTime;
    }

    // Add serialized JSON fields
    if (serializedFields.tags !== null || tags !== undefined) {
      updates.tags = serializedFields.tags;
    }
    if (serializedFields.wiring !== null || wiring !== undefined) {
      updates.wiring = serializedFields.wiring;
    }
    if (serializedFields.codebase !== null || codebase !== undefined) {
      updates.codebase = serializedFields.codebase;
    }
    if (serializedFields.models3d !== null || models3d !== undefined) {
      updates.models3d = serializedFields.models3d;
    }
    if (serializedFields.photos !== null || photos !== undefined) {
      updates.photos = serializedFields.photos;
    }
    if (serializedFields.videos !== null || videos !== undefined) {
      updates.videos = serializedFields.videos;
    }
    if (serializedFields.tiktokLinks !== null || tiktokLinks !== undefined) {
      updates.tiktokLinks = serializedFields.tiktokLinks;
    }
    if (serializedFields.billOfMaterials !== null || billOfMaterials !== undefined) {
      updates.billOfMaterials = serializedFields.billOfMaterials;
    }
    if (serializedFields.circuitBoards !== null || circuitBoards !== undefined) {
      updates.circuitBoards = serializedFields.circuitBoards;
    }
    if (serializedFields.inspirations !== null || inspirations !== undefined) {
      updates.inspirations = serializedFields.inspirations;
    }
    if (serializedFields.powerDetails !== null || powerDetails !== undefined) {
      updates.powerDetails = serializedFields.powerDetails;
    }
    if (serializedFields.connectivity !== null || connectivity !== undefined) {
      updates.connectivity = serializedFields.connectivity;
    }
    if (serializedFields.displayInfo !== null || displayInfo !== undefined) {
      updates.displayInfo = serializedFields.displayInfo;
    }
    if (serializedFields.enclosureDetails !== null || enclosureDetails !== undefined) {
      updates.enclosureDetails = serializedFields.enclosureDetails;
    }
  }

  try {
    await db
      .update(schema.builds)
      .set(updates)
      .where(eq(schema.builds.slug, slug));

    // Record edit history
    await recordEdit(db, {
      entityType: "build",
      entityId: build.id,
      editorId: userId,
      changesSummary: "Build updated",
    }).catch((err) => console.error("Failed to record edit history:", err));

    // Fetch the updated build
    const updatedBuilds = await db
      .select({
        build: schema.builds,
        authorName: schema.user.name,
      })
      .from(schema.builds)
      .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
      .where(eq(schema.builds.slug, updates.slug ?? slug))
      .limit(1);

    // Send admin email notification when build is resubmitted for review
    // Only fires on a status TRANSITION to pending_human (not on every edit)
    if (
      status === "pending_human" &&
      build.status !== "pending_human"
    ) {
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
      // Use display name only per AGENTS.md §4.1
      const builderDisplayName = String(
        updatedBuilds[0]?.authorName ?? ctx.locals.user.name ?? "A member"
      );

      // Awaited to ensure delivery completes before the worker isolate
      // terminates — the email function has its own try/catch.
      await sendBuildResubmittedAdminEmail({
        adminEmail,
        fromAddress,
        buildTitle: updatedBuilds[0]?.build.title ?? build.title,
        builderDisplayName,
        buildSlug: updates.slug ?? slug,
        siteUrl: baseUrl,
      });
    }

    return new Response(JSON.stringify({ build: updatedBuilds[0].build }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Check for unique constraint violation (duplicate slug)
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return new Response(JSON.stringify({ error: "A build with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Failed to update build:", err);
    return new Response(JSON.stringify({ error: "Failed to update build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/builds/[slug]
 * Update a build (partial update).
 * Alias for PUT - uses the same logic.
 */
/**
 * DELETE /api/builds/[slug]
 * Soft-deletes a build by setting deletedAt timestamp.
 * Access: Build author OR Moderator/Admin
 */
export const DELETE: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Fetch the existing build
  const builds = await db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (builds.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const build = builds[0];

  // Already soft-deleted
  if (build.deletedAt) {
    return new Response(JSON.stringify({ error: "Build already deleted" }), {
      status: 410,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user is author or moderator/admin (uses >= comparison)
  const isAuthor = build.authorId === userId;
  const isModerator = requireRole(userRole, ROLES.MODERATOR);

  if (!isAuthor && !isModerator) {
    return new Response(JSON.stringify({ error: "You can only delete your own builds" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await db
      .update(schema.builds)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.builds.slug, slug));

    return new Response(
      JSON.stringify({ success: true, deletedAt: now }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to delete build:", err);
    return new Response(JSON.stringify({ error: "Failed to delete build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const slug = ctx.params.slug;

  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Check publishing gate (guidelines acceptance)
  const gateResponse = await checkPublishingGate(db, userId);
  if (gateResponse) {
    return gateResponse;
  }

  // Fetch the existing build
  const builds = await db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.slug, slug))
    .limit(1);

  if (builds.length === 0) {
    return new Response(JSON.stringify({ error: "Build not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const build = builds[0];

  // Check if user is author or moderator/admin
  const isAuthor = build.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    imageUrl?: string;
    status?: string;
    buildStage?: string;
    // New fields
    difficulty?: string | null;
    computePlatform?: string | null;
    estimatedCost?: number | null;
    buildTime?: string | null;
    tags?: string[] | null;
    wiring?: schema.WiringData | null;
    codebase?: schema.CodebaseData | null;
    models3d?: schema.Models3dData | null;
    photos?: schema.PhotosData | null;
    videos?: schema.VideosData | null;
    tiktokLinks?: string[] | null;
    billOfMaterials?: schema.BillOfMaterialsData | null;
    circuitBoards?: schema.CircuitBoardsData | null;
    inspirations?: schema.InspirationsData | null;
    powerDetails?: schema.PowerDetailsData | null;
    connectivity?: schema.ConnectivityData | null;
    displayInfo?: schema.DisplayInfoData | null;
    enclosureDetails?: schema.EnclosureDetailsData | null;
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
    slug: newSlug,
    description,
    content,
    imageUrl,
    status,
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

  // Validate required fields if provided
  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    return new Response(JSON.stringify({ error: "title cannot be empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate all new fields that are provided (not undefined)
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
    // Only validate if the field was explicitly provided (not undefined)
    if (field.value !== undefined) {
      const result = validateBuildField(field.name, field.value);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }
  }

  if (allErrors.length > 0) {
    return new Response(JSON.stringify({ error: "Validation failed", details: allErrors }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build update object
  const updates: Partial<{
    title: string;
    slug: string;
    description: string | null;
    content: string | null;
    heroImageUrl: string | null;
    status: string;
    buildStage: string | null;
    updatedAt: number;
    // New fields
    difficulty: string | null;
    computePlatform: string | null;
    estimatedCost: number | null;
    buildTime: string | null;
    tags: string | null;
    wiring: string | null;
    codebase: string | null;
    models3d: string | null;
    photos: string | null;
    videos: string | null;
    tiktokLinks: string | null;
    billOfMaterials: string | null;
    circuitBoards: string | null;
    inspirations: string | null;
    powerDetails: string | null;
    connectivity: string | null;
    displayInfo: string | null;
    enclosureDetails: string | null;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (title !== undefined) {
    updates.title = title.trim();
  }

  if (newSlug !== undefined) {
    if (typeof newSlug !== "string" || newSlug.trim().length === 0) {
      return new Response(JSON.stringify({ error: "slug cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    updates.slug = newSlug.trim();
  }

  if (description !== undefined) {
    updates.description = description?.trim() ?? null;
  }

  if (content !== undefined) {
    updates.content = content?.trim() ?? null;
  }

  if (imageUrl !== undefined) {
    updates.heroImageUrl = imageUrl?.trim() ?? null;
  }

  if (status !== undefined) {
    // Validate status value — moderation pipeline statuses only.
    // Build-stage values ("planning", "in-progress", "complete") go in buildStage.
    const validStatuses = ["draft", "published", "pending_human"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // Members cannot change status away from moderation pipeline states
    const protectedStatuses = ["pending_human", "pending_auto"];
    if (protectedStatuses.includes(build.status) && status !== "pending_human" && !isModeratorOrAdmin) {
      return new Response(
        JSON.stringify({ error: "Your build is in the review queue. You cannot change its review status." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.status = status;
  }

  if (buildStage !== undefined) {
    const validBuildStages = ["planning", "in-progress", "complete"];
    if (buildStage !== null && !validBuildStages.includes(buildStage)) {
      return new Response(
        JSON.stringify({ error: `buildStage must be one of: ${validBuildStages.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    updates.buildStage = buildStage;
  }

  // Handle new fields - only include in update if explicitly provided
  // This preserves existing values when field is not in request
  const hasNewFields =
    difficulty !== undefined ||
    computePlatform !== undefined ||
    estimatedCost !== undefined ||
    buildTime !== undefined ||
    tags !== undefined ||
    wiring !== undefined ||
    codebase !== undefined ||
    models3d !== undefined ||
    photos !== undefined ||
    videos !== undefined ||
    tiktokLinks !== undefined ||
    billOfMaterials !== undefined ||
    circuitBoards !== undefined ||
    inspirations !== undefined ||
    powerDetails !== undefined ||
    connectivity !== undefined ||
    displayInfo !== undefined ||
    enclosureDetails !== undefined;

  if (hasNewFields) {
    // Serialize the new fields that were provided
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

    // Add simple string/number fields directly
    if (difficulty !== undefined) {
      updates.difficulty = difficulty;
    }
    if (computePlatform !== undefined) {
      updates.computePlatform = computePlatform;
    }
    if (estimatedCost !== undefined) {
      updates.estimatedCost = estimatedCost;
    }
    if (buildTime !== undefined) {
      updates.buildTime = buildTime;
    }

    // Add serialized JSON fields
    if (serializedFields.tags !== null || tags !== undefined) {
      updates.tags = serializedFields.tags;
    }
    if (serializedFields.wiring !== null || wiring !== undefined) {
      updates.wiring = serializedFields.wiring;
    }
    if (serializedFields.codebase !== null || codebase !== undefined) {
      updates.codebase = serializedFields.codebase;
    }
    if (serializedFields.models3d !== null || models3d !== undefined) {
      updates.models3d = serializedFields.models3d;
    }
    if (serializedFields.photos !== null || photos !== undefined) {
      updates.photos = serializedFields.photos;
    }
    if (serializedFields.videos !== null || videos !== undefined) {
      updates.videos = serializedFields.videos;
    }
    if (serializedFields.tiktokLinks !== null || tiktokLinks !== undefined) {
      updates.tiktokLinks = serializedFields.tiktokLinks;
    }
    if (serializedFields.billOfMaterials !== null || billOfMaterials !== undefined) {
      updates.billOfMaterials = serializedFields.billOfMaterials;
    }
    if (serializedFields.circuitBoards !== null || circuitBoards !== undefined) {
      updates.circuitBoards = serializedFields.circuitBoards;
    }
    if (serializedFields.inspirations !== null || inspirations !== undefined) {
      updates.inspirations = serializedFields.inspirations;
    }
    if (serializedFields.powerDetails !== null || powerDetails !== undefined) {
      updates.powerDetails = serializedFields.powerDetails;
    }
    if (serializedFields.connectivity !== null || connectivity !== undefined) {
      updates.connectivity = serializedFields.connectivity;
    }
    if (serializedFields.displayInfo !== null || displayInfo !== undefined) {
      updates.displayInfo = serializedFields.displayInfo;
    }
    if (serializedFields.enclosureDetails !== null || enclosureDetails !== undefined) {
      updates.enclosureDetails = serializedFields.enclosureDetails;
    }
  }

  try {
    await db
      .update(schema.builds)
      .set(updates)
      .where(eq(schema.builds.slug, slug));

    // Record edit history
    await recordEdit(db, {
      entityType: "build",
      entityId: build.id,
      editorId: userId,
      changesSummary: "Build updated",
    }).catch((err) => console.error("Failed to record edit history:", err));

    // Fetch the updated build
    const updatedBuilds = await db
      .select({
        build: schema.builds,
        authorName: schema.user.name,
      })
      .from(schema.builds)
      .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
      .where(eq(schema.builds.slug, updates.slug ?? slug))
      .limit(1);

    // Send admin email notification when build is resubmitted for review
    // Only fires on a status TRANSITION to pending_human (not on every edit)
    if (
      status === "pending_human" &&
      build.status !== "pending_human"
    ) {
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
      // Use display name only per AGENTS.md §4.1
      const builderDisplayName = String(
        updatedBuilds[0]?.authorName ?? ctx.locals.user.name ?? "A member"
      );

      // Awaited to ensure delivery completes before the worker isolate
      // terminates — the email function has its own try/catch.
      await sendBuildResubmittedAdminEmail({
        adminEmail,
        fromAddress,
        buildTitle: updatedBuilds[0]?.build.title ?? build.title,
        builderDisplayName,
        buildSlug: updates.slug ?? slug,
        siteUrl: baseUrl,
      });
    }

    return new Response(JSON.stringify({ build: updatedBuilds[0].build }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Check for unique constraint violation (duplicate slug)
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return new Response(JSON.stringify({ error: "A build with this slug already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Failed to update build:", err);
    return new Response(JSON.stringify({ error: "Failed to update build" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
