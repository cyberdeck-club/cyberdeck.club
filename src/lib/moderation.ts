/**
 * Build moderation pipeline for cyberdeck.club.
 *
 * This module handles automated content review of build submissions.
 * The first pass uses basic validation checks to catch obvious spam
 * and content that violates simple rules. A second pass (LLM-based)
 * provides deeper content analysis for nuanced safety checks.
 *
 * The function signature and return type are designed to be easily
 * swappable with a real LLM integration later.
 */

export type AutoReviewResult = {
  passed: boolean;
  reason?: string;
  flaggedIssues?: string[];
  rawResult: string;
};

// URL regex pattern for detecting links
const URL_PATTERN = /https?:\/\/[^\s/$.?#].[^\s]*/gi;

// Excessive caps threshold (50% uppercase characters)
const EXCESSIVE_CAPS_THRESHOLD = 0.5;

/**
 * Run automated content review on a build submission.
 *
 * This is a two-stage process:
 *
 * 1. **Basic validation** (this implementation):
 *    - Checks for empty/too-short content
 *    - Checks for obviously spammy patterns (excessive URLs, all-caps, etc.)
 *    - Validates title and description length constraints
 *
 * 2. **LLM-based review** (TODO: future integration):
 *    - Deep content safety analysis
 *    - Contextual spam detection
 *    - Off-topic content identification
 *
 * The basic validation can reject obvious spam before any LLM call,
 * reducing costs and false positives for clear-cut cases.
 */
export async function autoReviewBuild(build: {
  title: string;
  description: string;
  content: string;
}): Promise<AutoReviewResult> {
  const flaggedIssues: string[] = [];

  // ─── Stage 1: Basic Validation Checks ───────────────────────────

  // Check 1: Title length validation
  // Title must be between 3 and 200 characters
  const titleLength = build.title?.trim().length ?? 0;
  if (titleLength < 3) {
    flaggedIssues.push("Title must be at least 3 characters long");
  }
  if (titleLength > 200) {
    flaggedIssues.push("Title must be 200 characters or less");
  }

  // Check 2: Description length validation
  // Description must be at least 10 characters
  const descriptionLength = build.description?.trim().length ?? 0;
  if (descriptionLength < 10) {
    flaggedIssues.push("Description must be at least 10 characters long");
  }

  // Check 3: Content length validation (if provided)
  // Content should be at least 50 characters if provided
  const contentLength = build.content?.trim().length ?? 0;
  if (contentLength > 0 && contentLength < 50) {
    flaggedIssues.push("Content must be at least 50 characters long if provided");
  }

  // Check 4: Excessive URL detection
  // Flag if there are more than 10 URLs in the content (potential spam)
  const contentText = build.content ?? "";
  const urls = contentText.match(URL_PATTERN) ?? [];
  if (urls.length > 10) {
    flaggedIssues.push(`Content contains too many URLs (${urls.length}). This looks like spam.`);
  }

  // Check 5: All-caps content detection
  // Flag if more than 50% of the content is uppercase (excluding code/markdown)
  if (contentLength > 0) {
    // Strip markdown formatting and URLs before checking caps
    const strippedContent = contentText
      .replace(URL_PATTERN, "")
      .replace(/[#*_~`[\]()]/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // markdown images
      .replace(/\[[^\]]*\]\([^)]*\)/g, ""); // markdown links

    const lettersOnly = strippedContent.replace(/[^a-zA-Z]/g, "");
    if (lettersOnly.length > 20) {
      const uppercaseCount = (strippedContent.match(/[A-Z]/g) ?? []).length;
      const uppercaseRatio = uppercaseCount / lettersOnly.length;
      if (uppercaseRatio > EXCESSIVE_CAPS_THRESHOLD) {
        flaggedIssues.push("Content contains too much uppercase text. This looks like shouting or spam.");
      }
    }
  }

  // Check 6: Excessive emoji/unicode characters (spam pattern)
  const emojiCount = (contentText.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) ?? []).length;
  const totalChars = contentText.length;
  if (totalChars > 50 && emojiCount > 20) {
    flaggedIssues.push(`Content contains too many emoji (${emojiCount}). This looks like spam.`);
  }

  // ─── Determine Pass/Fail ───────────────────────────────────────
  const passed = flaggedIssues.length === 0;

  // Build the audit result
  const result: AutoReviewResult = {
    passed,
    rawResult: JSON.stringify({
      status: passed ? "basic_pass" : "basic_fail",
      timestamp: new Date().toISOString(),
      checks: {
        titleLength,
        titleValid: titleLength >= 3 && titleLength <= 200,
        descriptionLength,
        descriptionValid: descriptionLength >= 10,
        contentLength,
        urlCount: urls.length,
        flaggedIssueCount: flaggedIssues.length,
      },
      flaggedIssues: flaggedIssues.length > 0 ? flaggedIssues : undefined,
      note: "Basic validation only. LLM integration TODO.",
      buildTitle: build.title?.slice(0, 50), // Truncate for logging
    }),
  };

  if (!passed) {
    result.reason = flaggedIssues.join("; ");
    result.flaggedIssues = flaggedIssues;
  }

  return result;
}
