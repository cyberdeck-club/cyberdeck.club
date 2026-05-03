/**
 * CommentForm - React component for posting comments on builds
 * Shows the markdown editor and handles submission
 */

import React, { useState, useCallback } from "react";
import { SharedMarkdownEditor } from "@/components/editor/SharedMarkdownEditor";

interface CommentFormProps {
  buildSlug: string;
  guidelinesAccepted: boolean;
  parentId?: string;
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function CommentForm({
  buildSlug,
  guidelinesAccepted,
  parentId,
  onSuccess,
  redirectUrl,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!guidelinesAccepted) {
        const redirectTo = redirectUrl ?? `/builds/${buildSlug}`;
        window.location.href = `/guidelines?redirect=${encodeURIComponent(redirectTo)}`;
        return;
      }

      if (!content.trim()) {
        setError("Please write some content for your comment.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/builds/${buildSlug}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            parentId: parentId || undefined,
          }),
        });

        const data = await response.json();

        if (response.status === 403) {
          if (data.error === "guidelines_required") {
            const redirectTo = redirectUrl ?? `/builds/${buildSlug}`;
            window.location.href = data.redirect + "?redirect=" + encodeURIComponent(redirectTo);
            return;
          }
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to post comment");
        }

        // Clear content and notify success
        setContent("");
        onSuccess?.();

        // Reload the page to show the new comment
        window.location.reload();
      } catch (err) {
        console.error("Comment submit error:", err);
        setError(err instanceof Error ? err.message : "Failed to post comment. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [buildSlug, content, guidelinesAccepted, redirectUrl, onSuccess, parentId]
  );

  return (
    <div className="comment-form-container">
      <h3 className="comment-form-title">
        {parentId ? "Reply to Comment" : "Leave a Comment"}
      </h3>

      <form onSubmit={handleSubmit} className="comment-form">
        <div className="editor-wrapper">
          <SharedMarkdownEditor
            surface="comment"
            initialContent={content}
            onChange={setContent}
          />
        </div>

        {error && (
          <div className="comment-error" role="alert">
            {error}
          </div>
        )}

        <div className="comment-form-actions">
          <button
            type="submit"
            className="comment-submit-btn"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Posting...
              </>
            ) : (
              <>Post Comment ✨</>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .comment-form-container {
          padding: 1.5rem;
          background: var(--color-surface);
          border: 3px solid var(--color-secondary);
          border-radius: 4px;
        }

        .comment-form-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 1rem;
        }

        .comment-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .editor-wrapper {
          min-height: 120px;
        }

        .comment-error {
          color: var(--color-danger);
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.75rem;
          background: color-mix(in oklch, var(--color-danger) 10%, var(--surface));
          border: 2px solid var(--color-danger);
          border-radius: 4px;
        }

        .comment-form-actions {
          display: flex;
          justify-content: flex-end;
        }

        .comment-submit-btn {
          padding: 0.75rem 1.25rem;
          font-size: 0.9375rem;
          font-weight: 600;
          font-family: inherit;
          background: var(--color-primary);
          border: 3px solid var(--color-border);
          color: var(--color-text-inverse);
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 4px 4px 0 var(--color-shadow-hard);
          transition: transform 0.1s, box-shadow 0.1s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .comment-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 6px 6px 0 var(--color-shadow-hard);
        }

        .comment-submit-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--focus), 4px 4px 0 var(--color-shadow-hard);
        }

        .comment-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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