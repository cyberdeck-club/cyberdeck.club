/**
 * Better Auth instance factory for Cloudflare Workers + Astro SSR.
 *
 * CRITICAL: This is a factory function, NOT a module-level singleton.
 * Each incoming request MUST create its own auth instance via getAuth(cfEnv).
 * Reusing instances across requests causes SQLite WAL-lock hangs in local dev
 * and transient 503s in production. See MIGRATION.md known pitfalls.
 *
 * In @astrojs/cloudflare v13 / Astro v6, pass the result of
 * `import { env } from "cloudflare:workers"` as App.Env — locals.runtime.env
 * was removed in this version.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import type { Session, User } from "better-auth";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Resend } from "resend";
import * as authSchema from "../db/auth-schema";

// Re-export auth types for use in env.d.ts and elsewhere
export type { Session, User };

/**
 * Creates a per-request Better Auth instance.
 * NO module-level singleton — call this per request.
 *
 * @param cfEnv - App.Env from `import { env } from "cloudflare:workers"`
 */
export function getAuth(cfEnv: App.Env) {
  const dbBinding = cfEnv.DB;
  if (!dbBinding) {
    throw new Error(
      `[getAuth] D1 binding "DB" not found in env. ` +
      `Check wrangler.jsonc d1_databases binding name and that platformProxy is enabled in astro.config.mjs.`
    );
  }

  // Create a Drizzle instance for Better Auth
  const db = drizzle(dbBinding);

  const resendApiKey = cfEnv.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  const fromAddress = cfEnv.EMAIL_FROM
    ?? cfEnv.RESEND_FROM_ADDRESS
    ?? import.meta.env.RESEND_FROM_ADDRESS
    ?? "CyberDeck <noreply@cyberdeck.club>";

  const adminEmail = (cfEnv.ADMIN_EMAIL ?? import.meta.env.ADMIN_EMAIL ?? "").toLowerCase().trim();

  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: authSchema.user,
        session: authSchema.session,
        account: authSchema.account,
        verification: authSchema.verification,
      },
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (adminEmail && user.email.toLowerCase() === adminEmail) {
              console.log("[auth] Auto-promoting admin user:", user.email);
              await db
                .update(authSchema.user)
                .set({ role: "admin" })
                .where(eq(authSchema.user.id, user.id));
            }
          },
        },
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const resend = new Resend(resendApiKey);

          const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: email,
            subject: "Sign in to CyberDeck",
            html: `
              <h1>Sign in to CyberDeck</h1>
              <p>Click the link below to sign in to your account:</p>
              <p><a href="${url}">${url}</a></p>
              <p>This link will expire in 5 minutes.</p>
              <p>If you didn't request this email, you can safely ignore it.</p>
            `,
          });

          if (error) {
            console.error("[auth] Failed to send magic link email:", {
              email,
              error: error.message,
            });
            throw new Error("Failed to send magic link email");
          }

          console.log("[auth] Magic link sent:", { email, emailId: data?.id });
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
    baseURL: cfEnv.PUBLIC_BASE_URL ?? import.meta.env.PUBLIC_BASE_URL ?? "http://localhost:8787",
    trustedOrigins: [
      cfEnv.PUBLIC_BASE_URL ?? import.meta.env.PUBLIC_BASE_URL ?? "http://localhost:8787",
    ],
    secret: cfEnv.BETTER_AUTH_SECRET ?? import.meta.env.BETTER_AUTH_SECRET,
  });

  return auth;
}
