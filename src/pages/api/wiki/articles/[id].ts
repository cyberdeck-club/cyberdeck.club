import type { APIRoute } from "astro";
import { eq, inArray } from "drizzle-orm";
import { recordEdit } from "../../../../lib/edit-history";
import * as schema from "../../../../db/schema";
import { checkPublishingGate } from "../../../../lib/publishing-gate";
import { ROLES, requireRole, getRoleLevel } from "../../../../lib/roles";
import { notifySubscribers, autoSubscribe } from "../../../../lib/notifications";
import { sendNotificationEmail } from "../../../../lib/notification-emails";

/**
 * GET /api/wiki/articles/[id]
 *
 * Gets a single wiki article by ID.
 * Public endpoint - no auth required.
 */
export const GET: APIRoute = async (ctx) => {
  const db = ctx.locals.db!;

  // Get article ID from URL params
  const articleId = ctx.params.id;
  if (!articleId || typeof articleId !== "string") {
    return new Response(JSON.stringify({ error: "Article ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch article with author name
    const articles = await db
      .select({
        article: schema.wikiArticles,
        authorName: schema.user.name,
      })
      .from(schema.wikiArticles)
      .innerJoin(schema.user, eq(schema.wikiArticles.authorId, schema.user.id))
      .where(eq(schema.wikiArticles.id, articleId))
      .limit(1);

    if (articles.length === 0) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ article: articles[0].article }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to get wiki article:", err);
    return new Response(JSON.stringify({ error: "Failed to get wiki article" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PUT /api/wiki/articles/[id]
 *
 * Updates a wiki article by creating a new revision.
 * Requires MAKER role minimum. Must be author or moderator/admin.
 *
 * Body: { content: string, editSummary?: string }
 */
export const PUT: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get article ID from URL params
  const articleId = ctx.params.id;
  if (!articleId || typeof articleId !== "string") {
    return new Response(JSON.stringify({ error: "Article ID is required" }), {
      status: 400,
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

  // Require MAKER role minimum
  if (!requireRole(userRole, ROLES.MAKER)) {
    return new Response(
      JSON.stringify({
        error: "insufficient_permissions",
        message: "Only makers, moderators, and admins can edit wiki articles",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse and validate request body
  let body: { content?: string; editSummary?: string; categoryId?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, editSummary, categoryId } = body;

  // Validate required fields
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  // Fetch the article to check ownership, including slug and category for notification URL
  const articles = await db
    .select({
      id: schema.wikiArticles.id,
      authorId: schema.wikiArticles.authorId,
      title: schema.wikiArticles.title,
      slug: schema.wikiArticles.slug,
      categoryId: schema.wikiArticles.categoryId,
    })
    .from(schema.wikiArticles)
    .where(eq(schema.wikiArticles.id, articleId))
    .limit(1);

  if (articles.length === 0) {
    return new Response(JSON.stringify({ error: "Article not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const article = articles[0];

  // Check if user is author or moderator/admin
  const isAuthor = article.authorId === userId;
  const isModeratorOrAdmin = userRole === "moderator" || userRole === "admin";

  if (!isAuthor && !isModeratorOrAdmin) {
    return new Response(
      JSON.stringify({
        error: "You do not have permission to edit this article",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check if this maker is newly promoted (within 30 days) for soft review flagging
  // We flag edits by makers who became makers less than 30 days ago
  let needsReview = false;
  if (userRole === "maker") {
    const userResult = await db
      .select({
        firstBuildPublishedAt: schema.user.firstBuildPublishedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (userResult.length > 0 && userResult[0].firstBuildPublishedAt) {
      const firstPublished = new Date(userResult[0].firstBuildPublishedAt).getTime();
      const nowMs = Date.now();
      const daysSinceFirstBuild = (nowMs - firstPublished) / (1000 * 60 * 60 * 24);
      // Flag for review if maker for less than 30 days
      needsReview = daysSinceFirstBuild < 30;
    }
  }

  // If categoryId is provided, validate it exists
  let resolvedCategoryId = article.categoryId;
  if (categoryId && typeof categoryId === "string" && categoryId !== article.categoryId) {
    const categories = await db
      .select({ id: schema.wikiCategories.id })
      .from(schema.wikiCategories)
      .where(eq(schema.wikiCategories.id, categoryId))
      .limit(1);

    if (categories.length === 0) {
      return new Response(JSON.stringify({ error: "Category not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    resolvedCategoryId = categoryId;
  }

  const revisionId = crypto.randomUUID();

  try {
    // Build the update set — always update content and timestamp,
    // only update categoryId if it changed
    const updateSet: Record<string, unknown> = {
      content: content.trim(),
      updatedAt: now,
    };
    if (resolvedCategoryId !== article.categoryId) {
      updateSet.categoryId = resolvedCategoryId;
    }

    // Use batch to create revision and update article in one operation
    await db.batch([
      // Insert new revision with diff summary
      db.insert(schema.wikiRevisions).values({
        id: revisionId,
        articleId,
        content: content.trim(),
        title: article.title, // Keep title from article
        authorId: userId,
        diffSummary: editSummary || null,
        createdAt: now,
      }),
      // Update article with new content and timestamp (and optionally categoryId)
      db
        .update(schema.wikiArticles)
        .set(updateSet)
        .where(eq(schema.wikiArticles.id, articleId)),
    ]);

    // Record edit history
    await recordEdit(db, {
      entityType: "wiki_article",
      entityId: article.id,
      editorId: userId,
      changesSummary: "Article content updated",
    }).catch((err) => console.error("Failed to record edit history:", err));

    // Background notification work
    const actorName = ctx.locals.user.name || "Someone";
    const siteUrl = new URL(ctx.request.url).origin;

    // Look up category slug for constructing the entity URL
    const notificationWork = (async () => {
      try {
        // 1. Auto-subscribe the editor to the article
        await autoSubscribe(db, userId, "wiki_article", articleId);

        // 2. Look up category slug for URL construction
        let categorySlug = "general";
        const categories = await db
          .select({ slug: schema.wikiCategories.slug })
          .from(schema.wikiCategories)
          .where(eq(schema.wikiCategories.id, resolvedCategoryId))
          .limit(1);
        if (categories.length > 0) {
          categorySlug = categories[0].slug;
        }

        // 3. Notify all article subscribers (excluding the editor)
        const notifiedUserIds = await notifySubscribers(db, {
          targetType: "wiki_article",
          targetId: articleId,
          excludeUserId: userId,
          type: "wiki_updated",
          title: `Wiki updated: ${article.title}`,
          body: `${actorName} updated this article`,
          entityType: "wiki_article",
          entityId: articleId,
          actorId: userId,
        });

        // 4. Send email to each notified user
        if (notifiedUserIds.length > 0) {
          const users = await db
            .select({
              id: schema.user.id,
              email: schema.user.email,
              name: schema.user.name,
            })
            .from(schema.user)
            .where(inArray(schema.user.id, notifiedUserIds));

          for (const u of users) {
            if (u.email) {
              await sendNotificationEmail({
                to: u.email,
                displayName: u.name || "there",
                type: "wiki_updated",
                title: `Wiki updated: ${article.title}`,
                entityUrl: `${siteUrl}/wiki/${categorySlug}/${article.slug}`,
                actorName,
              });
            }
          }
        }
      } catch (err) {
        console.error("[notifications] Failed to process wiki edit notifications:", err);
      }
    })();

    // Use waitUntil for background work
    const execCtx = ctx.locals.cfContext;
    if (execCtx?.waitUntil) {
      execCtx.waitUntil(notificationWork);
    } else {
      void notificationWork;
    }

    // Return success with revision ID and review flag info
    return new Response(
      JSON.stringify({
        success: true,
        revisionId,
        needsReview
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Failed to update article:", err);
    return new Response(
      JSON.stringify({ error: "Failed to update article" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/wiki/articles/[id]
 *
 * Soft-deletes a wiki article by setting deletedAt timestamp.
 * Access: Article author OR Moderator/Admin
 */
export const DELETE: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get article ID from URL params
  const articleId = ctx.params.id;
  if (!articleId || typeof articleId !== "string") {
    return new Response(JSON.stringify({ error: "Article ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = ctx.locals.db;
  const userId = ctx.locals.user.id;
  const userRole = ctx.locals.user.role;

  // Require MAKER role minimum (authors can delete their own)
  if (!requireRole(userRole, ROLES.MAKER)) {
    return new Response(
      JSON.stringify({
        error: "insufficient_permissions",
        message: "Only makers, moderators, and admins can delete wiki articles",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify the article exists and get author info
    const articles = await db
      .select({
        id: schema.wikiArticles.id,
        authorId: schema.wikiArticles.authorId,
        deletedAt: schema.wikiArticles.deletedAt,
      })
      .from(schema.wikiArticles)
      .where(eq(schema.wikiArticles.id, articleId))
      .limit(1);

    if (articles.length === 0) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const article = articles[0];

    // Already soft-deleted
    if (article.deletedAt) {
      return new Response(JSON.stringify({ error: "Article already deleted" }), {
        status: 410,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check access: author or moderator/admin
    const isAuthor = article.authorId === userId;
    const isModerator = requireRole(userRole, ROLES.MODERATOR);

    if (!isAuthor && !isModerator) {
      return new Response(
        JSON.stringify({ error: "You can only delete your own articles" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Soft-delete the article
    await db
      .update(schema.wikiArticles)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.wikiArticles.id, articleId));

    return new Response(JSON.stringify({ success: true, deletedAt: now }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to delete wiki article:", err);
    return new Response(
      JSON.stringify({ error: "Failed to delete wiki article" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
