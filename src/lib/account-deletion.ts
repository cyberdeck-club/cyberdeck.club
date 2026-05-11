/**
 * Account deletion logic for cyberdeck.club.
 *
 * Reassigns all user-authored content to a system [deleted] user AND
 * scrubs the content body to '[deleted]' so no remnant copy remains.
 * Nullifies self-referential FKs on other users, removes non-cascaded
 * junction rows, then deletes the user record (which cascades to
 * session, account, personalAccessTokens, patUsageLogs).
 */

import { Resend } from "resend";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../db/schema";
import { user } from "../db/auth-schema";
import {
  wikiArticles,
  wikiRevisions,
  forumThreads,
  forumPosts,
  builds,
  meetups,
  staticPages,
  buildComments,
  wikiComments,
  editHistory,
  communityGuidelinesAcceptances,
} from "../db/schema";

/** DB type matching the app's schematized Drizzle instance. */
type AppDb = DrizzleD1Database<typeof schema>;

/** Placeholder text that replaces all user-authored content on deletion. */
const SCRUBBED = "[deleted]";

/** Well-known ID for the system [deleted] placeholder user. */
export const DELETED_USER_ID = "system-deleted-user";

/** Email address used by the system [deleted] user (not a real mailbox). */
export const DELETED_USER_EMAIL = "deleted@system.cyberdeck.club";

/**
 * Ensures the system [deleted] user exists and returns its ID.
 *
 * If the user already exists the function is a no-op.  If not, it
 * creates a minimal member-role record that content can be reassigned to.
 */
export async function getOrCreateDeletedUser(db: AppDb): Promise<string> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, DELETED_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    return DELETED_USER_ID;
  }

  const now = new Date();
  await db.insert(user).values({
    id: DELETED_USER_ID,
    name: "[deleted]",
    email: DELETED_USER_EMAIL,
    emailVerified: false,
    role: "member",
    createdAt: now,
    updatedAt: now,
  });

  return DELETED_USER_ID;
}

/**
 * Permanently deletes a user account.
 *
 * 1. Reassign all authored content to `deletedUserId` AND scrub content
 *    bodies to '[deleted]'.
 * 2. Nullify self-referential FKs on *other* users.
 * 3. Delete non-cascaded junction rows.
 * 4. Delete the user record (cascades auth rows + PATs).
 *
 * @returns Summary of how many rows were reassigned per table.
 */
