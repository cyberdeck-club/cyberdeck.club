import { eq, desc, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { editHistory } from "../db/schema";

export type EntityType = "build" | "forum_thread" | "forum_post" | "meetup" | "wiki_article";

export async function recordEdit(
  db: DrizzleD1Database,
  params: {
    entityType: EntityType;
    entityId: string;
    editorId: string;
    changesSummary?: string;
    previousContent?: string;
  }
) {
  const { entityType: entity_type, entityId: entity_id, editorId: editor_id, changesSummary: changes_summary, previousContent: previous_content } = params;

  // Generate UUID - use crypto.randomUUID() 
  const id = crypto.randomUUID();
  const editedAt = Math.floor(Date.now() / 1000);

  await db.insert(editHistory).values({
    id,
    entityType: entity_type,
    entityId: entity_id,
    editorId: editor_id,
    editedAt,
    changesSummary: changes_summary ?? null,
    previousContent: previous_content ?? null,
  });

  return id;
}

export async function getEditHistory(
  db: DrizzleD1Database,
  entityType: EntityType,
  entityId: string,
  limit = 10
) {
  return db
    .select()
    .from(editHistory)
    .where(
      and(
        eq(editHistory.entityType, entityType),
        eq(editHistory.entityId, entityId)
      )
    )
    .orderBy(desc(editHistory.editedAt))
    .limit(limit);
}

export async function getLatestEdit(
  db: DrizzleD1Database,
  entityType: EntityType,
  entityId: string
) {
  const history = await getEditHistory(db, entityType, entityId, 1);
  return history[0] ?? null;
}
