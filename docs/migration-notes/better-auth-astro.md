# Better Auth + Astro Integration Guide

> **Source:** [https://better-auth.com/docs/integrations/astro](https://better-auth.com/docs/integrations/astro)
> **Fetched:** 2026-04-21

---

## Setup

- Requires a pre-configured Better Auth instance (see the [installation guide](https://better-auth.com/docs/installation) if not already done).
- Astro supports multiple frontend frameworks; import the client based on the framework in use (vanilla, React, Vue, Svelte, Solid).

---

## Catch-All API Handler (`src/pages/api/auth/[...all].ts`)

```ts
import { auth } from "~/auth";
import type { APIRoute } from "astro";

export const ALL: APIRoute = async (ctx) => {
  // Optional: pass client address for rate limiting
  // ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
  return auth.handler(ctx.request);
};
```

- File lives at `src/pages/api/auth/[...all].ts`.
- The recommended path is `/api/auth/[...all]` (configurable in Better Auth config).
- Exports a single `ALL` named export of type `APIRoute`.
- Delegates entirely to `auth.handler(ctx.request)`.

---

## Client Creation

**Vanilla:**
```ts
import { createAuthClient } from "better-auth/client"
export const authClient = createAuthClient()
```

**React:**
```ts
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient()
```

Framework-specific clients are available for React, Vue, Svelte, and Solid.

---

## `getSession` API Call Signature

Used inside Astro middleware to check authentication:

```ts
const isAuthed = await auth.api.getSession({
  headers: context.request.headers,
})
```

- Takes a single object with `headers` (the incoming request headers).
- Returns the session object (or falsy if unauthenticated).
- Used in `src/middleware.ts` via `onRequest`.

---

## Astro Locals Types (`env.d.ts`)

```ts
/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  interface Locals {
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
  }
}
```

- Declare `App.Locals` in `env.d.ts` to get TypeScript autocomplete for `Astro.locals.user` and `Astro.locals.session`.

---

## Middleware Pattern (`src/middleware.ts`)

```ts
import { auth } from "@/auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  });
  if (isAuthed) {
    context.locals.user = isAuthed.user;
    context.locals.session = isAuthed.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }
  return next();
});
```

- Uses Astro's `defineMiddleware` helper.
- Calls `auth.api.getSession` on every request.
- Populates `context.locals.user` and `context.locals.session` for downstream `.astro` pages.
- Always calls `next()` (does not short-circuit requests).

---

## Reading Session in `.astro` Pages (SSR Context)

```astro
---
import { UserCard } from "@/components/user-card";

const session = () => {
  if (Astro.locals.session) {
    return Astro.locals.session;
  } else {
    return Astro.redirect("/login");
  }
};
---
<UserCard initialSession={session} />
```

- Access session via `Astro.locals.session` in the frontmatter (server-side).
- If no session, can redirect to login.
- Pass serializable data to client components — **do not pass functions** (Astro serializes all props via JSON for `client:*` directives).

---

## Key Takeaways for cyberdeck.club Migration

- **Handler:** The existing `src/pages/api/auth/signup/complete.ts` and any other auth API routes should be replaced by a single catch-all at `src/pages/api/auth/[...all].ts`.
- **Middleware:** Replace any custom session-checking middleware with the Better Auth `onRequest` pattern above.
- **Locals:** Add `user` and `session` to `App.Locals` in `env.d.ts` (or create it if it doesn't exist).
- **Client:** Create a `auth-client.ts` in `src/lib/` using `createAuthClient` from `better-auth/react` (since the project uses React components).
- **Session read:** Replace any `Astro.locals.session` usage with the same pattern — it will now be populated by Better Auth middleware.
