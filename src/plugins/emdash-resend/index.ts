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
 */

import type { PluginDescriptor } from "emdash";
import { definePlugin } from "emdash";

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
