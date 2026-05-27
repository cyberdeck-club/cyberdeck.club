/**
 * AnnouncementModal - Site-wide announcement overlay for authenticated users
 *
 * On mount, fetches all published announcements from /api/announcements and
 * filters out those already acknowledged (IDs stored in localStorage).
 * Displays any remaining un-acked announcements in a modal overlay.
 * Dismissing merges the shown announcement IDs into the acked set.
 *
 * Pattern: follows BetaAcknowledgementModal.tsx for the overlay + dialog
 * structure, FeedbackWidget.tsx for escape/focus-trapping logic.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { renderMarkdownToHtml } from "@/utils/MarkdownRenderer";

// ── Types ──────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: number | null;
  createdAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "announcements_acked";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const ackButtonRef = useRef<HTMLButtonElement>(null);

  // ── Dismiss ────────────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    if (announcements.length > 0) {
      // Read existing acked IDs from localStorage
      const existingAcked: string[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]",
      );
      // Merge shown announcement IDs into the acked set
      const newIds = announcements.map((a) => a.id);
      const merged = [...new Set([...existingAcked, ...newIds])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    setIsOpen(false);
  }, [announcements]);

  // ── Initial fetch ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchAnnouncements = async () => {
      try {
        // Read already-acked announcement IDs from localStorage
        const ackedIds: string[] = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || "[]",
        );

        const res = await fetch("/api/announcements");
        if (!res.ok || cancelled) {
          setHasChecked(true);
          setIsLoading(false);
          return;
        }

        const data: Announcement[] = await res.json();
        if (cancelled) return;

        // Filter out already-acked announcements
        const unacked = data.filter((a) => !ackedIds.includes(a.id));

        if (unacked.length > 0) {
          setAnnouncements(unacked);
          setIsOpen(true);
        }
      } catch {
        // Fail gracefully — no modal shown on network error
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHasChecked(true);
        }
      }
    };

    fetchAnnouncements();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Auto-focus ack button ──────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && ackButtonRef.current) {
      ackButtonRef.current.focus();
    }
  }, [isOpen]);

  // ── Escape-key handler ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleDismiss]);

  // ── Focus trapping ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // ── Render: nothing until check completes ──────────────────────────────

  if (!hasChecked || !isOpen) return null;

  // ── Loading state ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Loading announcements"
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
            maxWidth: "400px",
            backgroundColor: "var(--surface)",
            border: "3px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "6px 6px 0 var(--shadow-hard)",
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.9375rem",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              margin: "0 auto 1rem",
              border: "3px solid var(--border)",
              borderTopColor: "var(--color-primary-600)",
              borderRadius: "50%",
              animation: "announcement-spin 0.8s linear infinite",
            }}
          />
          Loading announcements…
          <style>{`@keyframes announcement-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Announcement list modal ────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
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
        ref={dialogRef}
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--surface)",
          border: "3px solid var(--border)",
          borderRadius: "8px",
          boxShadow: "6px 6px 0 var(--shadow-hard)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "1.5rem 1.5rem 0.75rem",
            borderBottom: "2px solid var(--border)",
          }}
        >
          <h2
            id="announcement-modal-title"
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text)",
            }}
          >
            📢 What's New
          </h2>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 1.5rem",
          }}
        >
          {announcements.map((announcement, i) => {
            const isLast = i === announcements.length - 1;
            const pubDate = announcement.publishedAt ?? announcement.createdAt;

            return (
              <div
                key={announcement.id}
                style={{
                  marginBottom: isLast ? 0 : "1.5rem",
                  paddingBottom: isLast ? 0 : "1.5rem",
                  borderBottom: isLast
                    ? "none"
                    : "1px solid var(--border)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.25rem",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    color: "var(--text)",
                  }}
                >
                  {announcement.title}
                </h3>

                {pubDate > 0 && (
                  <p
                    style={{
                      margin: "0 0 0.75rem",
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatDate(pubDate)}
                  </p>
                )}

                <div
                  style={{
                    color: "var(--text)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.6,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownToHtml(announcement.content),
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ── Footer / acknowledge button ─────────────────────────────── */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "2px solid var(--border)",
          }}
        >
          <button
            ref={ackButtonRef}
            type="button"
            onClick={handleDismiss}
            style={{
              width: "100%",
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--color-primary-600)",
              color: "var(--color-ink-950)",
              border: "3px solid var(--border)",
              borderRadius: "4px",
              boxShadow: "4px 4px 0 var(--shadow-hard)",
              fontSize: "1rem",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "transform 100ms ease, box-shadow 100ms ease",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(2px, 2px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 0 var(--shadow-hard)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow =
                "4px 4px 0 var(--shadow-hard)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow =
                "4px 4px 0 var(--shadow-hard)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = "none";
              e.currentTarget.style.boxShadow =
                "4px 4px 0 var(--shadow-hard), 0 0 0 2px var(--focus)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "";
              e.currentTarget.style.boxShadow =
                "4px 4px 0 var(--shadow-hard)";
            }}
          >
            Got it! ✨
          </button>
        </div>
      </div>
    </div>
  );
}
