/**
 * Better Auth CLI configuration — DO NOT USE IN RUNTIME CODE.
 * This file exists solely for `npx @better-auth/cli generate` to introspect the schema.
 * The actual runtime auth uses getAuth(env) factory in src/lib/auth.ts.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { DrizzleD1Database } from 'drizzle-orm/d1';

type AnyD1Database = DrizzleD1Database<any>;

// Stub env type for CLI introspection — DB is the only required binding
interface CliEnv {
  DB: AnyD1Database;
  PUBLIC_BASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
}

// Replicate the same config as src/lib/auth.ts so CLI sees the correct schema
const auth = betterAuth({
  database: drizzleAdapter(null as unknown as AnyD1Database, {
    provider: 'sqlite',
    schema: {
      // Introspection target: we need to see what tables/columns the adapter expects
      user: {
        fields: {
          id: { primary: true, type: 'string' },
          email: { type: 'string', required: true },
          emailVerified: { type: 'boolean', default: false },
          name: { type: 'string' },
          image: { type: 'string' },
          createdAt: { type: 'date', required: true },
          updatedAt: { type: 'date', required: true },
        },
        additionalFields: {
          role: { type: 'string', default: 'member' },
          bio: { type: 'string' },
        },
      },
      session: {
        fields: {
          id: { primary: true, type: 'string' },
          userId: { type: 'string', required: true, references: { table: 'user' } },
          token: { type: 'string', required: true },
          expiresAt: { type: 'date', required: true },
          createdAt: { type: 'date', required: true },
        },
      },
      account: {
        fields: {
          id: { primary: true, type: 'string' },
          userId: { type: 'string', required: true, references: { table: 'user' } },
          accountId: { type: 'string', required: true },
          providerId: { type: 'string', required: true },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          accessTokenExpiresAt: { type: 'date' },
          refreshTokenExpiresAt: { type: 'date' },
          scope: { type: 'string' },
          password: { type: 'string' },
          createdAt: { type: 'date', required: true },
          updatedAt: { type: 'date', required: true },
        },
      },
      verification: {
        fields: {
          id: { primary: true, type: 'string' },
          identifier: { type: 'string', required: true },
          value: { type: 'string', required: true },
          expiresAt: { type: 'date', required: true },
          createdAt: { type: 'date', required: true },
          updatedAt: { type: 'date', required: true },
        },
      },
    },
  }),
  emailAndPassword: { enabled: false },
  magicLink: {
    enabled: true,
    sendMagicLink: async ({ email, url }) => {
      // Placeholder — actual sending handled by API route with Resend
      console.log('[better-auth magic link]', email, url);
    },
    verifyMagicLink: async ({ email, token }) => {
      // Placeholder — actual verification in API route
      console.log('[better-auth verify]', email, token);
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production',
  trustedOrigins: ['http://localhost:4321', 'https://cyberdeck.club'],
  baseURL: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4321',
});

export default auth;