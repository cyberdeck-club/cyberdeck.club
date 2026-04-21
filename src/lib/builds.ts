import { eq, desc, and, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

// Re-export types for convenience
export type Build = typeof schema.builds.$inferSelect;

/**
 * Get all published builds with author_name, ordered by created_at DESC
 */
export function getBuilds(
  db: DrizzleD1Database<typeof schema>,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(eq(schema.builds.status, "published"))
    .orderBy(desc(schema.builds.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single published build by slug with author_name
 */
export function getBuild(
  db: DrizzleD1Database<typeof schema>,
  slug: string
) {
  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(and(eq(schema.builds.slug, slug), eq(schema.builds.status, "published")))
    .limit(1);
}

/**
 * Get the latest N published builds, ordered by created_at DESC
 */
export function getRecentBuilds(
  db: DrizzleD1Database<typeof schema>,
  limit: number
) {
  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(eq(schema.builds.status, "published"))
    .orderBy(desc(schema.builds.createdAt))
    .limit(limit);
}
