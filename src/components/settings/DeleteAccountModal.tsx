/**
 * DeleteAccountModal - Self-service account deletion modal
 *
 * Renders a trigger button + modal dialog for users to permanently
 * delete their own account. Requires typing "DELETE MY ACCOUNT" to confirm.
 * Calls DELETE /api/users/me on confirmation.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

const CONFIRMATION_TEXT = "DELETE MY ACCOUNT";

export function DeleteAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isConfirmed = inputValue === CONFIRMATION_TEXT;

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setInputValue("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    setIsOpen(false);
    setInputValue("");
    setError(null);
    triggerRef.current?.focus();
  }, [isDeleting]);

  const handleConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConfirmed || isDeleting) return;

      setError(null);
      setIsDeleting(true);

      try {
        const res = await fetch("/api/users/me", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: CONFIRMATION_TEXT }),
        });

        if (res.ok) {
          window.location.href = "/";
          return;
        }

        const data = await res.json();
        setError(data.error || "Failed to delete account");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    },
    [isConfirmed, isDeleting]
  );

  // Focus the input when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

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
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.25rem",
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-body)",
          fontWeight: 700,
          color: "var(--color-text-inverse)",
          backgroundColor: "var(--color-danger)",
          border: "3px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow-brut)",
          cursor: "pointer",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translate(2px, 2px)";
          e.currentTarget.style.boxShadow = "var(--shadow-brut-pressed)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "var(--shadow-brut)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Delete My Account
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: "1rem",
          }}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "var(--color-surface)",
              border: "3px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-brut-lg)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "3px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "2px solid var(--color-danger)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" aria-hidden="true">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2
                  id="delete-account-title"
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--fs-h4)",
                    fontWeight: 700,
                    color: "var(--color-text)",
                  }}
                >
                  Delete Your Account
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--fs-small)",
                    color: "var(--color-danger)",
                    fontWeight: 600,
                  }}
                >
                  This action is permanent and irreversible
                </p>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleConfirm}>
              <div style={{ padding: "1.5rem" }}>
                {error && (
                  <div
                    role="alert"
                    style={{
                      padding: "0.75rem 1rem",
                      marginBottom: "1rem",
                      backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
                      border: "2px solid var(--color-danger)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--color-danger)",
                      fontSize: "var(--fs-small)",
                      fontWeight: 600,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div
                  style={{
                    padding: "1rem",
                    marginBottom: "1.25rem",
                    backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                    border: "2px solid var(--color-danger)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.75rem",
                      fontSize: "var(--fs-body)",
                      color: "var(--color-text)",
                      lineHeight: 1.6,
                    }}
                  >
                    Deleting your account will:
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.25rem",
                      fontSize: "var(--fs-small)",
                      color: "var(--color-text)",
                      lineHeight: 1.8,
                    }}
                  >
                    <li>Permanently remove your profile, email, and login</li>
                    <li>Anonymize all your builds, posts, and comments to <strong>[deleted]</strong></li>
                    <li>Revoke all API tokens and active sessions</li>
                  </ul>
                </div>

                <p
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "var(--fs-small)",
                    color: "var(--color-text)",
                    lineHeight: 1.6,
                  }}
                >
                  This cannot be undone. To confirm, type{" "}
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--fs-small)",
                      fontWeight: 700,
                      color: "var(--color-danger)",
                      backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                      padding: "0.125rem 0.375rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {CONFIRMATION_TEXT}
                  </code>{" "}
                  below:
                </p>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isDeleting}
                  placeholder={CONFIRMATION_TEXT}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Type "${CONFIRMATION_TEXT}" to confirm account deletion`}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-body)",
                    color: "var(--color-text)",
                    backgroundColor: "var(--color-bg)",
                    border: `2px solid ${isConfirmed ? "var(--color-danger)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-sm)",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px color-mix(in srgb, var(--color-focus) 20%, transparent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderTop: "3px solid var(--color-border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  backgroundColor: "var(--color-surface-alt)",
                }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isDeleting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--fs-body)",
                    fontWeight: 600,
                    border: "2px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text)",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    opacity: isDeleting ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmed || isDeleting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--fs-body)",
                    fontWeight: 700,
                    border: "2px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor:
                      !isConfirmed || isDeleting
                        ? "var(--color-text-muted)"
                        : "var(--color-danger)",
                    color: "var(--color-text-inverse)",
                    cursor: !isConfirmed || isDeleting ? "not-allowed" : "pointer",
                    opacity: !isConfirmed || isDeleting ? 0.6 : 1,
                    transition: "background-color 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
