/**
 * WikiEditor - React island component for wiki article actions
 * Handles navigation to edit mode and delete confirmation.
 * Edit mode is now handled at the page level via URL param.
 */

import React, { useCallback, useState } from "react";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface WikiEditorProps {
  articleId: string;
  title: string;
  content: string;
  category: string;
  canEdit: boolean;
  canDelete: boolean;
  onArticleUpdated?: (updatedArticle: { title?: string; content?: string }) => void;
  onArticleDeleted?: () => void;
}

export function WikiEditor({
  articleId,
  title,
  category,
  canEdit,
  canDelete,
  onArticleDeleted,
}: WikiEditorProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigate to edit mode via URL param
  const handleEdit = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("edit", "true");
    window.location.href = currentUrl.toString();
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/wiki/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId: articleId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete article");
      }

      setShowDeleteModal(false);
      onArticleDeleted?.();
      // Redirect to category page
      window.location.href = `/wiki/${category}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete article");
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [articleId, category, onArticleDeleted]);

  return (
    <>
      {error && (
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: "var(--surface)",
            border: "3px solid var(--color-primary)",
            borderRadius: "8px",
            color: "var(--color-primary)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <div className="article-view-mode">
        <div
          className="article-actions"
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "3px solid var(--border)",
          }}
        >
          {canEdit && (
            <button
              onClick={handleEdit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "var(--color-primary)",
                color: "white",
                border: "3px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: 800,
                fontFamily: "inherit",
                cursor: "pointer",
                boxShadow: "4px 4px 0 var(--border)",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M10 4L12 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Edit Article
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "var(--surface)",
                color: "var(--text)",
                border: "3px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: 800,
                fontFamily: "inherit",
                cursor: "pointer",
                boxShadow: "4px 4px 0 var(--border)",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Delete Article
            </button>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        articleTitle={title}
        isAdmin={false}
      />
    </>
  );
}
