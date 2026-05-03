/**
 * Publishing Gate — check if user can publish content.
 *
 * All publishing API routes call this function before allowing
 * content creation. Returns null if OK, or a Response to return if not.
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { hasAcceptedGuidelines } from "./guidelines";

/**
 * Check if user can publish content.
 *
 * @param db - Drizzle database instance
 * @param userId - The user's ID (null if not authenticated)
 * @returns null if OK, or a Response to return if blocked
 */
export async function checkPublishingGate(
  db: DrizzleD1Database<typeof schema>,
  userId: string | null
): Promise<Response | null> {
  // Check authentication
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "authentication_required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check guidelines acceptance
  const accepted = await hasAcceptedGuidelines(db, userId);
  if (!accepted) {
    return new Response(
      JSON.stringify({
        error: "guidelines_required",
        redirect: "/guidelines",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // All checks passed
  return null;
}