/**
 * Resend Email Provider - Sandbox Entry
 *
 * Implements the email:deliver hook to send emails via Resend API.
 */

import { definePlugin } from "emdash";

// ─── Email Deliver Hook ────────────────────────────────────────────

const RESEND_API_URL = "https://api.resend.com/emails";

export default definePlugin({
  hooks: {
    "email:deliver": {
      exclusive: true,
      async handler(event, ctx) {
        const apiKey = await ctx.kv.get("settings:resendApiKey");

        if (!apiKey) {
          ctx.log.error("Resend API key not configured. Set 'settings:resendApiKey' in EmDash admin.");
          throw new Error("Resend API key not configured");
        }

        const fromAddress = (await ctx.kv.get("settings:resendFromAddress")) || "onboarding@resend.com";

        // Normalize 'to' to array
        const toAddresses = Array.isArray(event.message.to) ? event.message.to : [event.message.to];

        const payload = {
          from: event.message.from || fromAddress,
          to: toAddresses,
          subject: event.message.subject,
          text: event.message.text,
          ...(event.message.html && { html: event.message.html }),
        };

        ctx.log.info(`Sending email via Resend to: ${toAddresses.join(", ")}`);

        const response = await ctx.http!.fetch(RESEND_API_URL, {
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
