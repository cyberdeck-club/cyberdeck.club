/**
 * Build review notification emails.
 *
 * Sends emails to build authors when their build is approved or needs revision.
 * Uses the Resend integration. Fire-and-forget with error logging.
 *
 * IMPORTANT: Never use the word "rejected" in user-facing copy.
 * This is a constructive feedback loop — use "needs revision," "feedback,"
 * or similar encouraging language per DESIGN.md §10.
 */

import { getResend } from "./resend";

const FROM_ADDRESS = "cyberdeck.club <builds@cyberdeck.club>";

/**
 * Send a "needs revision" email to a build author.
 * Warm, encouraging tone per DESIGN.md §10 — "a friend showing you something cool."
 */
export async function sendBuildNeedsRevisionEmail(opts: {
  to: string;
  displayName: string;
  buildTitle: string;
  buildSlug: string;
  feedback: string;
  siteUrl?: string;
}): Promise<void> {
  const { to, displayName, buildTitle, buildSlug, feedback, siteUrl = "https://cyberdeck.club" } = opts;
  const editUrl = `${siteUrl}/builds/${buildSlug}/edit`;

  const resend = getResend();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `✨ A little feedback on "${buildTitle}"`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="font-family: 'General Sans', 'Inter', system-ui, sans-serif; background-color: #faf8f5; color: #2a1a2e; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fffcf9; border: 3px solid #2a1a2e; border-radius: 4px; padding: 32px; box-shadow: 6px 6px 0 #2a1a2e;">

    <p style="font-size: 18px; line-height: 1.5; margin: 0 0 16px;">
      Hey ${displayName} 👋
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Thanks for submitting <strong>"${buildTitle}"</strong> — we love seeing
      what you're building! A reviewer took a look and had some feedback
      to help get it ready for the gallery.
    </p>

    <div style="background: #f5f0fa; border: 2px solid #7c3aed; border-radius: 4px; padding: 16px 20px; margin: 24px 0;">
      <p style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed; margin: 0 0 8px;">
        ▸ REVIEWER FEEDBACK
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #2a1a2e; margin: 0;">
        ${feedback}
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      No pressure — take your time, make the tweaks that feel right, and
      resubmit whenever you're ready. We'd love to see this in the gallery. ✨
    </p>

    <a href="${editUrl}" style="display: inline-block; background: #7c3aed; color: #fffcf9; font-weight: 600; font-size: 15px; padding: 12px 24px; border: 3px solid #2a1a2e; border-radius: 4px; text-decoration: none; box-shadow: 4px 4px 0 #2a1a2e;">
      Edit Your Build →
    </a>

    <p style="font-size: 13px; color: #6b5876; margin: 24px 0 0; line-height: 1.5;">
      You can also find all your builds at
      <a href="${siteUrl}/builds/mine" style="color: #7c3aed;">My Builds</a>.
      If you have questions, drop a note in the forum — folks here love to help.
    </p>

  </div>
</body>
</html>
      `.trim(),
      text: `Hey ${displayName}!\n\nThanks for submitting "${buildTitle}" — we love seeing what you're building! A reviewer took a look and had some feedback to help get it ready for the gallery.\n\nReviewer Feedback:\n${feedback}\n\nNo pressure — take your time, make the tweaks that feel right, and resubmit whenever you're ready. We'd love to see this in the gallery.\n\nEdit your build: ${editUrl}\n\nYou can also find all your builds at ${siteUrl}/builds/mine\n\n— cyberdeck.club`,
    });
  } catch (err) {
    console.error("[build-emails] Failed to send needs-revision email:", err);
  }
}

/**
 * Send a "build approved" celebratory email to a build author.
 * Celebratory tone per DESIGN.md §10.3 — "look what you made!"
 */