export async function deleteUserAccount(
  db: AppDb,
  userId: string,
  deletedUserId: string
): Promise<{ reassigned: Record<string, number> }> {
  const reassigned: Record<string, number> = {};

  // ── 1. Reassign authored content + scrub bodies ───────────────────

  // wiki_articles — reassign author, scrub title/content/excerpt
  const wikiArticleRows = await db
    .select({ id: wikiArticles.id })
    .from(wikiArticles)
    .where(eq(wikiArticles.authorId, userId));
  reassigned.wiki_articles = wikiArticleRows.length;
  if (wikiArticleRows.length > 0) {
    await db
      .update(wikiArticles)
      .set({
        authorId: deletedUserId,
        title: SCRUBBED,
        content: SCRUBBED,
        excerpt: SCRUBBED,
      })
      .where(eq(wikiArticles.authorId, userId));
  }

  // wiki_revisions — reassign author, scrub title/content/diffSummary
  const wikiRevisionRows = await db
    .select({ id: wikiRevisions.id })
    .from(wikiRevisions)
    .where(eq(wikiRevisions.authorId, userId));
  reassigned.wiki_revisions = wikiRevisionRows.length;
  if (wikiRevisionRows.length > 0) {
    await db
      .update(wikiRevisions)
      .set({
        authorId: deletedUserId,
        title: SCRUBBED,
        content: SCRUBBED,
        diffSummary: SCRUBBED,
      })
      .where(eq(wikiRevisions.authorId, userId));
  }

  // forum_threads — reassign author, scrub title
  const forumThreadAuthorRows = await db
    .select({ id: forumThreads.id })
    .from(forumThreads)
    .where(eq(forumThreads.authorId, userId));
  reassigned.forum_threads = forumThreadAuthorRows.length;
  if (forumThreadAuthorRows.length > 0) {
    await db
      .update(forumThreads)
      .set({
        authorId: deletedUserId,
        title: SCRUBBED,
      })
      .where(eq(forumThreads.authorId, userId));
  }

  // forum_threads.lastReplyUserId — reassign only (no content to scrub)
  const forumThreadLastReplyRows = await db
    .select({ id: forumThreads.id })
    .from(forumThreads)
    .where(eq(forumThreads.lastReplyUserId, userId));
  reassigned.forum_threads_last_reply = forumThreadLastReplyRows.length;
  if (forumThreadLastReplyRows.length > 0) {
    await db
      .update(forumThreads)
      .set({ lastReplyUserId: deletedUserId })
      .where(eq(forumThreads.lastReplyUserId, userId));
  }

  // forum_posts — reassign author, scrub content
  const forumPostRows = await db
    .select({ id: forumPosts.id })
    .from(forumPosts)
    .where(eq(forumPosts.authorId, userId));
  reassigned.forum_posts = forumPostRows.length;
  if (forumPostRows.length > 0) {
    await db
      .update(forumPosts)
      .set({
        authorId: deletedUserId,
        content: SCRUBBED,
      })
      .where(eq(forumPosts.authorId, userId));
  }

  // builds — reassign author, scrub title/description/content
  const buildAuthorRows = await db
    .select({ id: builds.id })
    .from(builds)
    .where(eq(builds.authorId, userId));
  reassigned.builds = buildAuthorRows.length;
  if (buildAuthorRows.length > 0) {
    await db
      .update(builds)
      .set({
        authorId: deletedUserId,
        title: SCRUBBED,
        description: SCRUBBED,
        content: SCRUBBED,
      })
      .where(eq(builds.authorId, userId));
  }

  // builds.reviewedBy — reassign only (reviewer, not content author)
  const buildReviewerRows = await db
    .select({ id: builds.id })
    .from(builds)
    .where(eq(builds.reviewedBy, userId));
  reassigned.builds_reviewed_by = buildReviewerRows.length;
  if (buildReviewerRows.length > 0) {
    await db
      .update(builds)
      .set({ reviewedBy: deletedUserId })
      .where(eq(builds.reviewedBy, userId));
  }

  // meetups — reassign organizer, scrub title/description/content
  const meetupRows = await db
    .select({ id: meetups.id })
    .from(meetups)
    .where(eq(meetups.organizerId, userId));
  reassigned.meetups = meetupRows.length;
  if (meetupRows.length > 0) {
    await db
      .update(meetups)
      .set({
        organizerId: deletedUserId,
        title: SCRUBBED,
        description: SCRUBBED,
        content: SCRUBBED,
      })
      .where(eq(meetups.organizerId, userId));
  }

  // static_pages — reassign author, scrub title/content
  const staticPageRows = await db
    .select({ id: staticPages.id })
    .from(staticPages)
    .where(eq(staticPages.authorId, userId));
  reassigned.static_pages = staticPageRows.length;
  if (staticPageRows.length > 0) {
    await db
      .update(staticPages)
      .set({
        authorId: deletedUserId,
        title: SCRUBBED,
        content: SCRUBBED,
      })
      .where(eq(staticPages.authorId, userId));
  }

  // build_comments — reassign author, scrub content
  const buildCommentRows = await db
    .select({ id: buildComments.id })
    .from(buildComments)
    .where(eq(buildComments.authorId, userId));
  reassigned.build_comments = buildCommentRows.length;
  if (buildCommentRows.length > 0) {
    await db
      .update(buildComments)
      .set({
        authorId: deletedUserId,
        content: SCRUBBED,
      })
      .where(eq(buildComments.authorId, userId));
  }

  // wiki_comments — reassign author, scrub content
  const wikiCommentRows = await db
    .select({ id: wikiComments.id })
    .from(wikiComments)
    .where(eq(wikiComments.authorId, userId));
  reassigned.wiki_comments = wikiCommentRows.length;
  if (wikiCommentRows.length > 0) {
    await db
      .update(wikiComments)
      .set({
        authorId: deletedUserId,
        content: SCRUBBED,
      })
      .where(eq(wikiComments.authorId, userId));
  }

  // edit_history — reassign editor, scrub changesSummary/previousContent
  const editHistoryRows = await db
    .select({ id: editHistory.id })
    .from(editHistory)
    .where(eq(editHistory.editorId, userId));
  reassigned.edit_history = editHistoryRows.length;
  if (editHistoryRows.length > 0) {
    await db
      .update(editHistory)
      .set({
        editorId: deletedUserId,
        changesSummary: SCRUBBED,
        previousContent: SCRUBBED,
      })
      .where(eq(editHistory.editorId, userId));
  }

  // ── 2. Nullify self-referential FKs on OTHER users ────────────────

  await db
    .update(user)
    .set({ modNominatedBy: null })
    .where(eq(user.modNominatedBy, userId));

  await db
    .update(user)
    .set({ bannedBy: null })
    .where(eq(user.bannedBy, userId));

  // ── 3. Delete non-cascaded junction rows ──────────────────────────

  await db
    .delete(communityGuidelinesAcceptances)
    .where(eq(communityGuidelinesAcceptances.userId, userId));

  // ── 4. Delete the user record ─────────────────────────────────────
  // Cascades: session, account, personalAccessTokens, patUsageLogs

  await db.delete(user).where(eq(user.id, userId));

  return { reassigned };
}

