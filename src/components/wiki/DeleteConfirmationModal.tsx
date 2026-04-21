/**
 * DeleteConfirmationModal - Modal dialog for confirming article deletion
 * Provides a confirmation dialog with optional permanent deletion option.
 */

import React, { useCallback, useState } from "react";

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permanent?: boolean) => Promise<void>;
  articleTitle: string;
  isAdmin?: boolean;
  className?: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  articleTitle,
  isAdmin = false,
  className = "",
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsDeleting(true);
      try {
        await onConfirm(isAdmin ? permanent : undefined);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete article");
      } finally {
        setIsDeleting(false);
      }
    },
    [onConfirm, onClose, isAdmin, permanent]
  );

  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setPermanent(false);
      setError(null);
      onClose();
    }
  }, [isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`delete-confirmation-modal-overlay ${className}`}
      onClick={handleClose}
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
        className="delete-confirmation-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "450px",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          className="delete-confirmation-modal-header"
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="#dc2626"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Delete Article
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#6b7280",
              }}
            >
              This action cannot be undone
            </p>
          </div>
        </div>
        <form onSubmit={handleConfirm}>
          <div
            className="delete-confirmation-modal-body"
            style={{
              padding: "1.5rem",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #dc2626",
                  borderRadius: "6px",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </div>
            )}
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#374151",
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to delete{" "}
              <strong
                style={{
                  fontWeight: 500,
                  wordBreak: "break-word",
                }}
              >
                "{articleTitle}"
              </strong>
              ? This article will be moved to trash and can be recovered within 30 days.
            </p>
            {isAdmin && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "6px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#991b1b",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.target.checked)}
                    disabled={isDeleting}
                    style={{
                      marginTop: "0.125rem",
                      cursor: isDeleting ? "not-allowed" : "pointer",
                    }}
                  />
                  <span>
                    <strong>Permanent deletion:</strong> This will permanently delete the article
                    and all its revisions. This action cannot be undone.
                  </span>
                </label>
              </div>
            )}
          </div>
          <div
            className="delete-confirmation-modal-footer"
            style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              backgroundColor: "#f9fafb",
              borderBottomLeftRadius: "8px",
              borderBottomRightRadius: "8px",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: isDeleting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "none",
                borderRadius: "6px",
                backgroundColor: isDeleting ? "#9ca3af" : "#dc2626",
                color: "#ffffff",
                cursor: isDeleting ? "not-allowed" : "pointer",
              }}
            >
              {isDeleting ? "Deleting..." : permanent ? "Delete Permanently" : "Delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
