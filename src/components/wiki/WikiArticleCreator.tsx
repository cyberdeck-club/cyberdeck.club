/**
 * WikiArticleCreator - Full-page wiki article creation form.
 *
 * This React component handles the form state and submission for creating
 * new wiki articles. It's mounted with client:load on the /wiki/new Astro page.
 *
 * Props are JSON-serializable (no callbacks) because this is used with
 * client:load directive. Navigation and API calls are handled internally.
 */

import React, { useCallback, useMemo, useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";

type ArticleStatus = "stub" | "needs-review" | "good" | "featured";

export interface CategoryOption {
  id: string;
  label: string;
  slug: string;
}

export interface WikiArticleCreatorProps {
  /** Available categories for the category selector */
  categories: CategoryOption[];
  /** Pre-selected category slug from ?category= query param */
  defaultCategorySlug?: string;
  /** Whether the user has moderator+ role (>= 40) and can set status */
  canSetStatus?: boolean;
}

/**
 * Generate a URL-friendly slug from a title.
 * Lowercase, replace spaces/special chars with hyphens, strip non-alphanumeric.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function WikiArticleCreator({
  categories,
  defaultCategorySlug = "",
  canSetStatus = false,
}: WikiArticleCreatorProps) {
  // Find the default category ID from the slug
  const defaultCategory = useMemo(
    () => categories.find((c) => c.slug === defaultCategorySlug),
    [categories, defaultCategorySlug]
  );

  const [title, setTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    defaultCategory?.id ?? (categories.length > 0 ? categories[0].id : "")
  );
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ArticleStatus>("stub");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(() => generateSlug(title), [title]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && selectedCategoryId;

  const handleSubmit = useCallback(async () => {
    if (isSaving || !canSubmit) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        categoryId: selectedCategoryId,
        title: title.trim(),
        slug,
        content: content.trim(),
      };

      if (canSetStatus) {
        payload.status = status;
      }

      const response = await fetch("/api/wiki/articles", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CyberDeck-Request": "1",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 403) {
        const data = await response.json();
        if (data.error === "guidelines_required") {
          const redirectTo = encodeURIComponent("/wiki/new");
          window.location.href = `/guidelines?redirect=${redirectTo}`;
          return;
        }
        throw new Error(data.error || data.message || "Insufficient permissions");
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create article");
      }

      // Redirect to the new article
      const categorySlug = selectedCategory?.slug ?? defaultCategorySlug;
      window.location.href = `/wiki/${categorySlug}/${slug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create article");
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    canSubmit,
    selectedCategoryId,
    title,
    slug,
    content,
    canSetStatus,
    status,
    selectedCategory,
    defaultCategorySlug,
  ]);

  const handleCancel = useCallback(() => {
    const categorySlug = selectedCategory?.slug ?? defaultCategorySlug;
    if (categorySlug) {
      window.location.href = `/wiki/${categorySlug}`;
    } else {
      window.location.href = "/wiki";
    }
  }, [selectedCategory, defaultCategorySlug]);

  return (
    <div
      className="wiki-article-creator"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "var(--surface)",
            border: "3px solid var(--color-primary)",
            borderRadius: "4px",
            color: "var(--color-primary)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* Title field */}
      <div>
        <label
          htmlFor="article-title"
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Title <span style={{ color: "var(--color-danger)" }}>*</span>
        </label>
        <input
          id="article-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="Enter article title"
          disabled={isSaving}
          maxLength={200}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            fontFamily: "inherit",
            background: "var(--bg)",
            border: "3px solid var(--border)",
            borderRadius: "4px",
            color: "var(--text)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
        />
        {slug && (
          <span
            style={{
              display: "block",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.375rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            Slug: {slug}
          </span>
        )}
      </div>

      {/* Category selector */}
      {categories.length > 0 && (
        <div>
          <label
            htmlFor="article-category"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Category <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <select
            id="article-category"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setError(null);
            }}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: "var(--bg)",
              border: "3px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status selector — moderator+ only */}
      {canSetStatus && (
        <div>
          <label
            htmlFor="article-status"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Status
          </label>
          <select
            id="article-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ArticleStatus)}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: "var(--bg)",
              border: "3px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            <option value="stub">Stub</option>
            <option value="needs-review">Needs Review</option>
            <option value="good">Good</option>
            <option value="featured">Featured</option>
          </select>
        </div>
      )}

      {/* Content editor */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Content <span style={{ color: "var(--color-danger)" }}>*</span>
        </label>
        <div
          style={{
            border: "3px solid var(--border)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <MarkdownEditor
            value={content}
            onChange={(val) => {
              setContent(val);
              setError(null);
            }}
            placeholder="Write your article content here (Markdown supported)"
            disabled={isSaving}
            minHeight="400px"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "flex-end",
          paddingTop: "1rem",
          borderTop: "2px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            fontFamily: "inherit",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            border: "3px solid var(--border)",
            borderRadius: "4px",
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            cursor: isSaving ? "not-allowed" : "pointer",
            boxShadow: "4px 4px 0 var(--shadow-hard)",
            transition: "all 0.15s ease",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSaving}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            fontFamily: "inherit",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            border: "3px solid var(--border)",
            borderRadius: "4px",
            backgroundColor:
              canSubmit && !isSaving ? "var(--color-primary)" : "var(--text-muted)",
            color: canSubmit && !isSaving ? "var(--text-inverse)" : "var(--surface)",
            cursor: canSubmit && !isSaving ? "pointer" : "not-allowed",
            boxShadow:
              canSubmit && !isSaving ? "4px 4px 0 var(--shadow-hard)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          {isSaving ? "Creating..." : "Create Article"}
        </button>
      </div>
    </div>
  );
}
