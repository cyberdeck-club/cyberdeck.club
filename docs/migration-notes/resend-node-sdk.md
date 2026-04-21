# Resend Node SDK — Quickstart Summary

Sourced from:
- <https://resend.com/docs/send-with-nodejs>
- <https://resend.com/docs/send-with-astro>

---

## Package Name & Install Command

```bash
npm install resend
# or: yarn / pnpm / bun add resend
```

The package is [`resend`](https://www.npmjs.com/package/resend) on npm.

---

## `Resend` Client Constructor

```ts
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');
```

- The constructor takes a single string argument: your **Resend API key** (starts with `re_`).
- The API key can be passed directly as a string, or loaded from an environment variable:

```ts
// Common pattern with Astro / Vite
const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Node.js / Express pattern
const resend = new Resend(process.env.RESEND_API_KEY);
```

- API keys are created in the [Resend Dashboard](https://resend.com/api-keys).
- **Prerequisites before sending:** you must also verify a sending domain in the Resend dashboard.

---

## `emails.send()` API

### Function Signature

```ts
const { data, error } = await resend.emails.send(params);
```

### Required Params

| Param | Type | Description |
|-------|------|-------------|
| `from` | `string` | Sender address (e.g. `"Acme <onboarding@resend.dev>"`) |
| `to` | `string \| string[]` | Recipient(s). One email or an array of emails. |

### Optional Params

| Param | Type | Description |
|-------|------|-------------|
| `subject` | `string` | Email subject line. |
| `html` | `string` | Email body as HTML. |
| `text` | `string` | Plain-text email body (alt or supplement to `html`). |
| `attachments` | `object[]` | File attachments. Each object: `{ filename, content, path? }`. |
| `scheduledAt` | `string` | ISO 8601 timestamp for scheduled delivery. |
| `sendAt` | `string` | Alias for `scheduledAt`. |
| `replyTo` | `string \| string[]` | Reply-to address(es). |
| `cc` | `string \| string[]` | CC recipient(s). |
| `bcc` | `string \| string[]` | BCC recipient(s). |
| `headers` | `Record<string, string>` | Custom email headers. |
| `tags` | `{ name: string; value: string }[]` | Tags for tracking/filtering in the Resend dashboard. |

### Return Value

```ts
const { data, error } = await resend.emails.send({ ... });

if (error) {
  // error is an object with at least a `message` field
  console.error({ error });
  return;
}

console.log({ data });
// data contains sent email metadata (e.g. { id: "xxx" })
```

### Error Handling Pattern

```ts
if (error) {
  throw new ActionError({
    code: 'BAD_REQUEST',
    message: error.message,
  });
}
```

---

## Setting the `from` Address

The `from` field accepts two formats:

```ts
// Simple email only
from: 'onboarding@resend.dev'

// With display name (recommended)
from: 'Acme <onboarding@resend.dev>'
```

The address must belong to a **verified domain** in your Resend account. The example `onboarding@resend.dev` is a Resend-owned test address that works without verification.

---

## Cloudflare Workers Compatibility

**Yes — the SDK is Workers-compatible.**

Resend's Node SDK uses native `fetch` under the hood and has no Node.js-specific dependencies. It works in:
- Cloudflare Workers
- Vercel Edge Functions
- Bun
- Any environment with `fetch` support

For **Astro + Cloudflare Workers** deployments:
- Install the Astro SSR adapter: `npm install @astrojs/cloudflare`
- Configure it in `astro.config.mjs`
- Access the API key via `import.meta.env.RESEND_API_KEY` (Cloudflare Workers supports `import.meta.env`)

```ts
// In Astro actions or API routes
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
```

No additional polyfills or configuration are required for Workers compatibility.
