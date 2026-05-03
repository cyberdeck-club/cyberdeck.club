/**
 * CreateArticleButton - React component for creating new wiki articles
 * Shows a button that opens the CreateArticleModal.
 */

import { useCallback, useState } from "react";
import { CreateArticleModal } from "./CreateArticleModal";

interface CategoryOption {
  id: string;
  label: string;
}

interface CreateArticleButtonProps {
  defaultCategory?: string;
  categories?: CategoryOption[];
  onArticleCreated?: (articleId: string) => void;
  buttonLabel?: string;
  buttonStyle?: "primary" | "secondary";
}

export function CreateArticleButton({
  defaultCategory,
  categories = [],
  onArticleCreated,
  buttonLabel = "Create New Article",
  buttonStyle = "primary",
}: CreateArticleButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: { title: string; categoryId?: string; content: string; status: string }) => {
      setError(null);
      try {
        const response = await fetch("/api/wiki/articles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: data.title,
            categoryId: data.categoryId || defaultCategory,
            content: data.content,
            status: data.status || "stub",
          }),
        });

        if (response.status === 403) {
          const responseData = await response.json();
          if (responseData.error === "guidelines_required") {
            // Redirect to guidelines page with return URL
            const redirectTo = encodeURIComponent(window.location.pathname);
            window.location.href = `/guidelines?redirect=${redirectTo}`;
            return;
          }
          throw new Error(responseData.error || responseData.message || "Insufficient permissions");
        }

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.error || "Failed to create article");
        }

        const result = await response.json();
        setShowModal(false);
        onArticleCreated?.(result.id);
        // Redirect to the new article
        if (result.id) {
          window.location.href = `/wiki/${data.categoryId || defaultCategory}/${result.id}`;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create article");
      }
    },
    [defaultCategory, onArticleCreated]
  );

  const buttonStyles = buttonStyle === "primary"
    ? {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.625rem 1.25rem",
        backgroundColor: "var(--color-primary)",
        color: "white",
        border: "3px solid var(--text)",
        borderRadius: "4px",
        fontSize: "0.9375rem",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "4px 4px 0 var(--text)",
        transition: "all 0.15s ease",
      }
    : {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.625rem 1.25rem",
        backgroundColor: "var(--surface)",
        color: "var(--color-primary)",
        border: "3px solid var(--text)",
        borderRadius: "4px",
        fontSize: "0.9375rem",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "4px 4px 0 var(--text)",
        transition: "all 0.15s ease",
      };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={buttonStyles}
        className="create-article-btn"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        {buttonLabel}
      </button>

      {showModal && (
        <CreateArticleModal
          isOpen={showModal}
          onClose={handleClose}
          onSubmit={handleSubmit}
          categories={categories}
          defaultStatus="stub"
        />
      )}
    </>
  );
}
