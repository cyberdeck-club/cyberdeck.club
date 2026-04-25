/**
 * Ambient type declarations for Cloudflare Workers virtual modules.
 * This file MUST be a non-module (no top-level import/export) so that
 * `declare module` creates true ambient module declarations.
 *
 * Used by @astrojs/cloudflare v13+ which resolves these virtual modules
 * via the @cloudflare/vite-plugin at build/dev time.
 */

declare module "cloudflare:workers" {
  /**
   * The Cloudflare Workers env bindings for this application.
   * Populated from wrangler.jsonc d1_databases, vars, and secrets.
   * Type is App.Env defined in src/env.d.ts.
   */
  const env: App.Env;
  export { env };
}
