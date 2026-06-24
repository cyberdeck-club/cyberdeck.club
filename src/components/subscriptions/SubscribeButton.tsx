/**
 * SubscribeButton — React island for subscribing/unsubscribing to content.
 *
 * Follows the BlockButton.tsx pattern:
 *   - Inline styles with CSS variables (no raw Tailwind palette colors)
 *   - All props are JSON-serializable (Astro island safe)
 *   - Handles its own state and API calls internally
 *
 * Targets: forum_thread, wiki_article, build
 * API: POST /api/subscriptions (subscribe), DELETE /api/subscriptions (unsubscribe)
 */

import { useState, useCallback } from "react";

interface SubscribeButtonProps {
  targetType: "forum_thread" | "wiki_article" | "build";
  targetId: string;
  initialSubscribed: boolean;
  isLoggedIn: boolean;
  /** Render as full-width sidebar button (forum thread) vs inline button */
  variant?: "sidebar" | "inline";
}

export default function SubscribeButton({
  targetType,
  targetId,
  initialSubscribed,
  isLoggedIn,
  variant = "inline",
}: SubscribeButtonProps) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render for logged-out users
  if (!isLoggedIn) {
    return null;
  }

  const handleToggle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const method = subscribed ? "DELETE" : "POST";
      const res = await fetch("/api/subscriptions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });

      if (res.ok) {
        setSubscribed(!subscribed);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Try again.");
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError("Network error. Try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [subscribed, targetType, targetId]);

  const isSidebar = variant === "sidebar";

  // Bell icon — filled when subscribed, outline when not
  const bellIcon = subscribed ? (
    // Filled bell
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    // Outline bell
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  const label = isLoading
    ? "…"
    : subscribed
      ? "Subscribed"
      : "Subscribe";

  const ariaLabel = subscribed
    ? "Unsubscribe from notifications"
    : "Subscribe to notifications";

  const buttonStyle: React.CSSProperties = isSidebar
    ? {
        // Full-width sidebar style (matches forum thread sidebar)
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.6rem 1rem",
        backgroundColor: subscribed
          ? "var(--color-primary)"
          : "var(--color-secondary)",
        border: "2px solid var(--color-border)",
        borderRadius: "var(--radius-sm, 4px)",
        fontSize: "var(--fs-small, 0.8rem)",
        fontFamily: "var(--font-display, var(--font-sans))",
        fontWeight: 600,
        color: "var(--color-text-inverse)",
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.6 : 1,
        transition: "background-color 0.15s ease, opacity 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease",
        boxShadow: "var(--shadow-brut-sm, 2px 2px 0 var(--color-border))",
      }
    : {
        // Inline style (for wiki / build pages)
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.4rem 0.875rem",
        backgroundColor: subscribed
          ? "var(--color-primary)"
          : "var(--color-surface)",
        border: "2px solid var(--color-border)",
        borderRadius: "var(--radius-sm, 4px)",
        fontSize: "var(--fs-small, 0.8rem)",
        fontFamily: "var(--font-display, var(--font-sans))",
        fontWeight: 600,
        color: subscribed
          ? "var(--color-text-inverse)"
          : "var(--color-text)",
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.6 : 1,
        transition: "background-color 0.15s ease, opacity 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease",
        boxShadow: "var(--shadow-brut-sm, 2px 2px 0 var(--color-border))",
      };

  return (
    <div style={{ position: "relative", display: isSidebar ? "block" : "inline-block" }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={ariaLabel}
        aria-pressed={subscribed}
        style={buttonStyle}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = "translate(2px, 2px)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "var(--shadow-brut-sm, 2px 2px 0 var(--color-border))";
        }}
      >
        {bellIcon}
        {label}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            top: "calc(100% + 0.25rem)",
            left: 0,
            right: isSidebar ? 0 : "auto",
            whiteSpace: isSidebar ? "normal" : "nowrap",
            padding: "0.375rem 0.625rem",
            backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
            border: "2px solid var(--color-danger)",
            borderRadius: "var(--radius-sm, 4px)",
            color: "var(--color-text)",
            fontSize: "0.75rem",
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
