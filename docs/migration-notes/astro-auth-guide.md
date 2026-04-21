# Astro Authentication Guide Summary

Sourced from [docs.astro.build/en/guides/authentication/](https://docs.astro.build/en/guides/authentication/)

---

## Recommended Auth Library

**Better Auth** is the officially featured/recommended authentication library for Astro.

- Framework-agnostic authentication (and authorization) framework for TypeScript
- Provides a comprehensive set of features out of the box with a plugin ecosystem
- Supports Astro out of the box
- Install via: `npm install better-auth`

Other options covered: **Clerk** (official SDK for Astro), **Lucia** (session-based), **Scalekit** (B2B/AI focus).

---

## Cloudflare Workers-Specific Guidance

No dedicated Cloudflare Workers section appears in the main authentication guide.

For Cloudflare Workers deployment, refer to:
- Astro's Cloudflare adapter documentation
- The general Astro SSR adapter configuration patterns

---

## SSR Mode Config Patterns

Key SSR configuration pattern shown for Better Auth:

```typescript
// src/pages/api/auth/[...all].ts
import { auth } from "../../../lib/auth";
import type { APIRoute } from "astro";

export const prerender = false; // Required in 'server' mode

export const ALL: APIRoute = async (ctx) => {
  return auth.handler(ctx.request);
};
```

All server-side pages/components using auth require:
```typescript
export const prerender = false; // Not needed in 'server' mode
```

---

## Astro.locals Session Pattern

The guide does **not** use `Astro.locals` directly. Instead, Better Auth uses a header-based session pattern:

**Getting the session in server-side code:**
```typescript
import { auth } from "../../../lib/auth"; // import your Better Auth instance

export const prerender = false;

const session = await auth.api.getSession({
  headers: Astro.request.headers,
});
```

**Using in middleware (src/middleware.ts):**
```typescript
import { auth } from "../../../auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  });
  if (context.url.pathname === "/dashboard" && !isAuthed) {
    return context.redirect("/");
  }
  return next();
});
```

**Client-side usage:**
```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();
export const { signIn, signOut } = authClient;
```

**Important:** `Astro.locals` is not used in this guide. Instead, session data is retrieved via `auth.api.getSession({ headers: ... })` which reads from request headers directly.