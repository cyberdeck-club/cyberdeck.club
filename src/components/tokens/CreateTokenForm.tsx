/**
 * CreateTokenForm - Form for creating new personal access tokens
 * Modal/inline form with name, scopes, and expiration settings
 */

import React, { useCallback, useState } from "react";

interface CreateTokenFormProps {
  userRole: number;
  onSubmit: (rawToken: string, name: string) => void;
  onCancel: () => void;
}

interface ScopeGroup {
  label: string;
  scopes: Array<{
    value: string;
    label: string;
    description: string;
    minRole: number;
    disabled: boolean;
  }>;
}

const EXPIRATION_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
  { value: 365, label: "365 days" },
  { value: null, label: "No expiration" },
];

export function CreateTokenForm({ userRole, onSubmit, onCancel }: CreateTokenFormProps) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define scope groups based on user role
  const scopeGroups: ScopeGroup[] = [
    {
      label: "Builds",
      scopes: [
        { value: "builds:read", label: "Read builds", description: "View builds and build details", minRole: 0, disabled: userRole < 0 },
        { value: "builds:write", label: "Create/edit builds", description: "Submit, edit, and comment on builds", minRole: 10, disabled: userRole < 10 },
      ],
    },
    {
      label: "Wiki",
      scopes: [
        { value: "wiki:read", label: "Read wiki", description: "View wiki articles and history", minRole: 0, disabled: userRole < 0 },
        { value: "wiki:write", label: "Create/edit wiki", description: "Create and edit wiki articles", minRole: 20, disabled: userRole < 20 },
      ],
    },
    {
      label: "Forum",
      scopes: [
        { value: "forum:read", label: "Read forum", description: "View forum threads and posts", minRole: 0, disabled: userRole < 0 },
        { value: "forum:write", label: "Create/reply forum", description: "Create threads and reply to posts", minRole: 20, disabled: userRole < 20 },
      ],
    },
    {
      label: "Meetups",
      scopes: [
        { value: "meetups:read", label: "Read meetups", description: "View meetup listings", minRole: 0, disabled: userRole < 0 },
        { value: "meetups:write", label: "Create meetups", description: "Create and manage meetup events", minRole: 30, disabled: userRole < 30 },
      ],
    },
    {
      label: "Profile",
      scopes: [
        { value: "profile:read", label: "Read your profile", description: "View your profile information", minRole: 10, disabled: userRole < 10 },
        { value: "profile:write", label: "Edit your profile", description: "Update your profile and settings", minRole: 10, disabled: userRole < 10 },
      ],
    },
    {
      label: "Moderation",
      scopes: [
        { value: "moderation:read", label: "View mod queue", description: "View the build moderation queue", minRole: 30, disabled: userRole < 30 },
        { value: "moderation:write", label: "Approve/reject builds", description: "Approve or reject builds in the mod queue", minRole: 30, disabled: userRole < 30 },
      ],
    },
    {
      label: "Admin",
      scopes: [
        { value: "admin:read", label: "Admin read access", description: "View admin panels and user data", minRole: 50, disabled: userRole < 50 },
        { value: "admin:write", label: "Admin write access", description: "Modify roles, ban users, manage site", minRole: 50, disabled: userRole < 50 },
      ],
    },
    {
      label: "Global",
      scopes: [
        { value: "*", label: "Full access", description: "Unrestricted access to all API endpoints", minRole: 10, disabled: userRole < 10 },
      ],
    },
  ];

  const handleToggleScope = useCallback((scopeValue: string) => {
    setSelectedScopes((prev) => {
      if (prev.includes(scopeValue)) {
        return prev.filter((s) => s !== scopeValue);
      }
      return [...prev, scopeValue];
    });
  }, []);

  const handleToggleAll = useCallback((groupScopes: string[]) => {
    setSelectedScopes((prev) => {
      const allSelected = groupScopes.every((s) => prev.includes(s));
      if (allSelected) {
        return prev.filter((s) => !groupScopes.includes(s));
      }
      return [...new Set([...prev, ...groupScopes])];
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (name.trim().length > 100) {
      setError("Name must be 100 characters or less");
      return;
    }

    if (selectedScopes.length === 0) {
      setError("Select at least one scope");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate expiration timestamp
      let expiresAt: number | null = null;
      if (expiresInDays !== null) {
        expiresAt = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
      }

      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes: selectedScopes,
          expiresAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create token");
      }

      const data = await response.json();
      onSubmit(data.rawToken, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, selectedScopes, expiresInDays, onSubmit]);

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "var(--color-surface)",
        border: "3px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-brut)",
        marginBottom: "1.5rem",
      }}
    >
      <h3
        style={{
          margin: "0 0 1rem 0",
          fontFamily: "var(--font-display)",
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        Create New Token
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Error message */}
          {error && (
            <div
              style={{
                padding: "0.75rem",
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

          {/* Name field */}
          <div>
            <label
              htmlFor="token-name"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.375rem",
              }}
            >
              Token Name <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              type="text"
              id="token-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My MCP Token, CI/CD Script"
              maxLength={100}
              required
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--text)",
                background: "var(--color-bg)",
                border: "2px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-focus)";
                e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-focus) 20%, transparent)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              A descriptive name to identify this token
            </span>
          </div>

          {/* Scopes */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.75rem",
              }}
            >
              Scopes <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {scopeGroups.map((group) => {
                const groupScopeValues = group.scopes.map((s) => s.value);
                const allSelected = groupScopeValues.every((s) => selectedScopes.includes(s));
                const someSelected = groupScopeValues.some((s) => selectedScopes.includes(s));

                return (
                  <div
                    key={group.label}
                    style={{
                      padding: "0.875rem",
                      background: "var(--color-surface-alt)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.625rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`scope-group-${group.label}`}
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => handleToggleAll(groupScopeValues)}
                        style={{
                          width: "1rem",
                          height: "1rem",
                          accentColor: "var(--color-primary-600)",
                        }}
                      />
                      <label
                        htmlFor={`scope-group-${group.label}`}
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "0.6875rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        {group.label}
                      </label>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {group.scopes.map((scope) => (
                        <label
                          key={scope.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            padding: "0.375rem 0.625rem",
                            background: selectedScopes.includes(scope.value)
                              ? "var(--color-secondary-200)"
                              : "var(--color-surface)",
                            border: `2px solid ${selectedScopes.includes(scope.value) ? "var(--color-border)" : "var(--color-border)"}`,
                            borderRadius: "var(--radius-sm)",
                            cursor: scope.disabled ? "not-allowed" : "pointer",
                            opacity: scope.disabled ? 0.5 : 1,
                          }}
                          title={
                            scope.disabled
                              ? `Requires ${getRoleLabel(scope.minRole)} or higher`
                              : scope.description
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope.value)}
                            onChange={() => !scope.disabled && handleToggleScope(scope.value)}
                            disabled={scope.disabled}
                            style={{
                              width: "0.875rem",
                              height: "0.875rem",
                              accentColor: "var(--color-primary-600)",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "var(--text)",
                            }}
                          >
                            {scope.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label
              htmlFor="token-expiration"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.375rem",
              }}
            >
              Expires In
            </label>
            <select
              id="token-expiration"
              value={expiresInDays ?? ""}
              onChange={(e) => setExpiresInDays(e.target.value === "" ? null : Number(e.target.value))}
              style={{
                width: "100%",
                maxWidth: "300px",
                padding: "0.625rem 0.875rem",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--text)",
                background: "var(--color-bg)",
                border: "2px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                outline: "none",
                cursor: "pointer",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-focus)";
                e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-focus) 20%, transparent)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            >
              {EXPIRATION_OPTIONS.map((option) => (
                <option key={option.value ?? "none"} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.625rem 1.25rem",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "var(--color-ink-950)",
                background: "var(--color-primary-600)",
                border: "3px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-brut-sm)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Creating..." : "Create Token"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: "0.625rem 1.25rem",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text)",
                background: "transparent",
                border: "3px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function getRoleLabel(role: number): string {
  const labels: Record<number, string> = {
    0: "Visitor",
    10: "Member",
    20: "Maker",
    30: "Trusted Maker",
    40: "Moderator",
    50: "Admin",
  };
  return labels[role] || `Role ${role}`;
}
