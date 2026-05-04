/**
 * TokenLogs - Usage logs viewer for a specific token
 * Displays paginated API call history
 */

import React, { useCallback, useEffect, useState } from "react";

interface LogEntry {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
}

interface TokenLogsProps {
  tokenId: string;
}

export function TokenLogs({ tokenId }: TokenLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/tokens/${tokenId}/logs?page=${pageNum}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await response.json();
      setLogs((prev) => (pageNum === 1 ? data.logs : [...prev, ...data.logs]));
      setTotal(data.total);
      setHasMore(data.logs.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, pageSize]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage);
  }, [page, fetchLogs]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return "var(--color-signal)";
    if (statusCode >= 400) return "var(--color-danger)";
    return "var(--color-warn)";
  };

  const getMethodColor = (method: string): string => {
    switch (method) {
      case "GET":
        return "var(--color-info)";
      case "POST":
        return "var(--color-signal)";
      case "PATCH":
        return "var(--color-warn)";
      case "DELETE":
        return "var(--color-danger)";
      default:
        return "var(--text-muted)";
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>
        Loading logs...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "0.75rem",
          backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
          border: "2px solid var(--color-danger)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text)",
          fontSize: "0.875rem",
        }}
      >
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div
        style={{
          padding: "1.5rem",
          textAlign: "center",
          background: "var(--color-surface-alt)",
          border: "2px dashed var(--color-border)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📋</div>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>
          No API calls recorded yet for this token.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          Usage Logs ({total} total)
        </span>
      </div>

      {/* Log table */}
      <div
        style={{
          overflowX: "auto",
          border: "2px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.75rem",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--color-surface-alt)",
                borderBottom: "2px solid var(--color-border)",
              }}
            >
              <th
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.625rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                Time
              </th>
              <th
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.625rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                Method
              </th>
              <th
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.625rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                Path
              </th>
              <th
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "center",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.625rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <td
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6875rem",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatTime(log.createdAt)}
                </td>
                <td
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: getMethodColor(log.method),
                  }}
                >
                  {log.method}
                </td>
                <td
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6875rem",
                    color: "var(--text)",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.path}
                </td>
                <td
                  style={{
                    padding: "0.5rem 0.75rem",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: getStatusColor(log.statusCode),
                  }}
                >
                  {log.statusCode}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            style={{
              padding: "0.5rem 1rem",
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text)",
              background: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Loading..." : `Load More (${total - logs.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
