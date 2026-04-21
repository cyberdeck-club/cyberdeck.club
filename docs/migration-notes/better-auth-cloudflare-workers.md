# Better Auth + Cloudflare Workers: Integration Notes

> Source: [_Better Auth + Cloudflare Workers: The Integration Guide Nobody Wrote_](https://medium.com/@senioro.valentino/better-auth-cloudflare-workers-the-integration-guide-nobody-wrote-8480331d805f) by Valentyn Cherevatyi, Feb 2026.

---

## WAL-Lock Pitfall (30+ Second Hangs)

**The dual auth instance problem:** The initial architecture used two auth instances:
- A **module-level singleton** for session reads in middleware ("reads don't need `waitUntil`")
- A **per-request instance** for auth handler routes ("auth routes need `waitUntil`")

Both instances independently call `createD1DB(env.DB)`, wrapping the same D1 binding with two separate Drizzle ORM instances.

**Why it breaks in local dev:** In production, D1 runs over HTTP and handles concurrency natively. But in local development (`wrangler dev`), D1 is backed by a local SQLite file via Miniflare. SQLite uses a write-ahead log (WAL) — only **one writer at a time**.

**The hang mechanism:**
1. A magic-link verification fires → auth handler instance writes a session record to D1
2. At the same time, the middleware singleton is executing its own D1 queries for other in-flight requests
3. The second writer **blocks waiting for the WAL lock — for up to 30+ seconds**

The follow-on error (`Uncaught Error: Network connection lost`) is a D1 transient error surfacing from a `waitUntil` background task (token cleanup, session write) that fires after the response is already sent. With two instances in play, the background task from the auth handler conflicts with the singleton's ongoing queries.

**Note:** This will not reproduce in production against real D1 (HTTP-based, handles concurrency natively). But fixing it (one auth instance) also eliminates the root cause of the 503s in production.

**Related bug — 503 vs 200 mismatch:** After a 33-second SQLite hang, the local D1 instance is left in a degraded state. The next D1 write returns a 503 HTTP error from the D1 infrastructure itself — before Better Auth's own response body is written. Application logs capture 200 from the auth handler's `Response` object, but Wrangler reports the final status from the infrastructure layer. **Fixing Bug 1 fixes Bug 2.**

---

## Per-Request Auth Instance Pattern (Factory, Not Module-Level Singleton)

**The fix:** Create the auth instance **once per request** in Hono middleware and store it on the context:

```typescript
// cloudflare.ts
app.use("*", async (c, next) => {
  const auth = createRequestAuth(c.env as Env, c.executionCtx);
  c.set("auth", auth);
  await next();
});

// Auth routes reuse the same instance from context
app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});
```

One Drizzle instance per request. One D1 connection. No write lock contention, even under local SQLite.

**Middleware factory signature change:**

```typescript
// Before — reads from cached getter
export function createAuthMiddleware(getAuth: () => Auth)

// After — reads from Hono context
export function createAuthMiddleware(getAuth: (c: Context) => Auth)

// Usage
export function getAuthMiddleware() {
  return createAuthMiddleware((c: Context) => c.get("auth") as Auth);
}
```

Add auth to the Hono `ContextVariableMap` for full type safety:

```typescript
// types.ts
import type { Auth } from "@repo/shared";
declare module "hono" {
  interface ContextVariableMap {
    auth: Auth;
  }
}
```

**Key invariant:** One Drizzle D1 instance per request, created at the top of the middleware chain and shared by everyone downstream. No module-level singletons.

---

## D1-Specific Gotchas

1. **Local dev SQLite WAL lock:** Real D1 (HTTP) handles concurrency fine. Local dev (Miniflare-backed SQLite) uses WAL mode — one writer at a time. This is what causes the 30+ second hangs during local development.

2. **Always pass `ctx.waitUntil` to the auth instance:** Better Auth runs background tasks (token cleanup, session writes) after the response is sent. Without `waitUntil`, the Worker exits before they complete, causing "Network connection lost" errors.

3. **Drizzle schema must be passed to the adapter:**

```typescript
database: drizzleAdapter(db, {
  provider: "sqlite",
  schema: { /* your schema tables */ },
}),
```

---

## Cloudflare Workers Compatibility Flags

### KV TTL Minimum (60 seconds)
Cloudflare KV has a **minimum TTL of 60 seconds**. Better Auth's rate limiter internally passes TTLs of 10 seconds to `secondaryStorage`, causing silent failures. This is a known open issue ([better-auth#7124](https://github.com/better-auth/better-auth/issues/7124), [#5452](https://github.com/better-auth/better-auth/issues/5452)).

**Fix:** Use `Math.max(ttl, 60)` in `secondaryStorage.set`:

```typescript
secondaryStorage: {
  set: async (key, value, ttl) => {
    try {
      const effectiveTtl = ttl ? Math.max(ttl, 60) : undefined;
      await env.AUTH_KV.put(key, value, effectiveTtl ? { expirationTtl: effectiveTtl } : undefined);
    } catch (e) {
      console.warn("[auth] KV set failed", { key, error: String(e) });
    }
  },
},
```

### Separate Rate Limit Storage
Use `rateLimit.customStorage` with hardcoded 60s to isolate rate-limit data from session data:

```typescript
rateLimit: {
  window: 60,
  max: 30,
  customStorage: {
    get: async (key) => {
      try {
        const data = await env.AUTH_KV.get(key);
        return data ? JSON.parse(data) : undefined;
      } catch { return undefined; }
    },
    set: async (key, value) => {
      try {
        await env.AUTH_KV.put(key, JSON.stringify(value), { expirationTtl: 60 });
      } catch (e) { console.warn("[auth] Rate limit KV set failed", { key, error: String(e) }); }
    },
    delete: async (key) => {
      try { await env.AUTH_KV.delete(key); }
      catch (e) { console.warn("[auth] Rate limit KV delete failed", { key, error: String(e) }); }
    },
  },
},
```

---

## Other Workers-Specific Pitfalls

### `cookieCache` + `secondaryStorage` Forces Re-Login
**Bug:** Users are logged out after exactly 5 minutes, regardless of session lifetime. The session is valid in D1 and KV, but Better Auth doesn't refresh it. This is an open bug: [#4203](https://github.com/better-auth/better-auth/issues/4203).

**Workaround:** Disable `cookieCache` until the upstream bug is resolved:

```typescript
session: {
  storeSessionInDatabase: true,
  // cookieCache disabled — better-auth bug #4203
  updateAge: 60 * 15,
},
```

This trades some performance (an extra D1 read per session check) for correctness (users stay logged in).

### `backgroundTasks` Configuration
Always pass `ctx.waitUntil` via the `advanced.backgroundTasks.handler` option:

```typescript
advanced: {
  ...(waitUntil ? {
    backgroundTasks: {
      handler: (p: Promise<unknown>) =>
        waitUntil(
          p.catch((err) => console.warn("[auth] Background task failed:", String(err)))
        ),
    },
  } : {}),
},
```

### Cookie Attributes
Use environment-aware cookie attributes:

```typescript
advanced: {
  crossSubDomainCookies: isLocal
    ? { enabled: false }
    : { enabled: true, domain: getRootDomain(env) },
  defaultCookieAttributes: {
    secure: !isLocal,
    sameSite: "lax",
  },
},
```

---

## Key Takeaways

1. **One auth instance per request, always.** Don't split into "singleton for reads" / "per-request for writes". Two Drizzle wrappers around the same D1 binding fight over SQLite's WAL lock in local dev.
2. **Store the auth instance on Hono context.** `c.set("auth", auth)` at the top of the middleware chain. Read it anywhere downstream with `c.get("auth")`. No module-level singletons.
3. **Always pass `ctx.waitUntil`** to the auth instance. Without it, the Worker exits before background tasks complete, causing "Network connection lost" errors.
4. **Cloudflare KV has a 60-second minimum TTL.** Use `Math.max(ttl, 60)` in `secondaryStorage.set`. Use separate `rateLimit.customStorage` with hardcoded 60s.
5. **`cookieCache` + `secondaryStorage` is currently broken.** Disable `cookieCache` until better-auth#4203 is resolved.
6. **The 33-second hang in local dev is a SQLite WAL lock, not a network issue.** It won't reproduce in production against real D1. But fixing it also eliminates the root cause of 503s in production.
