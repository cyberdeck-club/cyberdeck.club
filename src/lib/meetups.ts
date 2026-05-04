import { eq, asc, and, sql, gt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

// Re-export types for convenience
export type Meetup = typeof schema.meetups.$inferSelect;

/**
 * Get all published meetups with organizer_name, ordered by starts_at ASC
 */
export function getMeetups(
  db: DrizzleD1Database<typeof schema>,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  return db
    .select({
      meetup: schema.meetups,
      organizerName: schema.user.name,
    })
    .from(schema.meetups)
    .innerJoin(schema.user, eq(schema.meetups.organizerId, schema.user.id))
    .where(eq(schema.meetups.status, "published"))
    .orderBy(asc(schema.meetups.startsAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get upcoming meetups (starts_at > now) ordered by starts_at ASC
 */
export function getUpcomingMeetups(
  db: DrizzleD1Database<typeof schema>,
  limit: number
) {
  const now = Math.floor(Date.now() / 1000);

  return db
    .select({
      meetup: schema.meetups,
      organizerName: schema.user.name,
    })
    .from(schema.meetups)
    .innerJoin(schema.user, eq(schema.meetups.organizerId, schema.user.id))
    .where(
      and(
        eq(schema.meetups.status, "published"),
        gt(schema.meetups.startsAt, now)
      )
    )
    .orderBy(asc(schema.meetups.startsAt))
    .limit(limit);
}

/**
 * Get a single published meetup by slug with organizer_name
 */
export function getMeetup(
  db: DrizzleD1Database<typeof schema>,
  slug: string
) {
  return db
    .select({
      meetup: schema.meetups,
      organizerId: schema.meetups.organizerId,
      organizerName: schema.user.name,
    })
    .from(schema.meetups)
    .innerJoin(schema.user, eq(schema.meetups.organizerId, schema.user.id))
    .where(and(eq(schema.meetups.slug, slug), eq(schema.meetups.status, "published")))
    .limit(1);
}
