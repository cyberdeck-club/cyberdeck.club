/**
 * TokenDisplay - One-time display of newly created raw token
 * Shows the token with copy-to-clipboard functionality and warning
 */

import React, { useCallback, useState } from "react";

interface TokenDisplayProps {
  token: string;
  name: string;
  onDismiss: () => void;
}

export function TokenDisplay({ token, name, onDismiss }: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy token:", err);
    }
  }, [token]);

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "color-mix(in srgb, var(--color-accent-200) 30%, var(--color-surface))",
        border: "3px solid var(--color-accent-500)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-brut)",
        marginBottom: "1.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>🎉</span>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          Token Created: {name}
        </h3>
      </div>

      {/* Warning */}
      <div
        style={{
          padding: "0.75rem",
          background: "color-mix(in srgb, var(--color-warn) 20%, transparent)",
          border: "2px solid var(--color-warn)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>⚠️</span>
          <span>
            <strong>This token will only be shown once.</strong> Copy it now and store it
            securely. You will not be able to see it again.
          </span>
        </div>
      </div>

      {/* Token display */}
      <div
        style={{
          padding: "1rem",
          background: "var(--color-surface)",
          border: "2px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            wordBreak: "break-all",
            color: "var(--text)",
            lineHeight: 1.6,
          }}
        >
          {token}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={handleCopy}
          style={{
            padding: "0.625rem 1.25rem",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-ink-950)",
            background: copied ? "var(--color-signal)" : "var(--color-primary-600)",
            border: "3px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-brut-sm)",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {copied ? "✓ Copied!" : "Copy to Clipboard"}
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: "0.625rem 1.25rem",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text)",
            background: "transparent",
            border: "3px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
