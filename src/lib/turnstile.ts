/**
 * Cloudflare Turnstile verification helper.
 *
 * Verifies Turnstile tokens server-side to ensure the user completed
 * the CAPTCHA challenge before accepting community guidelines.
 *
 * The secret key is injected by the caller (from Workers env bindings)
 * rather than read from process.env, since this runs on Cloudflare Workers.
 */

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Cloudflare Turnstile token.
 *
 * @param token - The Turnstile token from the client
 * @param secretKey - The Turnstile secret key (from Workers env bindings)
 * @param ip - Optional client IP address for additional validation
 * @returns true if the token is valid, false otherwise
 */
export async function verifyTurnstile(
  token: string,
  secretKey: string,
  ip?: string
): Promise<boolean> {
  if (!secretKey) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY not configured");
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (ip) {
      body.append("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!response.ok) {
      console.error("[turnstile] Verification request failed:", response.status);
      return false;
    }

    const data: TurnstileVerifyResponse = await response.json();

    if (!data.success) {
      console.error("[turnstile] Verification failed:", data["error-codes"]);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[turnstile] Verification error:", error);
    return false;
  }
}