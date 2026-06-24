/**
 * Notification email dispatch.
 *
 * Sends email notifications for subscription-triggered events (new forum
 * replies, wiki updates, wiki comments, build comments). Fire-and-forget
 * with error logging — email failures never throw or block the caller.
 *
 * Follows the same HTML template style as build-emails.ts.
 */

import { getResend } from "./resend";
import type { NotificationType } from "./notifications";

const FROM_ADDRESS = "cyberdeck.club <notifications@cyberdeck.club>";

/**
 * Human-readable labels for notification types.
 */
const TYPE_LABELS: Record<NotificationType, string> = {
  new_forum_post: "New Forum Reply",
  wiki_updated: "Wiki Article Updated",
  wiki_comment: "New Wiki Comment",
  new_build_comment: "New Build Comment",
};

/**
 * Generate a default body string when no explicit body is provided.
 */
function defaultBody(type: NotificationType, actorName?: string): string {
  const actor = actorName ?? "Someone";
  switch (type) {
    case "new_forum_post":
      return `${actor} posted a new reply in a thread you're subscribed to.`;
    case "wiki_updated":
      return `${actor} updated a wiki article you're subscribed to.`;
    case "wiki_comment":
      return `${actor} left a comment on a wiki article you're subscribed to.`;
    case "new_build_comment":
      return `${actor} commented on a build you're subscribed to.`;
  }
}

/**
 * Send a notification email for a subscription-triggered event.
 *
 * Fire-and-forget — logs errors but never throws.
 */
export async function sendNotificationEmail(opts: {
  to: string;
  displayName: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityUrl: string;
  actorName?: string;
  siteUrl?: string;
}): Promise<void> {
  const {
    to,
    displayName,
    type,
    title,
    body,
    entityUrl,
    actorName,
    siteUrl = "https://cyberdeck.club",
  } = opts;

  const typeLabel = TYPE_LABELS[type];
  const messageBody = body ?? defaultBody(type, actorName);
  const fullUrl = entityUrl.startsWith("http")
    ? entityUrl
    : `${siteUrl}${entityUrl}`;

  const resend = getResend();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `[cyberdeck.club] ${title}`,
      html: buildNotificationHtml({
        displayName,
        typeLabel,
        title,
        messageBody,
        fullUrl,
      }),
      text: buildNotificationText({
        displayName,
        typeLabel,
        title,
        messageBody,
        fullUrl,
      }),
    });
  } catch (err) {
    console.error("[notification-email] Failed to send notification email:", err);
  }
}

// ── Email templates ──────────────────────────────────────────────────

function buildNotificationHtml(opts: {
  displayName: string;
  typeLabel: string;
  title: string;
  messageBody: string;
  fullUrl: string;
}): string {
  const { displayName, typeLabel, title, messageBody, fullUrl } = opts;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="font-family: 'General Sans', 'Inter', system-ui, sans-serif; background-color: #faf8f5; color: #2a1a2e; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fffcf9; border: 3px solid #2a1a2e; border-radius: 4px; padding: 32px; box-shadow: 6px 6px 0 #2a1a2e;">

    <p style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed; margin: 0 0 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace;">
      ▸ ${typeLabel}
    </p>

    <p style="font-size: 18px; line-height: 1.5; margin: 0 0 16px;">
      Hey ${displayName}!
    </p>

    <div style="background: #f5f0fa; border: 2px solid #7c3aed; border-radius: 4px; padding: 16px 20px; margin: 24px 0;">
      <p style="font-size: 17px; font-weight: 700; color: #2a1a2e; margin: 0 0 8px;">
        ${title}
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #2a1a2e; margin: 0;">
        ${messageBody}
      </p>
    </div>

    <a href="${fullUrl}" style="display: inline-block; background: #7c3aed; color: #fffcf9; font-weight: 600; font-size: 15px; padding: 12px 24px; border: 3px solid #2a1a2e; border-radius: 4px; text-decoration: none; box-shadow: 4px 4px 0 #2a1a2e;">
      View It →
    </a>

    <p style="font-size: 13px; color: #6b5876; margin: 24px 0 0; line-height: 1.5;">
      You're receiving this because you subscribed to this content on
      <a href="https://cyberdeck.club" style="color: #7c3aed;">cyberdeck.club</a>.
    </p>

  </div>
</body>
</html>
  `.trim();
}

function buildNotificationText(opts: {
  displayName: string;
  typeLabel: string;
  title: string;
  messageBody: string;
  fullUrl: string;
}): string {
  const { displayName, typeLabel, title, messageBody, fullUrl } = opts;

  return [
    `Hey ${displayName}!`,
    "",
    `▸ ${typeLabel}`,
    "",
    title,
    "",
    messageBody,
    "",
    `View it: ${fullUrl}`,
    "",
    "— cyberdeck.club",
    "",
    "You're receiving this because you subscribed to this content on cyberdeck.club.",
  ].join("\n");
}
