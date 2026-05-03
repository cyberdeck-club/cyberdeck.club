/**
 * BetaAcknowledgementModal - Beta disclaimer modal for beta.cyberdeck.club
 * Shows on first visit to beta domain and doesn't reappear after acknowledgement.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

const BETA_VERSION = "1.0";
const STORAGE_KEY = "cyberdeck-beta-acknowledged";

export function BetaAcknowledgementModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleAcknowledge = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, BETA_VERSION);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    // Check if we're on the beta domain
    const isBetaDomain = 
      (window.location.hostname === "beta.cyberdeck.club")
      || window.location.search.includes("beta=true");

    // Check if already acknowledged
    const isAcknowledged = localStorage.getItem(STORAGE_KEY) === BETA_VERSION;

    if (isBetaDomain && !isAcknowledged) {
      setIsVisible(true);
    }

    setHasChecked(true);
  }, []);

  // Auto-focus the acknowledge button when modal becomes visible
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isVisible]);

  // Don't render anything until we've checked (prevents flash)
  if (!hasChecked) return null;

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "var(--surface)",
          border: "3px solid var(--border)",
          borderRadius: "8px",
          boxShadow: "6px 6px 0 var(--shadow-hard)",
          padding: "2rem",
        }}
      >
        <h2
          id="beta-modal-title"
          style={{
            margin: "0 0 1.25rem 0",
            fontSize: "1.5rem",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--text)",
          }}
        >
          ✨ Welcome to the beta!
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.6 }}>
            Hey there! You're on the beta version of cyberdeck.club — this is where
            we test out new features and squash bugs before they go live.
          </p>

          <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.6 }}>
            Here's what that means for you:
          </p>

          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
            🧪 <strong>Things might break</strong> — You might run into rough edges,
            half-finished features, or the occasional weird bug. That's expected!
          </p>

          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
            💬 <strong>Your feedback helps</strong> — If something feels off or you
            have ideas, hit the feedback button (the little widget in the corner) to
            let us know.
          </p>

          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
            ⚠️ <strong>Data might not carry over</strong> — We'll do our best to
            bring your beta content over to the main site, but there's a chance some
            things could get lost along the way.
          </p>

          <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.6 }}>
            Thanks for helping us make cyberdeck.club better for everyone. 💖
          </p>
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={handleAcknowledge}
          style={{
            width: "100%",
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--primary)",
            color: "var(--on-primary)",
            border: "3px solid var(--border)",
            borderRadius: "4px",
            boxShadow: "4px 4px 0 var(--shadow-hard)",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "transform 100ms ease, box-shadow 100ms ease",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(2px, 2px)";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--shadow-hard)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translate(0, 0)";
            e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translate(0, 0)";
            e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = "none";
            e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard), 0 0 0 2px var(--focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = "";
            e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
          }}
        >
          Got it, let's go!
        </button>
      </div>
    </div>
  );
}

export default BetaAcknowledgementModal;
