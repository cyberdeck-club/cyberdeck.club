/**
 * Cloudflare Workers / Astro SSR type declarations.
 * These augment the global App namespace used throughout the codebase.
 *
 * In @astrojs/cloudflare v13 / Astro v6, Workers env bindings are accessed via
 * `import { env } from "cloudflare:workers"` — locals.runtime.env was removed.
 */

/// <reference types="astro/client" />

import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { R2Bucket } from "@cloudflare/workers-types";
import type * as schema from "./db/schema";

declare global {
  namespace App {
    /**
     * Cloudflare Workers env bindings exposed via `import { env } from "cloudflare:workers"`.
     * Populated from wrangler.jsonc d1_databases, vars, and secrets.
     */
    interface Env {
      DB: D1Database;
      PUBLIC_BASE_URL?: string;
      BETTER_AUTH_SECRET?: string;
      RESEND_API_KEY?: string;
      RESEND_FROM_ADDRESS?: string;
      EMAIL_FROM?: string;
      ADMIN_EMAIL?: string;
      MEDIA: R2Bucket;
      GITHUB_FEEDBACK_PAT: string;
      PUBLIC_MEDIA_BASE_URL?: string;
    }

    interface Locals {
      user: (import("better-auth").User & { role: string }) | null;
      session: import("better-auth").Session | null;
      db: DrizzleD1Database<typeof schema>;
      /** Cloudflare Workers context (ExecutionContext) — provided by @astrojs/cloudflare v13 */
      cfContext?: ExecutionContext;
    }
  }
}

/**
 * Type declaration for the cloudflare:workers virtual module.
 * Provides `env` (the Workers env bindings) and other Workers APIs.
 */
declare module "cloudflare:workers" {
  /** The Cloudflare Workers env bindings for this application. */
  const env: App.Env;
  export { env };
}

export { };
