# EmDash Resend Email Provider

A standalone EmDash plugin that provides email delivery via the Resend API for magic link authentication.

## Installation

The plugin is already registered in `astro.config.mjs`:

```javascript
import { resendPlugin } from "./src/plugins/emdash-resend/index.ts";

emdash({
  plugins: [forumPlugin(), wikiPlugin(), resendPlugin()],
})
```

## Configuration

After installing the plugin, you need to configure the Resend API key in EmDash admin:

### 1. Get a Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create an API key in your Resend dashboard
3. Verify your domain (required for sending emails)

### 2. Configure in EmDash Admin

1. Go to `/_emdash/admin`
2. Navigate to **Settings** > **Email** (or **Plugins** > **Resend**)
3. Add these settings:

| Setting | Value | Description |
|---------|-------|-------------|
| `settings:resendApiKey` | Your Resend API key | Required. Used to authenticate with Resend API |
| `settings:resendFromAddress` | `onboarding@yourdomain.com` | Optional. Default sender address. Must be a verified domain in Resend |

### 3. Set Email Provider

In EmDash admin, go to **Settings** > **Email** and select "Resend" as the email provider.

## How It Works

The plugin implements the `email:deliver` hook with `exclusive: true`, which means it becomes the sole email transport for EmDash. When magic link emails need to be sent:

1. EmDash calls the `email:deliver` hook
2. The plugin retrieves the Resend API key from `ctx.kv`
3. Sends the email via POST to `https://api.resend.com/emails`
4. Logs success/failure

## KV Settings

The plugin stores configuration in EmDash's KV store:

| Key | Description |
|-----|-------------|
| `settings:resendApiKey` | Resend API key |
| `settings:resendFromAddress` | Default from address (optional) |

## Troubleshooting

### Emails not sending

1. Check that `settings:resendApiKey` is set in EmDash admin
2. Verify your Resend domain is verified
3. Check server logs for error messages

### "Resend API key not configured" error

The plugin logs this error when `settings:resendApiKey` is not set. Go to EmDash admin and add the setting.

### "Failed to send email via Resend" error

Check the HTTP status code in the error. Common issues:
- `401` - Invalid API key
- `403` - Domain not verified
- `429` - Rate limit exceeded
- `500` - Resend server error

## Files

- [`index.ts`](index.ts) - Plugin descriptor (registered in `astro.config.mjs`)
- [`sandbox-entry.ts`](sandbox-entry.ts) - Hook implementation (loaded at runtime)
