/**
 * Beta access utility functions for cyberdeck.club.
 *
 * These functions handle beta signup requests, approvals, rejections, and waitlisting.
 */

import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Resend } from "resend";
import * as schema from "../db/schema";
import { betaSignups } from "../db/schema";
import { getResend } from "./resend";

export type BetaSignup = {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "waitlisted";
  displayName: string;
  interestReason: string;
  makingBackground: string | null;
  referralSource: string | null;
  reviewNotes: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
};

export type CreateBetaSignupData = {
  email: string;
  displayName: string;
  interestReason: string;
  makingBackground?: string;
  referralSource?: string;
};

/**
 * Check if the request is for the beta site.
 * Returns true if hostname is beta.cyberdeck.club OR URL has beta=true param.
 */
export function isBetaSite(request: Request): boolean {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  // Check for beta subdomain
  if (hostname === "beta.cyberdeck.club") {
    return true;
  }

  // Check for beta=true query param
  if (url.searchParams.get("beta") === "true") {
    return true;
  }

  return false;
}

/**
 * Look up an existing beta signup by email address.
 */
export async function getBetaSignupByEmail(
  db: DrizzleD1Database<typeof schema>,
  email: string
): Promise<BetaSignup | undefined> {
  const normalizedEmail = email.toLowerCase().trim();

  const results = await db
    .select()
    .from(betaSignups)
    .where(eq(betaSignups.email, normalizedEmail))
    .limit(1);

  return results[0] as BetaSignup | undefined;
}

/**
 * Create a new pending beta signup.
 */
export async function createBetaSignup(
  db: DrizzleD1Database<typeof schema>,
  data: CreateBetaSignupData
): Promise<BetaSignup> {
  const normalizedEmail = data.email.toLowerCase().trim();

  const [signup] = await db
    .insert(betaSignups)
    .values({
      email: normalizedEmail,
      displayName: data.displayName,
      interestReason: data.interestReason,
      makingBackground: data.makingBackground ?? null,
      referralSource: data.referralSource ?? null,
      status: "pending",
    })
    .returning();

  return signup as BetaSignup;
}

/**
 * Approve a beta signup.
 */
export async function approveBetaSignup(
  db: DrizzleD1Database<typeof schema>,
  signupId: string,
  reviewerId: string
): Promise<BetaSignup> {
  const [signup] = await db
    .update(betaSignups)
    .set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    })
    .where(eq(betaSignups.id, signupId))
    .returning();

  return signup as BetaSignup;
}

/**
 * Reject a beta signup.
 */
export async function rejectBetaSignup(
  db: DrizzleD1Database<typeof schema>,
  signupId: string,
  reviewerId: string,
  reason?: string
): Promise<BetaSignup> {
  const [signup] = await db
    .update(betaSignups)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      rejectionReason: reason ?? null,
    })
    .where(eq(betaSignups.id, signupId))
    .returning();

  return signup as BetaSignup;
}

/**
 * Waitlist a beta signup.
 */
export async function waitlistBetaSignup(
  db: DrizzleD1Database<typeof schema>,
  signupId: string,
  reviewerId: string
): Promise<BetaSignup> {
  const [signup] = await db
    .update(betaSignups)
    .set({
      status: "waitlisted",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    })
    .where(eq(betaSignups.id, signupId))
    .returning();

  return signup as BetaSignup;
}

/**
 * Get the admin URL for beta management.
 */
function getAdminUrl(): string {
  const baseUrl =
    typeof import.meta.env !== "undefined" && import.meta.env.PUBLIC_BASE_URL
      ? import.meta.env.PUBLIC_BASE_URL
      : "http://localhost:8787";
  return `${baseUrl}/admin/beta`;
}

/**
 * Send notification email to admin about a new beta signup request.
 */
export async function sendBetaAdminNotification(
  resend: Resend,
  fromAddress: string,
  adminEmail: string,
  signup: {
    displayName: string;
    email: string;
    interestReason: string;
    makingBackground?: string | null;
    referralSource?: string | null;
  }
): Promise<void> {
  const siteUrl =
    typeof import.meta.env !== "undefined" && import.meta.env.PUBLIC_BASE_URL
      ? import.meta.env.PUBLIC_BASE_URL
      : "http://localhost:8788";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: adminEmail,
    subject: `New beta request from ${signup.displayName}`,
    html: `
      <h1>New beta access request</h1>
      
      <p><strong>Name:</strong> ${signup.displayName}</p>
      <p><strong>Email:</strong> ${signup.email}</p>
      
      <p><strong>What's drawing them to cyberdecks:</strong></p>
      <p>${signup.interestReason}</p>
      
      <p><strong>Making background:</strong></p>
      <p>${signup.makingBackground || "Not provided"}</p>
      
      <p><strong>How they heard about us:</strong></p>
      <p>${signup.referralSource || "Not provided"}</p>
      
      <p><a href="${siteUrl}/admin/beta/">Review at the admin panel →</a></p>
    `,
  });

  if (error) {
    console.error("[beta] Failed to send admin notification:", {
      signupEmail: signup.email,
      error: error.message,
    });
    throw new Error("Failed to send admin notification");
  }

  console.log("[beta] Admin notification sent for:", signup.email);
}

