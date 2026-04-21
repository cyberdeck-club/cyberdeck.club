/**
 * Better Auth instance factory for Cloudflare Workers + Astro SSR.
 *
 * CRITICAL: This is a factory function, NOT a module-level singleton.
 * Each incoming request MUST create its own auth instance via getAuth(env).
 * Reusing instances across requests causes SQLite WAL-lock hangs in local dev
 * and transient 503s in production. See Phase 3 notes in MIGRATION.md.
 */

// We use inline type references to avoid needing @cloudflare/workers-types as a direct dep.
// The D1 binding (env.DB) is typed by the @astrojs/cloudflare integration's env.d.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Database = any;

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import type { Session, User } from "better-auth";
import { drizzle } from "drizzle-orm/d1";

// Re-export auth types for use in env.d.ts and elsewhere
export type { Session, User };

/**
 * Cloudflare Workers env bindings consumed by getAuth().
 * Astro with @astrojs/cloudflare exposes this via context.locals.runtime.env.
 */
/**
 * Env bindings consumed by getAuth().
 * In Astro SSR with @astrojs/cloudflare, access via:
 *   const env = context.locals.runtime.env as App.Environment
 * The App namespace is defined in src/env.d.ts (created in Phase 3).
 */
export interface AuthEnv {
  DB: object; // D1Database — use `object` to avoid needing @cloudflare/workers-types in this skeleton
  PUBLIC_BASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
}

/**
 * Creates a per-request Better Auth instance.
 * NO module-level singleton — call this per request.
 *
 * @param env - The Cloudflare Workers environment bindings (includes DB D1 binding)
 */
export function getAuth(env: AuthEnv) {
  const db = drizzle(env.DB as D1Database);

  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Phase 1 will wire up Resend here.
          // For now, just log so the skeleton is verifiable.
          console.log("[auth] Magic link requested:", { email, url });
        },
      }),
    ],
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "member",
          input: false,
        },
        bio: {
          type: "string",
          required: false,
        },
      },
    },
    baseURL: env.PUBLIC_BASE_URL ?? "http://localhost:4321",
    secret: env.BETTER_AUTH_SECRET,
    cookie: {
      name: "cyberdeck-session",
      domain: undefined, // set via crossSubDomainCookies in production
      secure: true,      // Workers always HTTPS; disable for local dev in advanced.cookieConfig
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
    },
  });

  return auth;
}
