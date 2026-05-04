import { eq, desc, and, or, like, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

// Re-export types for convenience
export type WikiCategory = typeof schema.wikiCategories.$inferSelect;
export type WikiArticle = typeof schema.wikiArticles.$inferSelect;
export type WikiRevision = typeof schema.wikiRevisions.$inferSelect;

/**
 * Get all wiki categories ordered by sort_order
 */
export function getWikiCategories(
  db: DrizzleD1Database<typeof schema>
) {
  return db
    .select()
    .from(schema.wikiCategories)
    .orderBy(schema.wikiCategories.sortOrder);
}

/**
 * Get published wiki articles for a category, joined with author name
 */
export function getWikiArticles(
  db: DrizzleD1Database<typeof schema>,
  categorySlug: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  return db
    .select({
      article: schema.wikiArticles,
      authorName: schema.user.name,
    })
    .from(schema.wikiArticles)
    .innerJoin(
      schema.wikiCategories,
      eq(schema.wikiArticles.categoryId, schema.wikiCategories.id)
    )
    .innerJoin(schema.user, eq(schema.wikiArticles.authorId, schema.user.id))
    .where(
      and(
        eq(schema.wikiCategories.slug, categorySlug),
        eq(schema.wikiArticles.status, "published")
      )
    )
    .orderBy(desc(schema.wikiArticles.publishedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single published wiki article by category slug and article slug
 */
export function getWikiArticle(
  db: DrizzleD1Database<typeof schema>,
  categorySlug: string,
  articleSlug: string
) {
  return db
    .select({
      article: schema.wikiArticles,
      authorName: schema.user.name,
      authorId: schema.wikiArticles.authorId,
      categoryName: schema.wikiCategories.name,
    })
    .from(schema.wikiArticles)
    .innerJoin(
      schema.wikiCategories,
      eq(schema.wikiArticles.categoryId, schema.wikiCategories.id)
    )
    .innerJoin(schema.user, eq(schema.wikiArticles.authorId, schema.user.id))
    .where(
      and(
        eq(schema.wikiCategories.slug, categorySlug),
        eq(schema.wikiArticles.slug, articleSlug),
        eq(schema.wikiArticles.status, "published")
      )
    )
    .limit(1);
}

/**
 * Get a single wiki article by its ID
 */
export function getWikiArticleById(
  db: DrizzleD1Database<typeof schema>,
  articleId: string
) {
  return db
    .select({
      article: schema.wikiArticles,
      authorName: schema.user.name,
      categoryName: schema.wikiCategories.name,
    })
    .from(schema.wikiArticles)
    .innerJoin(
      schema.wikiCategories,
      eq(schema.wikiArticles.categoryId, schema.wikiCategories.id)
    )
    .innerJoin(schema.user, eq(schema.wikiArticles.authorId, schema.user.id))
    .where(eq(schema.wikiArticles.id, articleId))
    .limit(1);
}

/**
 * Increment the view count for a wiki article
 */
export function incrementWikiViewCount(
  db: DrizzleD1Database<typeof schema>,
  articleId: string
) {
  return db
    .update(schema.wikiArticles)
    .set({ viewCount: sql`${schema.wikiArticles.viewCount} + 1` })
    .where(eq(schema.wikiArticles.id, articleId));
}

/**
 * Get all revisions for a wiki article, ordered by created_at DESC
 */
export function getWikiRevisions(
  db: DrizzleD1Database<typeof schema>,
  articleId: string
) {
  return db
    .select({
      revision: schema.wikiRevisions,
      authorId: schema.wikiRevisions.authorId,
      authorName: schema.user.name,
    })
    .from(schema.wikiRevisions)
    .leftJoin(schema.user, eq(schema.wikiRevisions.authorId, schema.user.id))
    .where(eq(schema.wikiRevisions.articleId, articleId))
    .orderBy(desc(schema.wikiRevisions.createdAt));
}

/**
 * Search wiki articles by title and content using SQLite LIKE
 */
export function searchWikiArticles(
  db: DrizzleD1Database<typeof schema>,
  query: string,
  options?: { limit?: number }
) {
  const { limit = 20 } = options ?? {};
  const searchPattern = `%${query}%`;

  return db
    .select({
      article: schema.wikiArticles,
      authorName: schema.user.name,
      categoryName: schema.wikiCategories.name,
    })
    .from(schema.wikiArticles)
    .innerJoin(
      schema.wikiCategories,
      eq(schema.wikiArticles.categoryId, schema.wikiCategories.id)
    )
    .innerJoin(schema.user, eq(schema.wikiArticles.authorId, schema.user.id))
    .where(
      and(
        eq(schema.wikiArticles.status, "published"),
        or(
          like(schema.wikiArticles.title, searchPattern),
          like(schema.wikiArticles.content, searchPattern)
        )
      )
    )
    .orderBy(desc(schema.wikiArticles.publishedAt))
    .limit(limit);
}
