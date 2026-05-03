/**
 * Cloudflare Turnstile verification helper.
 *
 * Verifies Turnstile tokens server-side to ensure the user completed
 * the CAPTCHA challenge before accepting community guidelines.
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
 * @param ip - Optional client IP address for additional validation
 * @returns true if the token is valid, false otherwise
 */
export async function verifyTurnstile(
  token: string,
  ip?: string
): Promise<boolean> {
  const secretKey =
    typeof process !== "undefined"
      ? process.env.TURNSTILE_SECRET_KEY
      : undefined;

  // Allow test tokens in development
  if (secretKey === "1x0000000000000000000000000000000AA") {
    return token === "1x00000000000000000000AA";
  }

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