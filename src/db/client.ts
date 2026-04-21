import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Factory: creates a Drizzle client per request.
 *
 * Called in middleware so each request gets its own Drizzle instance
 * wrapping the D1 binding. This avoids WAL-lock contention that occurs
 * with module-level singletons under local SQLite (Miniflare).
 *
 * @param env - App.Globals from Cloudflare Workers / Astro
 * @returns Drizzle client bound to env.DB
 */
export function getDb(env: App.Globals): DrizzleD1Database<typeof schema> {
  return drizzle(env.DB, { schema });
}
