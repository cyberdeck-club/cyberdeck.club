/**
 * Cloudflare Workers / Astro SSR type declarations.
 * These augment the global App namespace used throughout the codebase.
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./db/schema";

declare global {
  namespace App {
    interface Globals {
      DB: DrizzleD1Database<typeof schema>;
    }
  }
}

export { };
