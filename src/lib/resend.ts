/**
 * Resend client factory.
 *
 * CRITICAL: This is a factory function, NOT a module-level singleton.
 * Each request should get its own Resend client instance.
 *
 * The Resend client is lightweight — the main concern is that env vars
 * are resolved at request time in case they change across runtime instances.
 */

import { Resend } from "resend";

// Re-export Resend type for convenience
export type { Resend };

/**
 * Creates a per-request Resend client instance.
 * Use this instead of storing a module-level Resend instance.
 */
export function getResend(): Resend {
  return new Resend(import.meta.env.RESEND_API_KEY);
}
