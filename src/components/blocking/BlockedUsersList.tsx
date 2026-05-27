/**
 * BlockedUsersList — React island for the Settings page.
 *
 * Fetches the current user's blocked-users list from GET /api/blocks,
 * renders each entry with name + date + unblock button,
 * and handles unblocking via DELETE /api/blocks/{id}.
 *
 * Follows the TokenManager.tsx pattern for a settings-page list component
 * and the DeleteAccountModal.tsx pattern for inline confirmation UX.
 *
 * No props required — fetches its own data on mount.
 * All styles use CSS variables (Astro island safe, no raw Tailwind palette).
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface BlockedUser {
  blockId: string;
  blockedId: string;
  blockedName: string;
  blockedAt: string;
}

type MessageState = { type: "success" | "error"; text: string } | null;

export default function BlockedUsersList() {
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockConfirmId, setUnblockConfirmId] = useState<string | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const fetchBlocks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/blocks");
      if (!res.ok) {
        throw new Error("Failed to load blocked users");
      }
      const data = await res.json();
      setBlocks(data.blocks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blocked users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const closeConfirm = useCallback(() => {
    if (isUnblocking) return;
    setUnblockConfirmId(null);
    setMessage(null);
  }, [isUnblocking]);

  // Escape key closes unblock confirmation modal
  useEffect(() => {
    if (!unblockConfirmId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUnblocking) closeConfirm();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [unblockConfirmId, isUnblocking, closeConfirm]);

  // Focus trap for unblock confirmation modal
  useEffect(() => {
    if (!unblockConfirmId || !modalRef.current) return;
    const modal = modalRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [unblockConfirmId]);

  const handleUnblock = useCallback(
    async (blockId: string, userName: string) => {
      setIsUnblocking(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/blocks/${blockId}`, { method: "DELETE" });
        if (res.ok) {
          setBlocks((prev) => prev.filter((b) => b.blockId !== blockId));
          setUnblockConfirmId(null);
          setMessage({ type: "success", text: `${userName} has been unblocked.` });
          setTimeout(() => setMessage(null), 3000);
        } else {
          const data = await res.json();
          setMessage({ type: "error", text: data.error || "Failed to unblock user." });
        }
      } catch {
        setMessage({ type: "error", text: "Network error. Please try again." });
      } finally {
        setIsUnblocking(false);
      }
    },
    []
  );

  const formatDate = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const confirmTarget = blocks.find((b) => b.blockId === unblockConfirmId);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--fs-body)",
          }}
        >
          Loading blocked users…
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
          border: "2px solid var(--color-danger)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text)",
          fontSize: "var(--fs-small)",
          fontWeight: 500,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Top-level message (shown after successful unblock without modal) */}
      {message && !unblockConfirmId && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            backgroundColor:
              message.type === "success"
                ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
                : "color-mix(in srgb, var(--color-danger) 15%, transparent)",
            border: `2px solid ${
              message.type === "success" ? "var(--color-primary)" : "var(--color-danger)"
            }`,
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text)",
            fontSize: "var(--fs-small)",
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Empty state */}
      {blocks.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "var(--color-surface-alt)",
            border: "2px dashed var(--color-border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤝</div>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--fs-body)",
            }}
          >
            You haven't blocked anyone.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {blocks.map((block) => (
            <div
              key={block.blockId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--color-surface)",
                border: "2px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-brut-sm)",
              }}
            >
              {/* Name + date */}
              <div style={{ flex: 1, minWidth: "150px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--fs-body)",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    marginBottom: "0.125rem",
                  }}
                >
                  {block.blockedName}
                </div>
                <div
                  style={{
                    fontSize: "var(--fs-small)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Blocked {formatDate(block.blockedAt)}
                </div>
              </div>

              {/* Unblock button */}
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setUnblockConfirmId(block.blockId);
                }}
                style={{
                  padding: "0.375rem 0.75rem",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-small)",
                  fontWeight: 600,
                  color: "var(--color-danger)",
                  backgroundColor: "transparent",
                  border: "2px solid var(--color-danger)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unblock confirmation modal */}
      {unblockConfirmId && confirmTarget && (
        <div
          onClick={closeConfirm}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unblock-confirm-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--color-surface)",
              border: "3px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "var(--shadow-brut-lg)",
            }}
          >
            <h3
              id="unblock-confirm-title"
              style={{
                margin: "0 0 0.75rem",
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-h4)",
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              Unblock {confirmTarget.blockedName}?
            </h3>

            {/* Modal-level message */}
            {message && (
              <div
                role="alert"
                style={{
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  backgroundColor:
                    message.type === "success"
                      ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
                      : "color-mix(in srgb, var(--color-danger) 15%, transparent)",
                  border: `2px solid ${
                    message.type === "success"
                      ? "var(--color-primary)"
                      : "var(--color-danger)"
                  }`,
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text)",
                  fontSize: "var(--fs-small)",
                  fontWeight: 600,
                }}
              >
                {message.text}
              </div>
            )}

            <p
              style={{
                margin: "0 0 1.25rem",
                fontSize: "var(--fs-body)",
                color: "var(--color-text)",
                lineHeight: 1.6,
              }}
            >
              You'll start seeing their posts, builds, and comments again. They'll
              also be able to see yours.
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={closeConfirm}
                disabled={isUnblocking}
                style={{
                  padding: "0.5rem 1.25rem",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-body)",
                  fontWeight: 600,
                  border: "2px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  cursor: isUnblocking ? "not-allowed" : "pointer",
                  opacity: isUnblocking ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUnblock(confirmTarget.blockId, confirmTarget.blockedName)
                }
                disabled={isUnblocking}
                style={{
                  padding: "0.5rem 1.25rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--fs-body)",
                  fontWeight: 700,
                  border: "2px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isUnblocking
                    ? "var(--color-text-muted)"
                    : "var(--color-primary)",
                  color: "var(--color-text-inverse)",
                  cursor: isUnblocking ? "not-allowed" : "pointer",
                  opacity: isUnblocking ? 0.6 : 1,
                  transition: "background-color 0.15s ease, opacity 0.15s ease",
                }}
              >
                {isUnblocking ? "Unblocking…" : "Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
