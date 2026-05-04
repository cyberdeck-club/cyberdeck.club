/**
 * TokenManager - Main token management component for user settings
 * Displays user's tokens, allows creation, revocation, and viewing usage logs
 */

import React, { useCallback, useEffect, useState } from "react";
import { CreateTokenForm } from "./CreateTokenForm";
import { TokenDisplay } from "./TokenDisplay";
import { TokenLogs } from "./TokenLogs";

interface Token {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: number | null;
  lastUsedAt: number | null;
  createdAt: number;
}

interface TokenManagerProps {
  userRole: number;
}

export default function TokenManager({ userRole }: TokenManagerProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newToken, setNewToken] = useState<{ rawToken: string; name: string } | null>(null);
  const [expandedLogsTokenId, setExpandedLogsTokenId] = useState<string | null>(null);
  const [revokeConfirmTokenId, setRevokeConfirmTokenId] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/tokens");
      if (!response.ok) {
        throw new Error("Failed to fetch tokens");
      }
      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleTokenCreated = useCallback((rawToken: string, name: string) => {
    setNewToken({ rawToken, name });
    setShowCreateForm(false);
    fetchTokens();
  }, [fetchTokens]);

  const handleRevokeToken = useCallback(async (tokenId: string) => {
    try {
      const response = await fetch(`/api/tokens/${tokenId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to revoke token");
      }
      setRevokeConfirmTokenId(null);
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    }
  }, [fetchTokens]);

  const handleDismissNewToken = useCallback(() => {
    setNewToken(null);
  }, []);

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return formatDate(timestamp);
  };

  const getScopeLabel = (scope: string): string => {
    const labels: Record<string, string> = {
      "builds:read": "Read Builds",
      "builds:write": "Create/Edit Builds",
      "wiki:read": "Read Wiki",
      "wiki:write": "Create/Edit Wiki",
      "forum:read": "Read Forum",
      "forum:write": "Create/Reply Forum",
      "meetups:read": "Read Meetups",
      "meetups:write": "Create Meetups",
      "profile:read": "Read Profile",
      "profile:write": "Edit Profile",
      "moderation:read": "View Mod Queue",
      "moderation:write": "Approve/Reject Builds",
      "admin:read": "Admin Read",
      "admin:write": "Admin Write",
      "*": "Full Access",
    };
    return labels[scope] || scope;
  };

  const isExpired = (expiresAt: number | null): boolean => {
    if (!expiresAt) return false;
    return expiresAt < Math.floor(Date.now() / 1000);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "var(--text-muted)" }}>Loading tokens...</div>
      </div>
    );
  }

  return (
    <div className="token-manager">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Personal Access Tokens let you use the cyberdeck.club API from scripts, tools, and AI assistants.
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "0.5rem 1rem",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--color-ink-950)",
              background: "var(--color-primary-600)",
              border: "3px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-brut-sm)",
              cursor: "pointer",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translate(2px, 2px)";
              e.currentTarget.style.boxShadow = "var(--shadow-brut-pressed)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "var(--shadow-brut-sm)";
            }}
          >
            + Create New Token
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
            border: "2px solid var(--color-danger)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text)",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* New token display */}
      {newToken && (
        <TokenDisplay
          token={newToken.rawToken}
          name={newToken.name}
          onDismiss={handleDismissNewToken}
        />
      )}

      {/* Create token form */}
      {showCreateForm && (
        <CreateTokenForm
          userRole={userRole}
          onSubmit={handleTokenCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Token list */}
      {tokens.length === 0 && !showCreateForm && !newToken ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "var(--color-surface-alt)",
            border: "2px dashed var(--color-border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔑</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            No tokens yet. Create one to get started with the API.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {tokens.map((token) => (
            <div
              key={token.id}
              style={{
                padding: "1rem 1.25rem",
                background: "var(--color-surface)",
                border: "3px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-brut-sm)",
              }}
            >
              {/* Token header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {token.tokenPrefix}
                    </span>
                    {isExpired(token.expiresAt) && (
                      <span
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "0.625rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          padding: "0.125rem 0.375rem",
                          background: "color-mix(in srgb, var(--color-danger) 20%, transparent)",
                          border: "2px solid var(--color-danger)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--color-danger)",
                        }}
                      >
                        Expired
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    Created {formatDate(token.createdAt)} · Last used {formatRelativeTime(token.lastUsedAt)}
                    {token.expiresAt && !isExpired(token.expiresAt) && (
                      <span> · Expires {formatDate(token.expiresAt)}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setExpandedLogsTokenId(expandedLogsTokenId === token.id ? null : token.id)}
                    style={{
                      padding: "0.375rem 0.75rem",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text)",
                      background: "var(--color-surface-alt)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  >
                    {expandedLogsTokenId === token.id ? "Hide Logs" : "View Logs"}
                  </button>
                  {revokeConfirmTokenId === token.id ? (
                    <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Revoke?</span>
                      <button
                        onClick={() => handleRevokeToken(token.id)}
                        style={{
                          padding: "0.375rem 0.75rem",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--color-surface)",
                          background: "var(--color-danger)",
                          border: "2px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setRevokeConfirmTokenId(null)}
                        style={{
                          padding: "0.375rem 0.75rem",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--text)",
                          background: "var(--color-surface)",
                          border: "2px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirmTokenId(token.id)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        fontFamily: "var(--font-sans)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--color-danger)",
                        background: "transparent",
                        border: "2px solid var(--color-danger)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>

              {/* Scopes */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.75rem" }}>
                {token.scopes.map((scope) => (
                  <span
                    key={scope}
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.625rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "0.25rem 0.5rem",
                      background: scope === "*" ? "var(--color-accent-200)" : "var(--color-secondary-200)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text)",
                    }}
                  >
                    {getScopeLabel(scope)}
                  </span>
                ))}
              </div>

              {/* Usage logs */}
              {expandedLogsTokenId === token.id && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid var(--color-border)" }}>
                  <TokenLogs tokenId={token.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
