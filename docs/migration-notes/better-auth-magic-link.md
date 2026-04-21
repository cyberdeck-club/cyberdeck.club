# Better Auth Magic Link Plugin — Doc Summary

**Source:** https://better-auth.com/docs/plugins/magic-link

---

## Plugin Import Path and Install

- **Server plugin:** `import { magicLink } from "better-auth/plugins"`
- **Client plugin:** `import { magicLinkClient } from "better-auth/client/plugins"`
- **Bundled or separate?** Bundled — comes with the main `better-auth` package (not a separate npm package)

```ts
// server.ts
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";

// client.ts
import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";
```

---

## Config Keys

| Key | Type | Description |
|-----|------|-------------|
| `sendMagicLink` | `Function` (required) | Callback invoked when a magic link is requested. Sends the email to the user. |
| `expiresIn` | `number` | Seconds until the magic link expires. Default: `300` (5 minutes). |
| `allowedAttempts` | `number` | Max verification attempts. Default: `1`. Exceeding redirects with `?error=ATTEMPTS_EXCEEDED`. Set to `Infinity` for unlimited. |
| `disableSignUp` | `boolean` | Prevents new user sign-up via magic link. Default: `false`. |
| `generateToken` | `Function` | Custom token generator. Receives `{ email }`, must return a cryptographically secure string. Default: random string. |
| `storeToken` | `"plain" \| "hashed" \| { type: "custom-hasher", hash: (token: string) => Promise<string> }` | How the token is stored. Default: `"plain"`. |
| `emailVerified` | Not present in magic-link plugin | Email verification is handled via the magic link flow itself — clicking the link verifies the user. No separate `emailVerified` config key in this plugin. |

> **Note:** The `emailVerified` flag on the user record is set automatically when the magic link is clicked and verified. It is not a config key of the plugin.

---

## `sendMagicLink` Function Signature

```ts
sendMagicLink: async (
  params: {
    email: string;        // The email address to send to
    url: string;          // Full URL containing the token (ready to send)
    token: string;        // The raw token if you need to build a custom URL
    metadata: Record<string, any>; // Any extra data passed from signIn.magicLink
  },
  ctx: ContextObject      // Better Auth context (db, etc.)
) => Promise<void>
```

**Returns:** `Promise<void>` — the function should perform the email sending as a side effect.

---

## Verification Callback URL Configuration

The callback URL is passed at the **client** call site, not in the server config:

```ts
// Client: signIn.magicLink()
const { data, error } = await authClient.signIn.magicLink({
  email: "user@email.com",
  callbackURL: "/dashboard",        // Redirect after successful verification
  newUserCallbackURL: "/welcome",  // Redirect after new user signup
  errorCallbackURL: "/error",      // Redirect on error
  metadata: { inviteId: "123" },
});
```

- If no `callbackURL` is provided, defaults to the root URL (`/`).
- If only `callbackURL` is provided (no `errorCallbackURL`), errors are appended as a query param: `callbackURL?error=ERROR_CODE`.
- For manual verification (alternative flow), call `authClient.magicLink.verify()` directly with a token and optional `callbackURL`.

**Manual verify endpoint:** `GET /magic-link/verify?token=...&callbackURL=...`

---

## Cloudflare Workers Considerations

- The magic link plugin works in Cloudflare Workers — Better Auth has first-class CF Workers support.
- There is a community plugin [`better-auth-cloudflare`](https://github.com/zpg6/better-auth-cloudflare) that provides CLI tooling, D1/Hyperdrive/KV/R2 provisioning, and geolocation integration for Better Auth on Workers.
- Token storage can be configured via `secondaryStorage` (backed by the global `verification` config) to store magic link verification records in a separate storage backend (e.g., Cloudflare KV) instead of the main database.
- The `generateToken` function defaults to cryptographically secure random strings, which is safe for Workers environments.
- No `async_hooks` usage in magic-link itself — the plugin does not require Node.js-specific APIs, making it compatible with Workers' fetch-based model.
