/**
 * Resend Email Provider — Sandbox Entry
 *
 * Implements the email:deliver hook to send emails via Resend API.
 *
 * The API key is stored in plugin KV under "settings:resendApiKey".
 * It is seeded by the post-seed setup script (seed/setup.mjs) which reads
 * RESEND_API_KEY / RESEND_FROM_ADDRESS from .env and POSTs to the
 * /_emdash/api/plugins/emdash-resend/configure route.
 */

// @ts-nocheck — sandbox context types are not exported from emdash
import { definePlugin } from "emdash";
import { z } from "zod";

const RESEND_API_URL = "https://api.resend.com/emails";

const configureSchema = z.object({
  apiKey: z.string().min(1),
  fromAddress: z.string().optional(),
});

export default definePlugin({
  routes: {
    // POST /_emdash/api/plugins/emdash-resend/configure
    // Body: { apiKey: string, fromAddress?: string }
    // Called by seed/setup.mjs after seeding to store credentials in KV.
    configure: {
      input: configureSchema,
      async handler(routeCtx, ctx) {
        const { apiKey, fromAddress } = routeCtx.input;
        await ctx.kv.set("settings:resendApiKey", apiKey);
        if (fromAddress) {
          await ctx.kv.set("settings:resendFromAddress", fromAddress);
        }
        ctx.log.info("Resend credentials stored in KV");
        return { success: true };
      },
    },
  },

  hooks: {
    // ─── Email Deliver Hook ──────────────────────────────────────────
    "email:deliver": {
      exclusive: true,
      async handler(event, ctx) {
        const apiKey = await ctx.kv.get("settings:resendApiKey");

        if (!apiKey) {
          ctx.log.error(
            "Resend API key not configured. Run: node seed/setup.mjs --token <admin-token>",
          );
          throw new Error("Resend API key not configured");
        }

        const fromAddress =
          (await ctx.kv.get("settings:resendFromAddress")) ||
          "noreply@cyberdeck.club";

        const toAddresses = Array.isArray(event.message.to)
          ? event.message.to
          : [event.message.to];

        const payload = {
          from: event.message.from || fromAddress,
          to: toAddresses,
          subject: event.message.subject,
          text: event.message.text,
          ...(event.message.html && { html: event.message.html }),
        };

        ctx.log.info(`Sending email via Resend to: ${toAddresses.join(", ")}`);

        const response = await ctx.http.fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          ctx.log.error(`Resend API error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to send email via Resend: ${response.status}`);
        }

        ctx.log.info("Email sent successfully via Resend");
      },
    },
  },
});