// ---------------------------------------------------------------------------
// Email notifications for account deletion
// ---------------------------------------------------------------------------

export async function sendAccountDeletionEmails(options: {
  resendApiKey: string;
  fromAddress: string;
  deletedUserEmail: string;
  deletedUserName: string;
  adminEmail: string;
  deletedBy: "self" | "admin";
  adminName?: string;
  adminNote?: string;
}): Promise<void> {
  const {
    resendApiKey,
    fromAddress,
    deletedUserEmail,
    deletedUserName,
    adminEmail,
    deletedBy,
    adminName,
    adminNote,
  } = options;

  const resend = new Resend(resendApiKey);
  const timestamp = new Date().toISOString();
  const displayName = deletedUserName || "there";

  // ── Email to the deleted user ───────────────────────────────────────
  const userSubject =
    deletedBy === "self"
      ? "Your cyberdeck.club account has been deleted"
      : "Your cyberdeck.club account has been deleted by an administrator";

  const userBody =
    deletedBy === "self"
      ? `
        <h1>Goodbye, ${displayName} 💜</h1>
        <p>Your cyberdeck.club account has been deleted as you requested.</p>
        <p>All of your content (builds, forum posts, wiki edits, and comments)
        has been anonymized — it's no longer linked to your name or profile.</p>
        <p>We're sorry to see you go. If you ever want to come back and share
        your builds with us again, you're always welcome.</p>
        <p>Take care,<br/>The cyberdeck.club community</p>
      `
      : `
        <h1>Account deletion notice</h1>
        <p>Hi ${displayName},</p>
        <p>Your cyberdeck.club account has been deleted by an administrator.</p>
        <p>All of your content (builds, forum posts, wiki edits, and comments)
        has been anonymized — it's no longer linked to your name or profile.</p>
        ${adminNote
        ? `<div style="margin: 1rem 0; padding: 0.75rem 1rem; border-left: 4px solid #888; background-color: #f5f5f5;">
                <p style="margin: 0 0 0.25rem; font-weight: 600;">Note from the administrator:</p>
                <p style="margin: 0;">${adminNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>`
        : ""
      }
        <p>If you believe this was done in error, you can reach out to us by
        replying to this email.</p>
        <p>— The cyberdeck.club team</p>
      `;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: deletedUserEmail,
      subject: userSubject,
      html: userBody,
    });
  } catch (err) {
    console.error("[account-deletion] Failed to send user notification email:", err);
  }

  // ── Email to admin ──────────────────────────────────────────────────
  if (!adminEmail) return;

  const initiator =
    deletedBy === "self"
      ? `${deletedUserName} (self-deletion)`
      : `Admin: ${adminName ?? "unknown"}`;

  const adminBody = `
    <h1>Account deleted on cyberdeck.club</h1>
    <p><strong>User:</strong> ${deletedUserName}</p>
    <p><strong>Email:</strong> ${deletedUserEmail}</p>
    <p><strong>Deleted by:</strong> ${initiator}</p>
    <p><strong>Timestamp:</strong> ${timestamp}</p>
    ${adminNote
      ? `<div style="margin: 1rem 0; padding: 0.75rem 1rem; border-left: 4px solid #888; background-color: #f5f5f5;">
            <p style="margin: 0 0 0.25rem; font-weight: 600;">Note from the administrator:</p>
            <p style="margin: 0;">${adminNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>`
      : ""
    }
    <p>All user content has been anonymized and reassigned to the system [deleted] user.</p>
  `;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `[cyberdeck.club] Account deleted: ${deletedUserName}`,
      html: adminBody,
    });
  } catch (err) {
    console.error("[account-deletion] Failed to send admin notification email:", err);
  }
}
