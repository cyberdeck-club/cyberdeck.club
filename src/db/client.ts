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
 * In @astrojs/cloudflare v13 / Astro v6, pass the result of
 * `import { env } from "cloudflare:workers"` directly.
 *
 * @param cfEnv - App.Env from `import { env } from "cloudflare:workers"`
 * @returns Drizzle client bound to the D1 DB binding
 */
export function getDb(cfEnv: App.Env): DrizzleD1Database<typeof schema> {
  const dbBinding = cfEnv.DB;
  if (!dbBinding) {
    throw new Error(
      `[getDb] D1 binding "DB" not found in env. ` +
      `Check wrangler.jsonc d1_databases binding name and that platformProxy is enabled in astro.config.mjs.`
    );
  }
  return drizzle(dbBinding, { schema });
}
