/**
 * Timestamp normalisation utilities.
 *
 * The database may contain timestamps in two formats:
 * - **Seconds** (~1.78 billion) — written by API routes via `Math.floor(Date.now() / 1000)`
 * - **Milliseconds** (~1.78 trillion) — written by the seed script via `Date.now()`
 *
 * These helpers detect which format a value is in and normalise it to
 * a JavaScript `Date` or to milliseconds, so display code works regardless
 * of which writer created the row.
 *
 * Threshold: values > 10 000 000 000 are treated as milliseconds.
 */

const MS_THRESHOLD = 10_000_000_000;

/**
 * Convert a numeric epoch (seconds or milliseconds) to a JS Date.
 *
 * @param timestamp  Unix epoch — either seconds or milliseconds
 * @returns          A Date object in the correct time
 */
export function epochToDate(timestamp: number): Date {
  return timestamp > MS_THRESHOLD
    ? new Date(timestamp)          // already milliseconds
    : new Date(timestamp * 1000);  // seconds → milliseconds
}

/**
 * Convert a numeric epoch to milliseconds, regardless of input format.
 */
export function epochToMs(timestamp: number): number {
  return timestamp > MS_THRESHOLD ? timestamp : timestamp * 1000;
}
