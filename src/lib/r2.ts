/**
 * Cloudflare R2 upload utilities for the feedback widget.
 *
 * Provides helpers for uploading and naming files stored in the MEDIA R2 bucket.
 */

import { env } from "cloudflare:workers";

/**
 * Upload a file to Cloudflare R2 and return its public URL.
 *
 * @param key - Full R2 object key, e.g. "feedback/username/1714742400-auto.png"
 * @param data - File data as ArrayBuffer, Uint8Array, or ReadableStream
 * @param contentType - MIME type, e.g. "image/png"
 * @returns The public URL of the uploaded object
 */
export async function uploadToR2(
  key: string,
  data: ArrayBuffer | Uint8Array | ReadableStream,
  contentType: string
): Promise<string> {
  const mediaEnv = env as App.Env;

  await mediaEnv.MEDIA.put(key, data, {
    httpMetadata: {
      contentType,
    },
  });

  const baseUrl = mediaEnv.PUBLIC_MEDIA_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "PUBLIC_MEDIA_BASE_URL is not set in environment variables. " +
      "Cannot construct public URL for uploaded R2 object."
    );
  }

  return `${baseUrl.replace(/\/$/, "")}/${key}`;
}

/**
 * Sanitize a username for use in R2 object keys.
 * Converts to lowercase and replaces non-alphanumeric characters with underscores.
 */
function sanitizeUsername(username: string): string {
  return username.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * Build an R2 object key for feedback widget screenshots.
 *
 * @param username - The submitting user's username
 * @param timestamp - Unix epoch milliseconds
 * @param type - "auto" for auto-captured, "user" for user-uploaded
 * @param index - For user screenshots, the 1-based index; 0 for auto screenshots
 * @param extension - File extension without dot, e.g. "png"
 * @returns R2 object key, e.g. "feedback/username/1714742400-auto.png"
 */
export function buildFeedbackImageKey(
  username: string,
  timestamp: number,
  type: "auto" | "user",
  index: number,
  extension: string
): string {
  const sanitized = sanitizeUsername(username);
  const typeSuffix = type === "user" && index > 0 ? `-${index}` : "";
  return `feedback/${sanitized}/${timestamp}-${type}${typeSuffix}.${extension}`;
}

/**
 * Build an R2 object key for general user uploads (profile photos, build images, etc.).
 *
 * @param username - The uploading user's username
 * @param filename - The original filename (will NOT be sanitized — keep original for user clarity)
 * @returns R2 object key, e.g. "uploads/username/photo.png"
 */
export function buildUploadImageKey(
  username: string,
  filename: string
): string {
  const sanitized = sanitizeUsername(username);
  return `uploads/${sanitized}/${filename}`;
}
