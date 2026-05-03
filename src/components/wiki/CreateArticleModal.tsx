/**
 * CreateArticleModal - Modal dialog for creating new wiki articles
 * Provides a form with title, category selection, and initial content.
 */

import React, { useCallback, useState } from "react";
import { SharedMarkdownEditor } from "@/components/editor/SharedMarkdownEditor";

type ArticleStatus = "stub" | "needs-review" | "good" | "featured";

export interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateArticleData) => Promise<void>;
  categories?: CategoryOption[];
  defaultStatus?: ArticleStatus;
  className?: string;
}

export interface CreateArticleData {
  title: string;
  categoryId?: string;
  content: string;
  status: ArticleStatus;
}

export interface CategoryOption {
  id: string;
  label: string;
}

export function CreateArticleModal({
  isOpen,
  onClose,
  onSubmit,
  categories = [],
  defaultStatus = "stub",
  className = "",
}: CreateArticleModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ArticleStatus>(defaultStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!title.trim()) {
        setError("Title is required");
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit({
          title: title.trim(),
          categoryId: categoryId || undefined,
          content,
          status,
        });
        setTitle("");
        setCategoryId("");
        setContent("");
        setStatus(defaultStatus);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create article");
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, categoryId, content, status, defaultStatus, onSubmit, onClose]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setTitle("");
      setCategoryId("");
      setContent("");
      setStatus(defaultStatus);
      setError(null);
      onClose();
    }
  }, [isSubmitting, defaultStatus, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`create-article-modal-overlay ${className}`}
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
        className="create-article-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
          backgroundColor: "var(--surface)",
          border: "3px solid var(--border)",
          borderRadius: "8px",
          boxShadow: "6px 6px 0 var(--shadow-hard)",
        }}
      >
        <div
          className="create-article-modal-header"
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "3px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text)",
            }}
          >
            Create New Article
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: "0.5rem",
              border: "3px solid var(--border)",
              background: "var(--surface)",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              color: "var(--text-muted)",
              borderRadius: "4px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div
            className="create-article-modal-body"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--color-danger)",
                  border: "3px solid var(--color-danger)",
                  borderRadius: "4px",
                  color: "var(--surface)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="article-title"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text)",
                  marginBottom: "0.25rem",
                }}
              >
                Title
              </label>
              <input
                id="article-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title"
                disabled={isSubmitting}
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
                }}
              />
            </div>
            {categories.length > 0 && (
              <div>
                <label
                  htmlFor="article-category"
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Category
                </label>
                <select
                  id="article-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isSubmitting}
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
                  }}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label
                htmlFor="article-status"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text)",
                  marginBottom: "0.25rem",
                }}
              >
                Status
              </label>
              <select
                id="article-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                disabled={isSubmitting}
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
                }}
              >
                <option value="stub">Stub</option>
                <option value="needs-review">Needs Review</option>
                <option value="good">Good</option>
                <option value="featured">Featured</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="article-content"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text)",
                  marginBottom: "0.25rem",
                }}
              >
                Content
              </label>
              <SharedMarkdownEditor
                surface="wiki"
                initialContent={content}
                onChange={setContent}
                placeholder="Enter initial content (Markdown supported)"
                readOnly={isSubmitting}
                minHeight="200px"
              />
            </div>
          </div>
          <div
            className="create-article-modal-footer"
            style={{
              padding: "1rem 1.5rem",
              borderTop: "3px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: "3px solid var(--border)",
                borderRadius: "4px",
                backgroundColor: "var(--surface)",
                color: "var(--text)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: "3px solid var(--border)",
                borderRadius: "4px",
                backgroundColor: isSubmitting || !title.trim() ? "var(--text-muted)" : "var(--color-primary)",
                color: "var(--surface)",
                cursor: isSubmitting || !title.trim() ? "not-allowed" : "pointer",
                boxShadow: isSubmitting || !title.trim() ? "none" : "4px 4px 0 var(--shadow-hard)",
              }}
            >
              {isSubmitting ? "Creating..." : "Create Article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}