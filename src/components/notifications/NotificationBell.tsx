/**
 * NotificationBell — React island for the navigation bar.
 *
 * Shows a bell icon with an unread badge, and opens a dropdown panel
 * listing recent notifications. Polls for unread count every 60s.
 *
 * Follows the SubscribeButton.tsx / BlockButton.tsx patterns:
 *   - Inline styles with CSS variables (no raw Tailwind palette colors)
 *   - All props are JSON-serializable (Astro island safe)
 *   - Handles its own state and API calls internally
 *
 * API:
 *   GET  /api/notifications?limit=10       — fetch recent notifications
 *   GET  /api/notifications/unread-count   — poll badge count
 *   PATCH /api/notifications               — mark read (single or all)
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface NotificationBellProps {
  initialUnreadCount: number;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  readAt: number | null;
  emailSent: boolean;
  createdAt: number;
}

/** Construct a URL from entityType + entityId, or null if not possible. */
function getEntityUrl(
  entityType: string | null,
  entityId: string | null
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "forum_thread":
      return `/forum/thread/${entityId}`;
    case "build":
      return `/builds/${entityId}`;
    case "wiki_article":
      // Wiki needs category+slug; we can't construct from just ID
      return null;
    default:
      return null;
  }
}

/** Format a unix timestamp (seconds) into a relative "time ago" string. */
function timeAgo(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h}h ago`;
  }
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return `${d}d ago`;
  }
  const w = Math.floor(diff / 604800);
  return `${w}w ago`;
}

/** Map notification type to a small icon label. */
function typeIcon(type: string): string {
  switch (type) {
    case "new_forum_post":
      return "💬";
    case "wiki_updated":
      return "📝";
    case "wiki_comment":
      return "💬";
    case "new_build_comment":
      return "🔧";
    default:
      return "🔔";
  }
}

const POLL_INTERVAL = 60_000; // 60 seconds

export default function NotificationBell({
  initialUnreadCount,
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);

  // ── Fetch notifications ─────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        // Update unread count from the data
        const unread = (data.notifications ?? []).filter(
          (n: Notification) => n.readAt === null
        ).length;
        // Use the larger of local unread count or fetched count
        // (there may be more unread beyond the 10 we fetched)
        setUnreadCount((prev) => Math.max(unread, 0));
      }
    } catch {
      // Silently fail — badge still shows server-rendered count
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  // ── Poll for unread count ───────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // Silently fail
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ── Toggle dropdown ─────────────────────────────────────────────
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => {
      const opening = !prev;
      if (opening && !hasLoaded) {
        fetchNotifications();
      }
      return opening;
    });
  }, [hasLoaded, fetchNotifications]);

  // ── Close dropdown ──────────────────────────────────────────────
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  // ── Click outside ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    // Delay to avoid the toggle click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // ── Keyboard handling ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDropdown]);

  // ── Focus first item on open ────────────────────────────────────
  useEffect(() => {
    if (isOpen && hasLoaded && !isLoading) {
      // Small delay for DOM render
      requestAnimationFrame(() => {
        firstItemRef.current?.focus();
      });
    }
  }, [isOpen, hasLoaded, isLoading]);

  // ── Mark single notification as read ────────────────────────────
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: Math.floor(Date.now() / 1000) }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    },
    []
  );

  // ── Mark all as read ────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        const now = Math.floor(Date.now() / 1000);
        setNotifications((prev) =>
          prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n))
        );
        setUnreadCount(0);
      }
    } catch {
      // Silently fail
    } finally {
      setMarkingAllRead(false);
    }
  }, []);

  // ── Handle notification click ───────────────────────────────────
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (notification.readAt === null) {
        markAsRead(notification.id);
      }

      const url = getEntityUrl(notification.entityType, notification.entityId);
      if (url) {
        window.location.href = url;
      }

      closeDropdown();
    },
    [markAsRead, closeDropdown]
  );

  // ── Styles ──────────────────────────────────────────────────────

  const bellButtonStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.5rem",
    minHeight: "44px",
    minWidth: "44px",
    backgroundColor: "var(--color-surface-light)",
    border: "2px solid var(--color-border-light)",
    borderRadius: "0.5rem",
    color: "var(--color-text-light)",
    cursor: "pointer",
    transition: "all 200ms ease",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "4px",
    right: "4px",
    minWidth: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--color-danger, oklch(0.58 0.22 18))",
    color: "var(--color-surface-50, #fff)",
    fontSize: "0.625rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono, monospace)",
    borderRadius: "9999px",
    padding: "0 4px",
    lineHeight: 1,
    pointerEvents: "none" as const,
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "320px",
    maxHeight: "400px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--color-surface-light)",
    border: "3px solid var(--color-border-light)",
    borderRadius: "var(--radius-sm, 4px)",
    boxShadow: "4px 4px 0 var(--color-border-light)",
    zIndex: 100,
    overflow: "hidden",
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? "translateY(0)" : "translateY(-4px)",
    transition: "opacity 150ms ease, transform 150ms ease",
    pointerEvents: isOpen ? "auto" : "none",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1rem",
    borderBottom: "2px solid var(--color-border-light)",
    fontFamily: "var(--font-display, var(--font-sans))",
    fontWeight: 700,
    fontSize: "0.875rem",
    color: "var(--color-text-light)",
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    overscrollBehavior: "contain",
  };

  const notificationItemStyle = (isUnread: boolean): React.CSSProperties => ({
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: isUnread
      ? "var(--color-surface-alt, var(--color-secondary-100))"
      : "transparent",
    borderBottom: "1px solid color-mix(in srgb, var(--color-border-light) 25%, transparent)",
    textAlign: "left" as const,
    cursor: "pointer",
    transition: "background-color 150ms ease",
    textDecoration: "none",
    color: "inherit",
    border: "none",
    font: "inherit",
  });

  const titleRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    marginBottom: "0.25rem",
  };

  const notificationTitleStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    fontFamily: "var(--font-display, var(--font-sans))",
    color: "var(--color-text-light)",
    lineHeight: 1.3,
    flex: 1,
  };

  const notificationBodyStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "var(--color-text-muted, var(--color-ink-600))",
    lineHeight: 1.4,
    marginBottom: "0.25rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
  };

  const timeStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    fontFamily: "var(--font-mono, monospace)",
    color: "var(--color-text-muted, var(--color-ink-600))",
  };

  const unreadDotStyle: React.CSSProperties = {
    width: "8px",
    height: "8px",
    minWidth: "8px",
    borderRadius: "9999px",
    backgroundColor: "var(--color-primary, var(--color-primary-600))",
    marginTop: "4px",
  };

  const footerStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    borderTop: "2px solid var(--color-border-light)",
    display: "flex",
    justifyContent: "center",
  };

  const markAllButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--color-primary, var(--color-primary-600))",
    fontSize: "0.75rem",
    fontWeight: 600,
    fontFamily: "var(--font-display, var(--font-sans))",
    cursor: markingAllRead ? "not-allowed" : "pointer",
    opacity: markingAllRead ? 0.6 : 1,
    padding: "0.25rem 0.5rem",
    textDecoration: "none",
    transition: "opacity 150ms ease",
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: "2rem 1rem",
    textAlign: "center",
    color: "var(--color-text-muted, var(--color-ink-600))",
    fontSize: "0.8125rem",
    fontFamily: "var(--font-display, var(--font-sans))",
  };

  const loadingStyle: React.CSSProperties = {
    padding: "2rem 1rem",
    textAlign: "center",
    color: "var(--color-text-muted, var(--color-ink-600))",
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono, monospace)",
  };

  // Display count: cap at 99+
  const displayCount =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="notification-bell-btn"
        style={bellButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-primary)";
          e.currentTarget.style.borderColor = "var(--color-primary)";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-surface-light)";
          e.currentTarget.style.borderColor = "var(--color-border-light)";
          e.currentTarget.style.color = "var(--color-text-light)";
          e.currentTarget.style.transform = "none";
        }}
      >
        {/* Bell SVG — 20x20 */}
        <svg
          width="20"
          height="20"
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

        {/* Unread badge */}
        {displayCount && <span style={badgeStyle}>{displayCount}</span>}
      </button>

      {/* Dropdown panel */}
      <div
        ref={dropdownRef}
        role="menu"
        aria-label="Notifications"
        className="notification-dropdown"
        style={dropdownStyle}
      >
        {/* Header */}
        <div style={headerStyle}>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "0.6875rem",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                backgroundColor: "var(--color-primary, var(--color-primary-600))",
                color: "var(--color-surface-50, #fff)",
                padding: "0.125rem 0.375rem",
                borderRadius: "9999px",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        {/* Notification list */}
        <div style={listStyle}>
          {isLoading && !hasLoaded ? (
            <div style={loadingStyle}>loading…</div>
          ) : notifications.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                🔔
              </div>
              No notifications yet
            </div>
          ) : (
            notifications.map((notification, index) => {
              const isUnread = notification.readAt === null;
              const url = getEntityUrl(
                notification.entityType,
                notification.entityId
              );

              // Render as a link if we have a URL, otherwise a button
              const commonProps = {
                role: "menuitem" as const,
                style: notificationItemStyle(isUnread),
                ref:
                  index === 0
                    ? (el: HTMLAnchorElement | HTMLButtonElement | null) => {
                        firstItemRef.current = el;
                      }
                    : undefined,
                onMouseEnter: (
                  e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>
                ) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    isUnread
                      ? "color-mix(in srgb, var(--color-surface-alt) 80%, var(--color-primary) 20%)"
                      : "var(--color-surface-alt, var(--color-secondary-100))";
                },
                onMouseLeave: (
                  e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>
                ) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    isUnread
                      ? "var(--color-surface-alt, var(--color-secondary-100))"
                      : "transparent";
                },
              };

              const content = (
                <>
                  <div style={titleRowStyle}>
                    <span style={{ fontSize: "0.875rem", lineHeight: 1 }}>
                      {typeIcon(notification.type)}
                    </span>
                    <span style={notificationTitleStyle}>
                      {notification.title}
                    </span>
                    {isUnread && <div style={unreadDotStyle} />}
                  </div>
                  {notification.body && (
                    <div style={notificationBodyStyle}>{notification.body}</div>
                  )}
                  <div style={timeStyle}>{timeAgo(notification.createdAt)}</div>
                </>
              );

              if (url) {
                return (
                  <a
                    key={notification.id}
                    href={url}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }}
                    {...commonProps}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  {...commonProps}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={footerStyle}>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAllRead || unreadCount === 0}
              style={{
                ...markAllButtonStyle,
                opacity: markingAllRead || unreadCount === 0 ? 0.5 : 1,
                cursor:
                  markingAllRead || unreadCount === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {markingAllRead ? "Marking…" : "Mark all as read"}
            </button>
          </div>
        )}
      </div>

      {/* Theme-aware style overrides via CSS */}
      <style>{`
        [data-theme="dark"] .notification-bell-btn {
          background-color: var(--color-surface-dark) !important;
          border-color: var(--color-border-dark) !important;
          color: var(--color-text-dark) !important;
        }
        [data-theme="dark"] .notification-bell-btn:hover {
          background-color: var(--color-primary-hover) !important;
          border-color: var(--color-primary-hover) !important;
          color: white !important;
        }
        [data-theme="dark"] .notification-dropdown {
          background-color: var(--color-surface-dark) !important;
          border-color: var(--color-border-dark) !important;
          box-shadow: 4px 4px 0 var(--color-border-dark) !important;
        }
        [data-theme="dark"] .notification-dropdown [role="menuitem"] {
          color: var(--color-text-dark) !important;
        }
      `}</style>
    </div>
  );
}
