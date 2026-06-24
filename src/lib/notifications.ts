/**
 * Subscription & notification library.
 *
 * Provides CRUD for content subscriptions and in-app notification
 * management. Subscriptions link a user to a target (forum thread,
 * wiki article, or build). Notifications are generated when activity
 * occurs on a subscribed target.
 *
 * Block-aware: notifications are never created for users who have
 * blocked (or been blocked by) the actor who triggered the event.
 */

import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { getBlockedUserIds } from "./blocking";

type DB = DrizzleD1Database<typeof schema>;

export type TargetType = "forum_thread" | "wiki_article" | "build";
export type NotificationType =
  | "new_forum_post"
  | "wiki_updated"
  | "wiki_comment"
  | "new_build_comment";

// ── Subscriptions ────────────────────────────────────────────────────

/**
 * Subscribe a user to a target. Idempotent — silently succeeds if the
 * subscription already exists (unique index on userId+targetType+targetId).
 */
export async function subscribe(
  db: DB,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<void> {
  const id = crypto.randomUUID();
  const createdAt = Math.floor(Date.now() / 1000);

  await db
    .insert(schema.subscriptions)
    .values({ id, userId, targetType, targetId, createdAt })
    .onConflictDoNothing();
}

/**
 * Unsubscribe a user from a target.
 */
export async function unsubscribe(
  db: DB,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<void> {
  await db
    .delete(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.targetType, targetType),
        eq(schema.subscriptions.targetId, targetId)
      )
    );
}

/**
 * Check if a user is subscribed to a target.
 */
export async function isSubscribed(
  db: DB,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.targetType, targetType),
        eq(schema.subscriptions.targetId, targetId)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Get all subscriber user IDs for a target, excluding a specific user
 * (the actor) and respecting user blocks.
 *
 * For each subscriber we check whether the actor appears in their
 * blocked list (bidirectional). If so, that subscriber is filtered out.
 */
export async function getSubscriberIds(
  db: DB,
  targetType: TargetType,
  targetId: string,
  excludeUserId?: string
): Promise<string[]> {
  const rows = await db
    .select({ userId: schema.subscriptions.userId })
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.targetType, targetType),
        eq(schema.subscriptions.targetId, targetId)
      )
    );

  let subscriberIds = rows.map((r) => r.userId);

  // Exclude the actor (don't notify someone about their own action)
  if (excludeUserId) {
    subscriberIds = subscriberIds.filter((id) => id !== excludeUserId);
  }

  if (subscriberIds.length === 0) return [];

  // Filter out subscribers who have blocked the actor (or whom the actor blocked)
  if (excludeUserId) {
    const filtered: string[] = [];
    for (const subscriberId of subscriberIds) {
      const blockedIds = await getBlockedUserIds(db, subscriberId);
      if (!blockedIds.includes(excludeUserId)) {
        filtered.push(subscriberId);
      }
    }
    return filtered;
  }

  return subscriberIds;
}

/**
 * Get a user's subscriptions with optional filtering and pagination.
 */
export async function getUserSubscriptions(
  db: DB,
  userId: string,
  opts?: { targetType?: TargetType; limit?: number; offset?: number }
): Promise<(typeof schema.subscriptions.$inferSelect)[]> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions = [eq(schema.subscriptions.userId, userId)];
  if (opts?.targetType) {
    conditions.push(eq(schema.subscriptions.targetType, opts.targetType));
  }

  return db
    .select()
    .from(schema.subscriptions)
    .where(and(...conditions))
    .orderBy(desc(schema.subscriptions.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Auto-subscribe a user to a target. Identical to subscribe() — idempotent.
 * Exists as a semantic alias for auto-subscribe-on-create/reply flows.
 */
export async function autoSubscribe(
  db: DB,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<void> {
  return subscribe(db, userId, targetType, targetId);
}

// ── Notifications ────────────────────────────────────────────────────

/**
 * Create a single notification record.
 * Returns the notification ID.
 */
export async function createNotification(
  db: DB,
  opts: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    entityType?: TargetType;
    entityId?: string;
    actorId?: string;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const createdAt = Math.floor(Date.now() / 1000);

  await db.insert(schema.notifications).values({
    id,
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId ?? null,
    actorId: opts.actorId ?? null,
    readAt: null,
    emailSent: false,
    createdAt,
  });

  return id;
}

/**
 * Create notifications for all subscribers of a target, respecting blocks.
 *
 * This is the main entry point called from API route triggers. It fetches
 * subscriber IDs (filtering out the actor and blocked users), then creates
 * a notification record for each.
 *
 * Returns the list of user IDs that were notified.
 */
export async function notifySubscribers(
  db: DB,
  opts: {
    targetType: TargetType;
    targetId: string;
    excludeUserId: string;
    type: NotificationType;
    title: string;
    body?: string;
    entityType?: TargetType;
    entityId?: string;
    actorId: string;
  }
): Promise<string[]> {
  const subscriberIds = await getSubscriberIds(
    db,
    opts.targetType,
    opts.targetId,
    opts.excludeUserId
  );

  if (subscriberIds.length === 0) return [];

  for (const userId of subscriberIds) {
    await createNotification(db, {
      userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      entityType: opts.entityType,
      entityId: opts.entityId,
      actorId: opts.actorId,
    });
  }

  return subscriberIds;
}

/**
 * Get a user's notifications with pagination and optional unread filter.
 */
export async function getUserNotifications(
  db: DB,
  userId: string,
  opts?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<(typeof schema.notifications.$inferSelect)[]> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions = [eq(schema.notifications.userId, userId)];
  if (opts?.unreadOnly) {
    conditions.push(isNull(schema.notifications.readAt));
  }

  return db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Mark a single notification as read. Verifies the notification belongs
 * to the specified user before updating.
 */
export async function markNotificationRead(
  db: DB,
  notificationId: string,
  userId: string
): Promise<void> {
  const readAt = Math.floor(Date.now() / 1000);

  await db
    .update(schema.notifications)
    .set({ readAt })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      )
    );
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(
  db: DB,
  userId: string
): Promise<void> {
  const readAt = Math.floor(Date.now() / 1000);

  await db
    .update(schema.notifications)
    .set({ readAt })
    .where(
      and(
        eq(schema.notifications.userId, userId),
        isNull(schema.notifications.readAt)
      )
    );
}

/**
 * Get the count of unread notifications for a user.
 */
export async function getUnreadCount(
  db: DB,
  userId: string
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        isNull(schema.notifications.readAt)
      )
    );

  return result[0]?.count ?? 0;
}
