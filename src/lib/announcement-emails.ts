/**
 * Announcement email blast.
 *
 * Sends a notification email to all eligible registered users when an
 * announcement is published. Fire-and-forget with error logging — email
 * failures never block the API response.
 *
 * Filters:
 *   - Excludes banned users (bannedAt is set)
 *   - Excludes @aster.hn test accounts
 *
 * Uses Resend batch API (up to 100 per batch call). For communities
 * larger than 100 members, chunks automatically.
 */

import { isNull } from "drizzle-orm";
import { getResend } from "./resend";
import { user } from "@/db/auth-schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";

const FROM_ADDRESS = "cyberdeck.club <announcements@cyberdeck.club>";
const BATCH_SIZE = 100; // Resend batch limit

interface AnnouncementEmailOpts {
  db: DrizzleD1Database<typeof schema>;
  announcementTitle: string;
  announcementContent: string;
  announcementId: string;
  siteUrl?: string;
}

/**
 * Generate a plain-text excerpt from markdown/HTML content.
 * Strips markdown formatting and truncates to ~300 chars.
 */
function makeExcerpt(content: string, maxLength = 300): string {
  const plain = content
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove markdown bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove markdown links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

/**
 * Send the announcement email blast to all eligible users.
 *
 * This is fire-and-forget — call it without awaiting in the API handler,
 * or pass it to waitUntil() if available. Logs success/failure counts.
 */
export async function sendAnnouncementEmailBlast(
  opts: AnnouncementEmailOpts
): Promise<void> {
  const {
    db,
    announcementTitle,
    announcementContent,
    announcementId,
    siteUrl = "https://cyberdeck.club",
  } = opts;

  const announcementUrl = `${siteUrl}/announcements`;
  const excerpt = makeExcerpt(announcementContent);

  try {
    // Query all non-banned users
    const allUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        bannedAt: user.bannedAt,
      })
      .from(user)
      .where(isNull(user.bannedAt));

    // Filter out @aster.hn test accounts
    const eligibleUsers = allUsers.filter(
      (u) => !u.email.endsWith("@aster.hn")
    );

    if (eligibleUsers.length === 0) {
      console.log(
        "[announcement-emails] No eligible recipients — skipping blast."
      );
      return;
    }

    console.log(
      `[announcement-emails] Sending "${announcementTitle}" to ${eligibleUsers.length} recipients…`
    );

    const resend = getResend();
    let sentCount = 0;
    let failedCount = 0;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + BATCH_SIZE);

      const emails = batch.map((recipient) => ({
        from: FROM_ADDRESS,
        to: recipient.email,
        subject: `📢 New from cyberdeck.club: ${announcementTitle}`,
        html: buildAnnouncementHtml({
          displayName: recipient.name,
          title: announcementTitle,
          excerpt,
          announcementUrl,
        }),
        text: buildAnnouncementText({
          displayName: recipient.name,
          title: announcementTitle,
          excerpt,
          announcementUrl,
        }),
      }));

      try {
        await resend.batch.send(emails);
        sentCount += batch.length;
      } catch (batchErr) {
        console.error(
          `[announcement-emails] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
          batchErr
        );
        failedCount += batch.length;
      }
    }

    console.log(
      `[announcement-emails] Done. Sent: ${sentCount}, Failed: ${failedCount} (announcement: ${announcementId})`
    );
  } catch (err) {
    console.error(
      "[announcement-emails] Failed to send announcement blast:",
      err
    );
  }
}

// ── Email templates ──────────────────────────────────────────────────

function buildAnnouncementHtml(opts: {
  displayName: string;
  title: string;
  excerpt: string;
  announcementUrl: string;
}): string {
  const { displayName, title, excerpt, announcementUrl } = opts;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="font-family: 'General Sans', 'Inter', system-ui, sans-serif; background-color: #faf8f5; color: #2a1a2e; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fffcf9; border: 3px solid #2a1a2e; border-radius: 4px; padding: 32px; box-shadow: 6px 6px 0 #2a1a2e;">

    <p style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #e8594a; margin: 0 0 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace;">
      📢 ANNOUNCEMENT
    </p>

    <p style="font-size: 18px; line-height: 1.5; margin: 0 0 16px;">
      Hey ${displayName} 👋
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      We have news to share with the community!
    </p>

    <div style="background: #f5f0fa; border: 2px solid #7c3aed; border-radius: 4px; padding: 16px 20px; margin: 24px 0;">
      <p style="font-size: 17px; font-weight: 700; color: #2a1a2e; margin: 0 0 8px;">
        ${title}
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #2a1a2e; margin: 0;">
        ${excerpt}
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Head over to the announcements page to read the full update. 💖
    </p>

    <a href="${announcementUrl}" style="display: inline-block; background: #e8594a; color: #fffcf9; font-weight: 600; font-size: 15px; padding: 12px 24px; border: 3px solid #2a1a2e; border-radius: 4px; text-decoration: none; box-shadow: 4px 4px 0 #2a1a2e;">
      Read the Full Announcement →
    </a>

    <p style="font-size: 13px; color: #6b5876; margin: 24px 0 0; line-height: 1.5;">
      You're receiving this because you're a member of
      <a href="https://cyberdeck.club" style="color: #7c3aed;">cyberdeck.club</a>.
      We only send emails for important updates — no spam, ever.
    </p>

  </div>
</body>
</html>
  `.trim();
}

function buildAnnouncementText(opts: {
  displayName: string;
  title: string;
  excerpt: string;
  announcementUrl: string;
}): string {
  const { displayName, title, excerpt, announcementUrl } = opts;

  return [
    `Hey ${displayName}!`,
    "",
    "We have news to share with the community!",
    "",
    `📢 ${title}`,
    "",
    excerpt,
    "",
    "Head over to the announcements page to read the full update.",
    "",
    `Read the full announcement: ${announcementUrl}`,
    "",
    "— cyberdeck.club",
    "",
    "You're receiving this because you're a member of cyberdeck.club. We only send emails for important updates — no spam, ever.",
  ].join("\n");
}
