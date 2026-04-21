/**
 * InlineEditor - Wrapper component for MarkdownEditor with save/cancel controls
 * Provides inline editing interface for wiki articles with permission checks.
 *
 * IMPORTANT: This component is used with Astro's client:only="react" directive,
 * which means all props must be JSON-serializable. Functions, class instances,
 * Dates, etc. cannot be passed as props — they arrive as null on the client.
 *
 * Instead of accepting onSave/onCancel callbacks, this component receives
 * serializable data (articleId, category, slug) and handles the fetch + navigation
 * internally.
 */

import React, { useCallback, useState } from "react";
import type { MarkdownEditorProps } from "./MarkdownEditor";
import { MarkdownEditor } from "./MarkdownEditor";

export interface InlineEditorProps {
  /** The initial markdown content to edit */
  value: string;
  /** Article identifier (e.g. "getting-started:what-is-a-cyberdeck") */
  articleId: string;
  /** URL path segment for the wiki category */
  category: string;
  /** URL path segment for the article */
  slug: string;
  /** Optional save endpoint override (defaults to /api/wiki/articles/:id) */
  saveEndpoint?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  editPermission?: boolean;
}

export function InlineEditor({
  value,
  articleId,
  category,
  slug,
  saveEndpoint = "/api/wiki/articles",
  onChange,
  placeholder,
  disabled = false,
  minHeight = "300px",
  className = "",
  editPermission = true,
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewUrl = `/wiki/${category}/${slug}`;

  const handleChange = useCallback(
    (newValue: string) => {
      setEditValue(newValue);
      setHasChanges(newValue !== value);
      setError(null);
      onChange?.(newValue);
    },
    [value, onChange]
  );

  const handleSave = useCallback(async () => {
    if (isSaving || !hasChanges) return;
    setIsSaving(true);
    setError(null);
    console.log("[DEBUG InlineEditor] Posting to:", saveEndpoint);
    console.log("[DEBUG InlineEditor] Payload:", { contentId: articleId, content: editValue });
    try {
      // Use relative URL with same-origin mode to ensure cookies are sent
      const url = new URL(saveEndpoint, window.location.origin);
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CyberDeck-Request": "1",
        },
        body: JSON.stringify({ contentId: articleId, content: editValue }),
      });
      console.log("[DEBUG InlineEditor] Response status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log("[DEBUG InlineEditor] Error response:", text);
        const data = JSON.parse(text || "{}");
        throw new Error(data.error || `Failed to save (${response.status})`);
      }
      setHasChanges(false);
      setLastSaved(new Date());
      // Navigate back to the view page after successful save
      window.location.href = viewUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [editValue, hasChanges, isSaving, articleId, saveEndpoint, viewUrl]);

  const handleCancel = useCallback(() => {
    // Navigate back to the view page without saving
    window.location.href = viewUrl;
  }, [viewUrl]);

  const handleReset = useCallback(() => {
    setEditValue(value);
    setHasChanges(false);
    setError(null);
  }, [value]);

  if (!editPermission) {
    return (
      <div
        className={`inline-editor-readonly ${className}`}
        style={{
          padding: "1rem",
          border: "3px solid var(--border)",
          borderRadius: "8px",
          backgroundColor: "var(--surface)",
          color: "var(--text-muted)",
          minHeight,
          fontWeight: 600,
        }}
      >
        <span>You do not have permission to edit this article.</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-editor ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        border: "3px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "5px 5px 0 var(--border)",
      }}
    >
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "var(--surface)",
            borderBottom: "2px solid var(--border)",
            color: "var(--color-primary)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
      <div
        className="inline-editor-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: "var(--surface)",
          borderBottom: "2px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving || disabled}
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            fontWeight: 800,
            fontFamily: "inherit",
            borderRadius: "6px",
            border: "2px solid var(--border)",
            backgroundColor:
              hasChanges && !isSaving && !disabled ? "var(--color-primary)" : "var(--surface)",
            color:
              hasChanges && !isSaving && !disabled ? "white" : "var(--text-muted)",
            cursor: hasChanges && !isSaving && !disabled ? "pointer" : "not-allowed",
            boxShadow:
              hasChanges && !isSaving && !disabled ? "3px 3px 0 var(--border)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving || disabled}
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            fontWeight: 800,
            fontFamily: "inherit",
            borderRadius: "6px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            cursor: isSaving || disabled ? "not-allowed" : "pointer",
            boxShadow: isSaving || disabled ? "none" : "3px 3px 0 var(--border)",
            transition: "all 0.15s ease",
          }}
        >
          Cancel
        </button>
        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || disabled}
            style={{
              padding: "0.375rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 800,
              fontFamily: "inherit",
              borderRadius: "6px",
              border: "2px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text-muted)",
              cursor: isSaving || disabled ? "not-allowed" : "pointer",
              boxShadow: "3px 3px 0 var(--border)",
              transition: "all 0.15s ease",
            }}
          >
            Reset
          </button>
        )}
        <div style={{ flex: 1 }} />
        {lastSaved && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
        )}
        {hasChanges && !lastSaved && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-accent)",
              fontWeight: 800,
            }}
          >
            Unsaved changes
          </span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <MarkdownEditor
          value={editValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled || isSaving}
          minHeight={minHeight}
          className="inline-editor-markdown"
        />
      </div>
    </div>
  );
}