export async function sendBuildApprovedEmail(opts: {
  to: string;
  displayName: string;
  buildTitle: string;
  buildSlug: string;
  siteUrl?: string;
}): Promise<void> {
  const { to, displayName, buildTitle, buildSlug, siteUrl = "https://cyberdeck.club" } = opts;
  const buildUrl = `${siteUrl}/builds/${buildSlug}`;

  const resend = getResend();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `🎉 Your build "${buildTitle}" is live!`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="font-family: 'General Sans', 'Inter', system-ui, sans-serif; background-color: #faf8f5; color: #2a1a2e; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fffcf9; border: 3px solid #2a1a2e; border-radius: 4px; padding: 32px; box-shadow: 6px 6px 0 #2a1a2e;">

    <p style="font-size: 24px; margin: 0 0 16px; text-align: center;">
      🎉 ✨ 💅
    </p>

    <p style="font-size: 18px; line-height: 1.5; margin: 0 0 16px;">
      ${displayName}! Your build is live!
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      <strong>"${buildTitle}"</strong> has been approved and is now part of the
      cyberdeck.club gallery. The community can see it, be inspired by it,
      and learn from what you made. That's amazing.
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Share it around, show your friends, brag a little — you built a
      whole cyberdeck and it deserves to be seen. 💖
    </p>

    <a href="${buildUrl}" style="display: inline-block; background: #e8594a; color: #fffcf9; font-weight: 600; font-size: 15px; padding: 12px 24px; border: 3px solid #2a1a2e; border-radius: 4px; text-decoration: none; box-shadow: 4px 4px 0 #2a1a2e;">
      See Your Build →
    </a>

    <p style="font-size: 13px; color: #6b5876; margin: 24px 0 0; line-height: 1.5;">
      Keep building! You can submit more builds anytime from
      <a href="${siteUrl}/builds/mine" style="color: #7c3aed;">My Builds</a>.
    </p>

  </div>
</body>
</html>
      `.trim(),
      text: `${displayName}! Your build is live!\n\n"${buildTitle}" has been approved and is now part of the cyberdeck.club gallery. The community can see it, be inspired by it, and learn from what you made. That's amazing.\n\nShare it around, show your friends, brag a little — you built a whole cyberdeck and it deserves to be seen.\n\nSee your build: ${buildUrl}\n\nKeep building! You can submit more builds anytime from ${siteUrl}/builds/mine\n\n— cyberdeck.club`,
    });
  } catch (err) {
    console.error("[build-emails] Failed to send build-approved email:", err);
  }
}

/**
 * Send an admin notification email when a build is resubmitted for review.
 * Fire-and-forget with error logging — same pattern as the initial submission
 * notification in POST /api/builds.
 *
 * Uses display name only per AGENTS.md §4.1.
 */
export async function sendBuildResubmittedAdminEmail(opts: {
  adminEmail: string;
  fromAddress: string;
  buildTitle: string;
  builderDisplayName: string;
  buildSlug: string;
  siteUrl?: string;
}): Promise<void> {
  const {
    adminEmail,
    fromAddress,
    buildTitle,
    builderDisplayName,
    buildSlug,
    siteUrl = "https://cyberdeck.club",
  } = opts;

  if (!adminEmail) return;

  const resend = getResend();

  try {
    await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `[cyberdeck.club] Build resubmitted for review: ${buildTitle}`,
      html: `
        <h2>Build Resubmitted for Review</h2>
        <p><strong>${builderDisplayName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong> has revised and resubmitted a build that is waiting for human review.</p>
        <table style="border-collapse: collapse; margin: 1rem 0;">
          <tr>
            <td style="padding: 0.5rem 1rem; font-weight: bold;">Build Title</td>
            <td style="padding: 0.5rem 1rem;">${buildTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
          </tr>
          <tr>
            <td style="padding: 0.5rem 1rem; font-weight: bold;">Resubmitted By</td>
            <td style="padding: 0.5rem 1rem;">${builderDisplayName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
          </tr>
        </table>
        <p><a href="${siteUrl}/admin/builds">Review in the moderation queue →</a></p>
        <p><a href="${siteUrl}/builds/${buildSlug}">View the build →</a></p>
        <p><em>Sent automatically by cyberdeck.club</em></p>
      `,
    });
  } catch (err) {
    console.error("[build-emails] Failed to send resubmission admin notification email:", err);
  }
}
