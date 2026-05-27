/**
 * BlockButton — React island for blocking/unblocking users.
 *
 * Follows the ReportButton.tsx + DeleteAccountModal.tsx patterns:
 *   - Inline styles with CSS variables (no raw Tailwind palette colors)
 *   - Modal with overlay, escape-key close, click-outside close, focus trap
 *   - All props are JSON-serializable (Astro island safe)
 *
 * Two flows depending on target role:
 *   1. Regular users  → block/unblock via POST/DELETE /api/blocks
 *   2. Mods/admins    → "report concern" modal via POST /api/blocks/mod-report
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ROLES } from "../../lib/roles";

interface BlockButtonProps {
  targetUserId: string;
  targetUserName: string;
  targetUserRole: number;
  currentUserRole: number;
  isCurrentlyBlocked: boolean;
  existingBlockId?: string;
  variant?: "profile" | "inline";
}

type ModalMode = "block" | "mod-report" | "unblock-confirm" | null;
type MessageState = { type: "success" | "error"; text: string } | null;

export default function BlockButton({
  targetUserId,
  targetUserName,
  targetUserRole,
  currentUserRole,
  isCurrentlyBlocked,
  existingBlockId,
  variant = "profile",
}: BlockButtonProps) {
  const [blocked, setBlocked] = useState(isCurrentlyBlocked);
  const [blockId, setBlockId] = useState(existingBlockId ?? null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [modDetails, setModDetails] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Visitors can't block — R5.6: requireRole uses >= comparison
  if (currentUserRole < ROLES.MEMBER) {
    return null;
  }

  const isModOrAdmin = targetUserRole >= ROLES.MODERATOR;
  const isInline = variant === "inline";

  // --- Modal open/close ---

  const openModal = useCallback(() => {
    setMessage(null);
    if (blocked) {
      setModalMode("unblock-confirm");
    } else if (isModOrAdmin) {
      setModalMode("mod-report");
    } else {
      setModalMode("block");
    }
  }, [blocked, isModOrAdmin]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setModalMode(null);
    setModDetails("");
    setMessage(null);
    triggerRef.current?.focus();
  }, [isSubmitting]);

  // Escape key
  useEffect(() => {
    if (!modalMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) closeModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalMode, isSubmitting, closeModal]);

  // Focus trap
  useEffect(() => {
    if (!modalMode || !modalRef.current) return;
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
  }, [modalMode]);

  // --- API actions ---

  const handleBlock = useCallback(async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlocked(true);
        setBlockId(data.blockId);
        setMessage({ type: "success", text: `${targetUserName} has been blocked.` });
        setTimeout(() => closeModal(), 1500);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to block user." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [targetUserId, targetUserName, closeModal]);

  const handleUnblock = useCallback(async () => {
    if (!blockId) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/blocks/${blockId}`, { method: "DELETE" });
      if (res.ok) {
        setBlocked(false);
        setBlockId(null);
        setMessage({ type: "success", text: `${targetUserName} has been unblocked.` });
        setTimeout(() => closeModal(), 1500);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to unblock user." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [blockId, targetUserName, closeModal]);

  const handleModReport = useCallback(async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/blocks/mod-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          details: modDetails || undefined,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Thank you. The admin has been notified." });
        setTimeout(() => closeModal(), 2000);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to submit concern." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [targetUserId, modDetails, closeModal]);

  // --- Render helpers ---

  const renderMessage = () => {
    if (!message) return null;
    const isSuccess = message.type === "success";
    return (
      <div
        role="alert"
        style={{
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          backgroundColor: isSuccess
            ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
            : "color-mix(in srgb, var(--color-danger) 15%, transparent)",
          border: `2px solid ${isSuccess ? "var(--color-primary)" : "var(--color-danger)"}`,
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text)",
          fontSize: "var(--fs-small)",
          fontWeight: 600,
        }}
      >
        {message.text}
      </div>
    );
  };

  const renderBlockModal = () => (
    <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
      <h3
        style={{
          margin: "0 0 0.75rem",
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-h4)",
          fontWeight: 700,
          color: "var(--color-text)",
        }}
      >
        Block {targetUserName}?
      </h3>

      {renderMessage()}

      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: "var(--fs-body)",
          color: "var(--color-text)",
          lineHeight: 1.6,
        }}
      >
        You won't see their posts, builds, wiki articles, or comments. They also won't see yours.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={closeModal}
          disabled={isSubmitting}
          style={cancelButtonStyle(isSubmitting)}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleBlock}
          disabled={isSubmitting}
          style={dangerButtonStyle(isSubmitting)}
        >
          {isSubmitting ? "Blocking…" : "Block"}
        </button>
      </div>
    </div>
  );

  const renderModReportModal = () => (
    <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
      <h3
        style={{
          margin: "0 0 0.75rem",
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-h4)",
          fontWeight: 700,
          color: "var(--color-text)",
        }}
      >
        About {targetUserName}
      </h3>

      {renderMessage()}

      <p
        style={{
          margin: "0 0 1rem",
          fontSize: "var(--fs-body)",
          color: "var(--color-text)",
          lineHeight: 1.6,
        }}
      >
        This person is a site moderator/admin. You can't block moderators directly,
        but the site admin has been notified about your concern and will look into it.
      </p>

      <div style={{ marginBottom: "1.25rem" }}>
        <label
          htmlFor="mod-report-details"
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "var(--fs-small)",
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          Tell us more about what happened (optional)
        </label>
        <textarea
          id="mod-report-details"
          value={modDetails}
          onChange={(e) => setModDetails((e.target as HTMLTextAreaElement).value)}
          disabled={isSubmitting}
          placeholder="Provide any additional context…"
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "0.625rem 0.875rem",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body)",
            color: "var(--color-text)",
            backgroundColor: "var(--color-bg)",
            border: "2px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={closeModal}
          disabled={isSubmitting}
          style={cancelButtonStyle(isSubmitting)}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleModReport}
          disabled={isSubmitting}
          style={{
            padding: "0.5rem 1.25rem",
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-body)",
            fontWeight: 700,
            border: "2px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            backgroundColor: isSubmitting
              ? "var(--color-text-muted)"
              : "var(--color-primary)",
            color: "var(--color-text-inverse)",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
            transition: "background-color 0.15s ease, opacity 0.15s ease",
          }}
        >
          {isSubmitting ? "Submitting…" : "Submit Concern"}
        </button>
      </div>
    </div>
  );

  const renderUnblockModal = () => (
    <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
      <h3
        style={{
          margin: "0 0 0.75rem",
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-h4)",
          fontWeight: 700,
          color: "var(--color-text)",
        }}
      >
        Unblock {targetUserName}?
      </h3>

      {renderMessage()}

      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: "var(--fs-body)",
          color: "var(--color-text)",
          lineHeight: 1.6,
        }}
      >
        You'll start seeing their posts, builds, and comments again. They'll also be able to see yours.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={closeModal}
          disabled={isSubmitting}
          style={cancelButtonStyle(isSubmitting)}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUnblock}
          disabled={isSubmitting}
          style={{
            padding: "0.5rem 1.25rem",
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-body)",
            fontWeight: 700,
            border: "2px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            backgroundColor: isSubmitting
              ? "var(--color-text-muted)"
              : "var(--color-primary)",
            color: "var(--color-text-inverse)",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
            transition: "background-color 0.15s ease, opacity 0.15s ease",
          }}
        >
          {isSubmitting ? "Unblocking…" : "Unblock"}
        </button>
      </div>
    </div>
  );

  // --- Trigger button ---

  const triggerButton = isInline ? (
    <button
      ref={triggerRef}
      type="button"
      onClick={openModal}
      title={blocked ? `Unblock ${targetUserName}` : `Block ${targetUserName}`}
      aria-label={blocked ? `Unblock ${targetUserName}` : `Block ${targetUserName}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        padding: 0,
        fontSize: "14px",
        lineHeight: 1,
        color: blocked ? "var(--color-danger)" : "var(--color-text-muted)",
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "color 0.15s ease",
      }}
    >
      🚫
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={openModal}
      aria-label={blocked ? `Unblock ${targetUserName}` : `Block ${targetUserName}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-body)",
        fontWeight: 600,
        color: "var(--color-text)",
        backgroundColor: blocked ? "var(--color-surface)" : "var(--color-secondary)",
        border: `2px solid var(--color-border)`,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "transform 0.1s ease, box-shadow 0.1s ease",
        boxShadow: "var(--shadow-brut-sm)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(2px, 2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-brut-pressed)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "var(--shadow-brut-sm)";
      }}
    >
      <span aria-hidden="true">🚫</span>
      {blocked ? "Unblock" : "Block"}
    </button>
  );

  return (
    <>
      {triggerButton}

      {modalMode && (
        <div
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-modal-title"
          style={overlayStyle}
        >
          {modalMode === "block" && renderBlockModal()}
          {modalMode === "mod-report" && renderModReportModal()}
          {modalMode === "unblock-confirm" && renderUnblockModal()}
        </div>
      )}
    </>
  );
}

// --- Shared style objects ---

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: "1rem",
};

const modalCardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "3px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "1.5rem",
  maxWidth: "480px",
  width: "90%",
  boxShadow: "var(--shadow-brut-lg)",
};

function cancelButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 1.25rem",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--fs-body)",
    fontWeight: 600,
    border: "2px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

function dangerButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 1.25rem",
    fontFamily: "var(--font-display)",
    fontSize: "var(--fs-body)",
    fontWeight: 700,
    border: "2px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: disabled ? "var(--color-text-muted)" : "var(--color-danger)",
    color: "var(--color-text-inverse)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "background-color 0.15s ease, opacity 0.15s ease",
  };
}
