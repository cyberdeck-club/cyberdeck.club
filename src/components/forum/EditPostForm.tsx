/**
 * EditPostForm - React component for editing forum posts inline
 * Supports the 30-minute edit window for regular users
 */

import React, { useState, useCallback } from "react";
import { SharedMarkdownEditor } from "@/components/editor/SharedMarkdownEditor";

interface EditPostFormProps {
  postId: string;
  initialContent: string;
  surface?: "forum" | "comment";
  onCancel: () => void;
  onSave: () => void;
}

export function EditPostForm({
  postId,
  initialContent,
  surface = "comment",
  onCancel,
  onSave,
}: EditPostFormProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim()) {
        setError("Content cannot be empty.");
        return;
      }

      if (content.trim() === initialContent.trim()) {
        // No changes, just cancel
        onCancel();
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/forum/posts/${postId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update post");
        }

        onSave();
      } catch (err) {
        console.error("Edit save error:", err);
        setError(err instanceof Error ? err.message : "Failed to update post. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [postId, content, initialContent, onCancel, onSave]
  );

  return (
    <div className="edit-post-form-container">
      <form onSubmit={handleSave} className="edit-form">
        <div className="editor-wrapper">
          <SharedMarkdownEditor
            surface={surface}
            initialContent={initialContent}
            onChange={setContent}
          />
        </div>

        {error && (
          <div className="edit-error" role="alert">
            {error}
          </div>
        )}

        <div className="edit-form-actions">
          <button
            type="button"
            className="edit-cancel-btn"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="edit-save-btn"
            disabled={isSaving || !content.trim()}
          >
            {isSaving ? (
              <>
                <span className="spinner" />
                Saving...
              </>
            ) : (
              <>Save Changes ✨</>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .edit-post-form-container {
          padding: 1rem;
          background: var(--surface);
          border: 3px solid var(--color-primary);
          border-radius: 4px;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .editor-wrapper {
          min-height: 120px;
        }

        .edit-error {
          padding: 0.75rem 1rem;
          background: color-mix(in oklch, var(--color-danger) 10%, var(--surface));
          border: 2px solid var(--color-danger);
          border-radius: 4px;
          color: var(--color-danger);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .edit-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .edit-cancel-btn {
          padding: 0.6rem 1.25rem;
          background: transparent;
          border: 3px solid var(--border);
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-cancel-btn:hover:not(:disabled) {
          border-color: var(--text-muted);
          color: var(--text);
        }

        .edit-cancel-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--focus);
        }

        .edit-save-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background: var(--color-primary);
          border: 3px solid var(--border);
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-inverse);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 3px 3px 0 var(--border);
        }

        .edit-save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 5px 5px 0 var(--border);
        }

        .edit-save-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--focus), 3px 3px 0 var(--border);
        }

        .edit-save-btn:disabled,
        .edit-cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default EditPostForm;