/**
 * Send application received email to the user.
 */
export async function sendBetaApplicationReceivedEmail(
  resend: Resend,
  fromAddress: string,
  displayName: string,
  email: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "We got your request! 🔧",
    html: `
      <p>Hey ${displayName},</p>
      
      <p>Thanks for requesting beta access to cyberdeck.club — we're glad you found us.</p>
      
      <p>We're reviewing requests by hand (a real person, not an algorithm), so it might take a day or two. We'll email you when you're in.</p>
      
      <p>While you wait: we're building this community specifically for folks who are curious about cyberdecks as creative projects — not just as tactical gear or survival tools. People making builds in toy cases, vintage purses, compact mirrors, lunchboxes, dinosaur toys, and whatever else sparks joy. If that sounds like your kind of thing, you're probably going to love it here.</p>
      
      <p>Talk soon,</p>
      <p>cyberdeck.club</p>
    `,
  });

  if (error) {
    console.error("[beta] Failed to send application received email:", {
      email,
      error: error.message,
    });
    throw new Error("Failed to send application received email");
  }

  console.log("[beta] Application received email sent to:", email);
}

/**
 * Send approval email with magic link to the user.
 */
export async function sendBetaApprovalEmail(
  resend: Resend,
  fromAddress: string,
  displayName: string,
  email: string,
  magicLinkUrl: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "You're in! Welcome to cyberdeck.club 🎉",
    html: `
      <p>Hey ${displayName},</p>
      
      <p>You've got beta access to cyberdeck.club! Here's your magic link to log in:</p>
      
      <p><a href="${magicLinkUrl}">Sign in to cyberdeck.club →</a></p>
      
      <p>(If this link expires, you can request a new one from the main page.)</p>
      
      <p>A few things to know as you poke around:</p>
      
      <p>— It's beta. Things might be rough, weird, or broken. That's expected. If something doesn't work, we genuinely want to hear about it — you're helping us shape this.</p>
      
      <p>— This is a space for everyone who makes things. Whether you've been building cyberdecks for years or you just learned what a Raspberry Pi is last week, you belong here. We don't do gatekeeping, we don't do "well actually," and we don't do "real makers."</p>
      
      <p>— The vibe is the vibe. We have a code of conduct (you'll see it during setup). The short version: be kind, don't assume what people know, use the pronouns people give you, and remember that someone's Polly Pocket build is just as valid as someone's milled aluminum chassis.</p>
      
      <p>We're a small crew right now, so your feedback matters a lot. If you have thoughts on what's working, what's confusing, or what's missing, we want to hear all of it.</p>
      
      <p>Welcome aboard,</p>
      <p>cyberdeck.club</p>
    `,
  });

  if (error) {
    console.error("[beta] Failed to send approval email:", {
      email,
      error: error.message,
    });
    throw new Error("Failed to send approval email");
  }

  console.log("[beta] Approval email sent to:", email);
}

/**
 * Send rejection email to the user.
 */
export async function sendBetaRejectionEmail(
  resend: Resend,
  fromAddress: string,
  displayName: string,
  email: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "Update on your cyberdeck.club request",
    html: `
      <p>Hey ${displayName},</p>
      
      <p>Thanks for your interest in cyberdeck.club. We've reviewed your beta access request and we're not going to be able to add you to this round of testing.</p>
      
      <p>We're being intentional about building a community that feels safe and welcoming for everyone, especially folks who are new to making and haven't always felt included in tech spaces. Sometimes that means we're cautious about who we invite during these early days while we're still getting our moderation and community guidelines in place.</p>
      
      <p>If you think we got this wrong, you're welcome to reply to this email and tell us more about yourself and what you're interested in. We read every reply.</p>
      
      <p>All the best,</p>
      <p>cyberdeck.club</p>
    `,
  });

  if (error) {
    console.error("[beta] Failed to send rejection email:", {
      email,
      error: error.message,
    });
    throw new Error("Failed to send rejection email");
  }

  console.log("[beta] Rejection email sent to:", email);
}

/**
 * Send waitlist email to the user.
 */
export async function sendBetaWaitlistEmail(
  resend: Resend,
  fromAddress: string,
  displayName: string,
  email: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "You're on the list — we'll be in touch soon",
    html: `
      <p>Hey ${displayName},</p>
      
      <p>Thanks for requesting beta access to cyberdeck.club! We got more interest than we expected (which is a great problem to have), so we're bringing people in a few at a time to make sure the experience is solid.</p>
      
      <p>You're on the list. We'll email you as soon as we're ready for the next group — usually within a week or two.</p>
      
      <p>In the meantime, if you want to start thinking about your first build, here's a question to sit with: if you could put a tiny computer inside any object you own, what would you pick?</p>
      
      <p>Talk soon,</p>
      <p>cyberdeck.club</p>
    `,
  });

  if (error) {
    console.error("[beta] Failed to send waitlist email:", {
      email,
      error: error.message,
    });
    throw new Error("Failed to send waitlist email");
  }

  console.log("[beta] Waitlist email sent to:", email);
}