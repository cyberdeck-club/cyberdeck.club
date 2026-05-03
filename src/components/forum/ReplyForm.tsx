/**
 * ReplyForm - React component for posting replies to forum threads
 * Shows the markdown editor and handles submission
 */

import React, { useState, useCallback } from "react";
import { SharedMarkdownEditor } from "@/components/editor/SharedMarkdownEditor";

interface ReplyFormProps {
  threadId: string;
  guidelinesAccepted: boolean;
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function ReplyForm({
  threadId,
  guidelinesAccepted,
  onSuccess,
  redirectUrl,
}: ReplyFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!guidelinesAccepted) {
        const redirectTo = redirectUrl ?? `/forum/thread/${threadId}`;
        window.location.href = `/guidelines?redirect=${encodeURIComponent(redirectTo)}`;
        return;
      }

      if (!content.trim()) {
        setError("Please write some content for your reply.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/forum/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            threadId,
            content,
          }),
        });

        const data = await response.json();

        if (response.status === 403) {
          if (data.error === "guidelines_required") {
            const redirectTo = redirectUrl ?? `/forum/thread/${threadId}`;
            window.location.href = data.redirect + "?redirect=" + encodeURIComponent(redirectTo);
            return;
          }
        }

        if (response.status === 403 && data.error === "Thread is locked") {
          setError("This thread is locked and cannot receive new replies.");
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to post reply");
        }

        // Clear content and notify success
        setContent("");
        onSuccess?.();
        
        // Reload the page to show the new reply
        window.location.reload();
      } catch (err) {
        console.error("Reply submit error:", err);
        setError(err instanceof Error ? err.message : "Failed to post reply. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [threadId, content, guidelinesAccepted, redirectUrl, onSuccess]
  );

  return (
    <div className="reply-form-container">
      <h3 className="reply-form-title">Post a Reply</h3>
      
      <form onSubmit={handleSubmit} className="reply-form">
        <div className="editor-wrapper">
          <SharedMarkdownEditor
            surface="comment"
            initialContent={content}
            onChange={setContent}
          />
        </div>

        {error && (
          <div className="reply-error" role="alert">
            {error}
          </div>
        )}

        <div className="reply-form-actions">
          <button
            type="submit"
            className="reply-submit-btn"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Posting...
              </>
            ) : (
              <>Post Reply ✨</>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .reply-form-container {
          padding: 1.5rem;
          background: var(--surface);
          border: 3px solid var(--color-secondary);
          border-radius: 4px;
        }

        .reply-form-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 1rem;
        }

        .reply-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .editor-wrapper {
          min-height: 150px;
        }

        .reply-error {
          padding: 0.75rem 1rem;
          background: color-mix(in oklch, var(--color-danger) 10%, var(--surface));
          border: 2px solid var(--color-danger);
          border-radius: 4px;
          color: var(--color-danger);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .reply-form-actions {
          display: flex;
          justify-content: flex-end;
        }

        .reply-submit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--color-primary);
          border: 3px solid var(--border);
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-inverse);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 3px 3px 0 var(--border);
        }

        .reply-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 5px 5px 0 var(--border);
        }

        .reply-submit-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--focus), 3px 3px 0 var(--border);
        }

        .reply-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
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

export default ReplyForm;
