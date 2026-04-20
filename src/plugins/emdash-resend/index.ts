/**
 * Resend Email Provider Plugin for EmDash CMS
 *
 * Provides email delivery via the Resend API for magic link authentication.
 *
 * @example
 * ```typescript
 * // astro.config.mjs
 * import { resendPlugin } from "./src/plugins/emdash-resend/index.ts";
 *
 * emdash({
 *   plugins: [forumPlugin(), wikiPlugin(), resendPlugin()],
 * })
 * ```
 *
 * After seeding, run seed/setup.mjs to store RESEND_API_KEY / RESEND_FROM_ADDRESS
 * from the .env file into EmDash's plugin KV store.
 */

import type { PluginDescriptor } from "emdash";

export function resendPlugin(): PluginDescriptor {
  return {
    id: "emdash-resend",
    version: "1.0.0",
    format: "standard",
    entrypoint: "./src/plugins/emdash-resend/sandbox-entry.ts",
    options: {},
    capabilities: ["email:provide", "network:fetch"],
    allowedHosts: ["api.resend.com"],
  };
}
