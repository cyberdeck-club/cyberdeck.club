import type { APIRoute } from "astro";
import { uploadToR2, buildFeedbackImageKey } from "../../lib/r2";
import { createFeedbackIssue, addIssueToProject } from "../../lib/github-feedback";
import { env } from "cloudflare:workers";

/**
 * POST /api/feedback
 *
 * Processes feedback submissions from the feedback widget.
 * Requires authenticated user.
 *
 *  Body: multipart/form-data
 *   - description (string, required) — The user's feedback text
 *   - pageUrl (string, required) — URL of the page the feedback is about
 *   - autoScreenshot (File, optional) — The auto-captured screenshot (may be absent if html2canvas fails)
 *   - userScreenshots (File[], optional) — Additional user-uploaded screenshots
 */
export const POST: APIRoute = async (ctx) => {
  // Require authentication
  if (!ctx.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = ctx.locals.user;

  // Parse FormData
  let formData: FormData;
  try {
    formData = await ctx.request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract fields
  const description = formData.get("description");
  const pageUrl = formData.get("pageUrl");
  const autoScreenshot = formData.get("autoScreenshot");
  const userScreenshots = formData.getAll("userScreenshots");

  // Validate description
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return new Response(JSON.stringify({ error: "description is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate pageUrl
  if (!pageUrl || typeof pageUrl !== "string" || pageUrl.trim().length === 0) {
    return new Response(JSON.stringify({ error: "pageUrl is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check autoScreenshot — use duck-typing instead of instanceof because
  // instanceof File/Blob is unreliable in Cloudflare Workers runtime (the
  // global constructors may differ from those used internally by FormData).
  // The auto-screenshot is optional — html2canvas may fail on the client side.
  const screenshotObj = autoScreenshot as unknown as Record<string, unknown> | null;
  const hasValidAutoScreenshot =
    screenshotObj &&
    typeof screenshotObj === "object" &&
    typeof screenshotObj.arrayBuffer === "function" &&
    typeof screenshotObj.size === "number" &&
    (screenshotObj.size as number) > 0;

  const timestamp = Date.now();
  const username = user.name ?? "anonymous";

  try {
    // Upload auto-screenshot to R2 (only if present and valid)
    let autoScreenshotUrl = "";
    if (hasValidAutoScreenshot) {
      const screenshotFile = screenshotObj as unknown as { arrayBuffer(): Promise<ArrayBuffer>; type: string; size: number };
      const autoArrayBuffer = await screenshotFile.arrayBuffer();
      const autoContentType = screenshotFile.type || "image/png";
      const autoExtension = getExtensionFromContentType(autoContentType) ?? "png";
      const autoKey = buildFeedbackImageKey(username, timestamp, "auto", 0, autoExtension);
      autoScreenshotUrl = await uploadToR2(autoKey, autoArrayBuffer, autoContentType);
    }

    // Upload user screenshots to R2 (if any)
    const userScreenshotUrls: string[] = [];
    for (let i = 0; i < userScreenshots.length; i++) {
      const file = userScreenshots[i];
      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const contentType = file.type || "image/png";
        const extension = getExtensionFromContentType(contentType) ?? "png";
        const key = buildFeedbackImageKey(username, timestamp, "user", i + 1, extension);
        const url = await uploadToR2(key, arrayBuffer, contentType);
        userScreenshotUrls.push(url);
      }
    }

    // Create GitHub issue
    const title =
      description.length > 80 ? description.slice(0, 80) + "..." : description;

    const sanitizedTitle = title.split("---")[0].trim(); // strip the auto-screenshot warning suffix if present, to keep issue titles clean

    const result = await createFeedbackIssue({
      title: sanitizedTitle,
      description: description.trim(),
      pageUrl: pageUrl.trim(),
      submitterEmail: user.email,
      submitterName: user.name,
      submitterId: user.id,
      submitterUsername: user.name,
      baseUrl: (env as App.Env).PUBLIC_BASE_URL ?? "https://cyberdeck.club",
      autoScreenshotUrl,
      userScreenshotUrls,
      submittedAt: new Date().toISOString(),
    });

    // Add issue to project (non-blocking)
    try {
      await addIssueToProject(result.issueNodeId);
    } catch (projectError) {
      // Log but don't fail — the issue was already created successfully
      console.error("Failed to add feedback issue to project:", projectError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        issueNumber: result.issueNumber,
        issueUrl: result.issueUrl,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Feedback submission error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to submit feedback" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Extract file extension from MIME content type.
 */
function getExtensionFromContentType(contentType: string): string | null {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  return map[contentType] ?? null;
}
