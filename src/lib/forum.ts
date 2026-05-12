import { eq, desc, asc, and, notLike, isNull, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

// Re-export types for convenience
export type ForumCategory = typeof schema.forumCategories.$inferSelect;
export type ForumThread = typeof schema.forumThreads.$inferSelect;
export type ForumPost = typeof schema.forumPosts.$inferSelect;

/**
 * Get all forum categories ordered by sort_order
 */
export function getForumCategories(
  db: DrizzleD1Database<typeof schema>
) {
  return db
    .select()
    .from(schema.forumCategories)
    .orderBy(schema.forumCategories.sortOrder);
}

/**
 * Get threads for a category with author_name and last_reply_user_name,
 * ordered by is_pinned DESC, last_reply_at DESC
 */
export function getForumThreads(
  db: DrizzleD1Database<typeof schema>,
  categorySlug: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  return db
    .select({
      thread: schema.forumThreads,
      authorName: schema.user.name,
      lastReplyUserName: schema.user.name,
      categoryName: schema.forumCategories.name,
    })
    .from(schema.forumThreads)
    .innerJoin(
      schema.forumCategories,
      eq(schema.forumThreads.categoryId, schema.forumCategories.id)
    )
    .innerJoin(schema.user, eq(schema.forumThreads.authorId, schema.user.id))
    .where(
      and(
        eq(schema.forumCategories.slug, categorySlug),
        isNull(schema.forumThreads.deletedAt),
        notLike(schema.user.name, "%[Test Account]%"),
        notLike(schema.user.name, "%[deleted]%")
      )
    )
    .orderBy(desc(schema.forumThreads.isPinned), desc(schema.forumThreads.lastReplyAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single thread by ID with author_name and category info.
 * Note: Thread body content is stored as the first post in forumPosts.
 * Use getForumPosts() to get the first post's content.
 */
export function getForumThread(
  db: DrizzleD1Database<typeof schema>,
  threadId: string
) {
  return db
    .select({
      thread: schema.forumThreads,
      authorName: schema.user.name,
      authorId: schema.forumThreads.authorId,
      categoryName: schema.forumCategories.name,
      categorySlug: schema.forumCategories.slug,
    })
    .from(schema.forumThreads)
    .innerJoin(
      schema.forumCategories,
      eq(schema.forumThreads.categoryId, schema.forumCategories.id)
    )
    .innerJoin(schema.user, eq(schema.forumThreads.authorId, schema.user.id))
    .where(eq(schema.forumThreads.id, threadId))
    .limit(1);
}

/**
 * Get posts for a thread ordered by created_at ASC with author_name.
 *
 * Sort uses a normalised timestamp expression so that rows seeded with
 * millisecond epochs (>10 billion) sort correctly alongside rows written
 * by the API with second-precision epochs.  A secondary sort on `id`
 * guarantees deterministic order when timestamps collide.
 */
export function getForumPosts(
  db: DrizzleD1Database<typeof schema>,
  threadId: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  // Normalise: if a timestamp is > 10 000 000 000 it was stored in
  // milliseconds — divide by 1000 so it compares correctly with
  // second-precision values.
  const normalisedCreatedAt = sql`CASE WHEN ${schema.forumPosts.createdAt} > 10000000000 THEN ${schema.forumPosts.createdAt} / 1000 ELSE ${schema.forumPosts.createdAt} END`;

  return db
    .select({
      post: schema.forumPosts,
      authorName: schema.user.name,
      authorId: schema.forumPosts.authorId,
    })
    .from(schema.forumPosts)
    .innerJoin(schema.user, eq(schema.forumPosts.authorId, schema.user.id))
    .where(
      and(
        eq(schema.forumPosts.threadId, threadId),
        isNull(schema.forumPosts.deletedAt),
        notLike(schema.user.name, "%[Test Account]%"),
        notLike(schema.user.name, "%[deleted]%")
      )
    )
    .orderBy(asc(normalisedCreatedAt), asc(schema.forumPosts.id))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single post by ID with author info
 */
export function getForumPost(
  db: DrizzleD1Database<typeof schema>,
  postId: string
) {
  return db
    .select({
      post: schema.forumPosts,
      authorName: schema.user.name,
      threadTitle: schema.forumThreads.title,
    })
    .from(schema.forumPosts)
    .innerJoin(schema.user, eq(schema.forumPosts.authorId, schema.user.id))
    .innerJoin(schema.forumThreads, eq(schema.forumPosts.threadId, schema.forumThreads.id))
    .where(eq(schema.forumPosts.id, postId))
    .limit(1);
}

/**
 * Count posts in a thread
 */
export function getForumPostCount(
  db: DrizzleD1Database<typeof schema>,
  threadId: string
) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.forumPosts)
    .where(eq(schema.forumPosts.threadId, threadId));
  return result;
}

/**
 * Count posts by a user
 */
export function getUserPostCount(
  db: DrizzleD1Database<typeof schema>,
  userId: string
) {
  return db
    .select({ count: sql<number>`count(*)` })
    .from(schema.forumPosts)
    .where(eq(schema.forumPosts.authorId, userId));
}

/**
 * Get recent forum threads with author name and category name
 */
export function getRecentForumThreads(
  db: DrizzleD1Database<typeof schema>,
  limit: number = 5
) {
  return db
    .select({
      thread: schema.forumThreads,
      authorName: schema.user.name,
      categoryName: schema.forumCategories.name,
    })
    .from(schema.forumThreads)
    .innerJoin(schema.user, eq(schema.forumThreads.authorId, schema.user.id))
    .leftJoin(schema.forumCategories, eq(schema.forumThreads.categoryId, schema.forumCategories.id))
    .where(
      and(
        isNull(schema.forumThreads.deletedAt),
        notLike(schema.user.name, "%[Test Account]%"),
        notLike(schema.user.name, "%[deleted]%")
      )
    )
    .orderBy(desc(schema.forumThreads.lastReplyAt))
    .limit(limit);
}

/**
 * Get user by ID with role and bio
 */
export function getUserById(
  db: DrizzleD1Database<typeof schema>,
  userId: string
) {
  return db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
}
