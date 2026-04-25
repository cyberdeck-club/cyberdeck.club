/**
 * Better Auth client for use in Astro script blocks and vanilla JS.
 * 
 * This client handles the correct request format for Better Auth API calls,
 * avoiding issues with Content-Type headers and body parsing.
 * 
 * Usage in Astro <script> blocks:
 *   import { authClient } from "../lib/auth-client";
 *   await authClient.signOut();
 */

import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_BASE_URL ?? "http://localhost:8787",
});
