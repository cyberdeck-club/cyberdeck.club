# Better Auth Installation Notes

Sourced from [better-auth.com/docs/installation](https://better-auth.com/docs/installation) and related docs.

---

## Package Name and Install Command

- Package: `better-auth`
- Install: `npm install better-auth` (also works with pnpm, yarn, bun)
- If using a separate client/server setup, install in **both** parts of the project
- CLI tools (used after install):
  - `npx auth@latest generate` — generates ORM schema or SQL migration file
  - `npx auth@latest migrate` — creates required tables directly in the DB (built-in Kysely adapter only)

---

## Core Exports and API Surface

### Server-side

- `betterAuth` — default export, creates the auth instance
- `betterAuth()` returns an object with:
  - `.handler(request)` — the Request handler; mount at `/api/auth/*`
  - `.api` — object containing API methods (e.g., `signUpEmail`, `signInEmail`, etc.)
  - `.options` — the resolved config (used by `getMigrations`)

### Client-side

- `createAuthClient` — named export from `better-auth/client` (vanilla) or framework-specific variants:
  - `better-auth/react`
  - `better-auth/vue`
  - `better-auth/svelte`
  - `better-auth/solid`
- Returns an object with `signIn`, `signUp`, `useSession`, `signOut`, etc.
- Optional `baseURL` param if client is on a different domain

### Framework Handlers

| Framework | Import |
|-----------|--------|
| Next.js App Router | `better-auth/next-js` → `toNextJsHandler` |
| Next.js Pages Router | `better-auth/node` → `toNodeHandler` |
| Astro | `better-auth/node` → `toNodeHandler` |
| SvelteKit | `better-auth/svelte-kit` → `svelteKitHandler` |
| Hono | `better-auth/node` → `toNodeHandler` |
| Cloudflare Workers | raw `auth.handler(request)` |
| Express / Fastify / Node | `better-auth/node` → `toNodeHandler` |
| Nuxt | `better-auth/nux` (via `defineEventHandler`) |
| React Router / Remix | `better-auth/node` → `toNodeHandler` |
| Expo | raw `auth.handler` |

### Additional Useful Exports

- `getMigrations` from `better-auth/db/migration` — programmatic migrations (Cloudflare Workers, serverless)
- `APIError` from `better-auth/api` — thrown in `databaseHooks` to abort operations
- `createAuthMiddleware` from `better-auth/api` — for `hooks.before` / `hooks.after`
- `better-auth/cookies` → `getAccountCookie` — read OAuth account cookie in hooks/middleware

---

## Cloudflare Workers and D1-Specific Notes

### Wrangler Configuration (Required)

Better Auth uses `AsyncLocalStorage` internally. For Cloudflare Workers, add the `nodejs_compat` flag to `wrangler.toml`:

```toml title="wrangler.toml"
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2024-09-23"
```

Alternatively, for AsyncLocalStorage-only support:

```toml title="wrangler.toml"
compatibility_flags = ["nodejs_als"]
```

> In the next major release, AsyncLocalStorage support will be assumed by default — this config will be required.

### Cloudflare Workers Handler Pattern

```ts title="src/index.ts"
import { auth } from "./auth";

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth")) {
      return auth.handler(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
```

### D1 Programmatic Migrations

Since the CLI cannot access D1 directly, run migrations programmatically via an endpoint:

```ts title="src/index.ts"
import { Hono } from "hono";
import { auth } from "./auth";
import { getMigrations } from "better-auth/db/migration";

const app = new Hono();

app.post("/migrate", async (c) => {
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    return c.json({ message: "No migrations needed" });
  }
  await runMigrations();
  return c.json({ message: "Migrations completed", created: toBeCreated.map(t => t.table), added: toBeAdded.map(t => t.table) });
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
export default app;
```

> `getMigrations` only works with the built-in Kysely adapter (SQLite/D1, PostgreSQL, MySQL, MSSQL). It does **not** work with Prisma or Drizzle — use CLI migrations or ORM-native migration tools for those.

### Cloudflare Workers Background Tasks

```ts
import { AsyncLocalStorage } from "node:async_hooks";

const execCtxStorage = new AsyncLocalStorage<ExecutionContext>();

export const auth = betterAuth({
  advanced: {
    backgroundTasks: {
      handler: (p) => execCtxStorage.getStore()?.waitUntil(p),
    },
  },
});

// In your request handler:
export default {
  async fetch(request: Request, ctx: ExecutionContext) {
    return execCtxStorage.run(ctx, () => auth.handler(request));
  },
};
```

---

## The `additionalFields` Pattern for Custom User Fields

`additionalFields` is defined under `user` (or `session`) in the config. It adds columns to the core tables and provides type-safe access in API responses.

### Syntax

```ts title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: ["user", "admin"],       // union of allowed values
        required: false,               // column is nullable
        defaultValue: "user",           // JS-layer default (column is still optional in DB)
        input: false,                   // cannot be set by client at sign-up
      },
      lang: {
        type: "string",
        required: false,
        defaultValue: "en",
      },
    },
  },
});
```

### FieldAttributes Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"string" \| "number" \| "boolean" \| "string[]"` (or string literal union) | Data type |
| `required` | `boolean` | If `true`, field is considered required in the JS layer |
| `defaultValue` | `unknown` | Default value applied in the JS layer; DB column is still optional |
| `input` | `boolean` | If `false`, client cannot provide this field at sign-up time (default: `true`) |

### Accessing Additional Fields

```ts
// On sign-up, client can pass lang but NOT role:
await auth.api.signUpEmail({
  body: { email, password, name, lang: "fr" }
});

// Session/user object includes the fields:
const session = await auth.api.getSession({ headers: request.headers });
session.user.role;  // "admin"
session.user.lang;  // "fr"
```

### Social Providers + `mapProfileToUser`

For OAuth flows, use `mapProfileToUser` to populate additional fields from the provider's profile:

```ts title="auth.ts"
export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        firstName: profile.name.split(" ")[0],
        lastName: profile.name.split(" ")[1],
      }),
    },
  },
});
```

---

## Config Object Shape

`betterAuth()` accepts a single config object. Keys are categorized as **required**, **commonly-used optional**, and **advanced optional**.

### Required

| Key | Notes |
|-----|-------|
| `database` | A supported DB instance or adapter (Kysely, Drizzle, Prisma, MongoDB). Can be omitted for stateless mode. |

### Environment Variables (fallback for required config)

| Env Var | Config Key | Notes |
|---------|-----------|-------|
| `BETTER_AUTH_SECRET` or `AUTH_SECRET` | `secret` | Encryption/hashing key. 32+ chars. Generated via `openssl rand -base64 32`. Throws in production if unset and no fallback. |
| `BETTER_AUTH_URL` | `baseURL` | Base URL of the app (e.g., `http://localhost:3000`). |

### Commonly-Used Optional Keys

| Key | Type | Description |
|-----|------|-------------|
| `baseURL` | `string \| { allowedHosts, protocol, fallback }` | App root URL. Can be static or dynamic per-request. |
| `basePath` | `string` | Auth route prefix. Default: `/api/auth` |
| `secret` | `string` | Encryption key. Falls back to env vars. |
| `secrets` | `Array<{ version: number, value: string }>` | Versioned secrets for rotation without invalidating existing data. |
| `appName` | `string` | Display name (e.g., for TOTP issuer). Default: `"Better Auth"` |
| `emailAndPassword` | `object` | Enable/configure email+password auth. `{ enabled: true, ... }` |
| `socialProviders` | `object` | OAuth providers: `{ github: { clientId, clientSecret, redirectURI }, google: {...}, ... }` |
| `user` | `object` | `{ modelName, fields, additionalFields, changeEmail, deleteUser }` |
| `session` | `object` | `{ modelName, fields, expiresIn, updateAge, additionalFields, storeSessionInDatabase, cookieCache }` |
| `account` | `object` | `{ modelName, fields, encryptOAuthTokens, storeAccountCookie, accountLinking }` |
| `emailVerification` | `object` | `{ sendVerificationEmail, sendOnSignUp, autoSignInAfterVerification, expiresIn }` |
| `secondaryStorage` | `object` | Redis/KV implementation for sessions/verification/rate-limit |
| `plugins` | `array` | Plugin instances, e.g., `[emailOTP({ ... }), twoFactor({ ... })]` |

### Advanced Optional Keys

| Key | Description |
|-----|-------------|
| `trustedOrigins` | Additional trusted origins for CSRF/callback validation. Supports wildcards (`*.example.com`) and functions. |
| `rateLimit` | `{ enabled, window, max, customRules, storage, modelName }` |
| `verification` | `{ disableCleanup, storeIdentifier, storeInDatabase }` |
| `advanced` | `{ ipAddress, useSecureCookies, disableCSRFCheck, disableOriginCheck, crossSubDomainCookies, cookies, defaultCookieAttributes, cookiePrefix, database: { generateId, defaultFindManyLimit, experimentalJoins }, backgroundTasks, skipTrailingSlashes }` |
| `databaseHooks` | `{ user: { create: { before, after }, update: { before, after }, delete: { before, after } }, session: {...}, account: {...}, verification: {...} }` |
| `hooks` | `{ before, after }` — request lifecycle hooks via `createAuthMiddleware` |
| `onAPIError` | `{ throw, onError, errorURL, customizeDefaultErrorPage }` |
| `disabledPaths` | Array of paths to disable, e.g., `["/sign-up/email"]` |
| `telemetry` | `{ enabled: false }` — disable telemetry |
| `logger` | `{ disabled, disableColors, level, log }` |

### Config Defaults Summary

- `basePath`: `/api/auth`
- `secret`: falls back to `BETTER_AUTH_SECRET` → `AUTH_SECRET` → `"better-auth-secret-12345678901234567890"` (throws in production if unset)
- `emailAndPassword.enabled`: `false`
- `rateLimit`: `true` in production, `false` in development
- `session.expiresIn`: `604800` (7 days)
- `session.updateAge`: `86400` (1 day)
- `accountLinking.enabled`: `true`
- `logger.level`: `"warn"`

---

## Database Adapters

### Built-in (Kysely)

| Database | Import | Notes |
|----------|--------|-------|
| SQLite | `better-auth` + `better-sqlite3` | `new Database("./sqlite.db")` |
| PostgreSQL | `better-auth` + `pg` | `new Pool({ connectionString })` |
| MySQL | `better-auth` + `mysql2/promise` | `createPool(...)` |

### ORM Adapters

| ORM | Import | Notes |
|-----|--------|-------|
| Drizzle | `better-auth/adapters/drizzle` + `drizzleAdapter` | Pass drizzle instance + `{ provider: "pg" \| "mysql" \| "sqlite" }` |
| Prisma | `better-auth/adapters/prisma` + `prismaAdapter` | Pass PrismaClient + `{ provider: "sqlite" \| "postgresql" \| ... }` |
| MongoDB | `better-auth/adapters/mongodb` + `mongodbAdapter` | Pass MongoDB client |

### Core Schema Tables (required if using raw SQL)

- `user`: `id` (pk), `name`, `email` (unique), `emailVerified`, `image` (optional), `createdAt`, `updatedAt`
- `session`: `id` (pk), `userId` (fk→user.id, cascade), `token` (unique), `expiresAt`, `ipAddress` (optional), `userAgent` (optional), `createdAt`, `updatedAt`
- `account`: `id` (pk), `userId` (fk→user.id, cascade), `accountId`, `providerId`, `accessToken`, `refreshToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `idToken`, `password`, `createdAt`, `updatedAt`
- `verification`: `id` (pk), `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`

---

## Quick Minimal `auth.ts` Skeleton

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  // socialProviders: { github: { ... } },
  // user: { additionalFields: { role: { type: ["user", "admin"], required: false, defaultValue: "user", input: false } } },
});
```

### Astro API Route

```ts title="src/pages/api/auth/[...all].ts"
import type { APIRoute } from "astro";
import { auth } from "@/auth";

export const GET: APIRoute = async (ctx) => auth.handler(ctx.request);
export const POST: APIRoute = async (ctx) => auth.handler(ctx.request);
```

### Client

```ts title="lib/auth-client.ts"
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.BETTER_AUTH_URL, // optional if same domain
});

export const { signIn, signUp, useSession, signOut } = authClient;
```
