/**
 * FeedbackWidget - Floating feedback widget for submitting bug reports and feature requests
 * Auto-captures a screenshot of the page, allows additional screenshots, and submits to /api/feedback
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { SharedMarkdownEditor } from "@/components/editor/SharedMarkdownEditor";

type FeedbackPhase = "idle" | "capturing" | "form" | "submitting" | "success" | "error";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<FeedbackPhase>("idle");
  const [description, setDescription] = useState("");
  const [autoScreenshot, setAutoScreenshot] = useState<Blob | null>(null);
  const [autoScreenshotPreview, setAutoScreenshotPreview] = useState<string | null>(null);
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const [userScreenshots, setUserScreenshots] = useState<File[]>([]);
  const [userScreenshotPreviews, setUserScreenshotPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const autoScreenshotRef = useRef<Blob | null>(null);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setPhase("capturing");
    setScreenshotFailed(false);

    // Hide the feedback widget itself during capture
    const widget = document.getElementById("feedback-widget");
    const originalDisplay = widget?.style.display || "";
    if (widget) widget.style.display = "none";

    try {
      // Note: @types/html2canvas (v0.5) conflicts with bundled types;
      // cast options to bypass stale type definitions
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
        foreignObjectRendering: false,
      } as Parameters<typeof html2canvas>[1]);

      // Use toDataURL (synchronous, more reliable than toBlob) then convert to Blob
      const dataUrl = canvas.toDataURL("image/png");
      const blobResponse = await fetch(dataUrl);
      const blob = await blobResponse.blob();

      if (widget) widget.style.display = originalDisplay;

      if (blob && blob.size > 0) {
        autoScreenshotRef.current = blob;
        setAutoScreenshot(blob);
        setAutoScreenshotPreview(dataUrl);
      } else {
        console.error("[FeedbackWidget] Screenshot blob is empty or null");
        setScreenshotFailed(true);
      }
      setPhase("form");
    } catch (err) {
      console.error("[FeedbackWidget] Screenshot capture failed:", err);
      if (widget) widget.style.display = originalDisplay;
      setScreenshotFailed(true);
      setPhase("form");
    }
  }, []);

  const handleClose = useCallback(() => {
    if (phase === "submitting") return;
    setIsOpen(false);
    setPhase("idle");
    setDescription("");
    autoScreenshotRef.current = null;
    setAutoScreenshot(null);
    setAutoScreenshotPreview(null);
    setScreenshotFailed(false);
    setUserScreenshots([]);
    setUserScreenshotPreviews([]);
    setError(null);
    setIssueUrl(null);
  }, [phase]);

  const handleSubmit = useCallback(async () => {
    if (description.trim().length < 10) {
      setError("Please provide at least 10 characters of feedback");
      return;
    }

    setPhase("submitting");
    setError(null);

    const formData = new FormData();

    // If screenshot failed, append a note to the description
    let finalDescription = description.trim();
    if (!autoScreenshotRef.current) {
      finalDescription += "\n\n---\n⚠️ Auto-screenshot capture was unavailable for this submission.";
    }
    formData.append("description", finalDescription);
    formData.append("pageUrl", window.location.href);

    if (autoScreenshotRef.current) {
      formData.append("autoScreenshot", autoScreenshotRef.current, "auto-screenshot.png");
    }

    userScreenshots.forEach((file) => {
      formData.append("userScreenshots", file);
    });

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      const result = await response.json();
      setIssueUrl(result.issueUrl);
      setPhase("success");
    } catch {
      setError("That didn't go through — something went wrong on our end.");
      setPhase("error");
    }
  }, [description, userScreenshots]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remainingSlots = 3 - userScreenshots.length;
      const filesToAdd = files.slice(0, remainingSlots);

      const newPreviews: string[] = [];
      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newPreviews.push(event.target.result as string);
            if (newPreviews.length === filesToAdd.length) {
              setUserScreenshots((prev) => [...prev, ...filesToAdd]);
              setUserScreenshotPreviews((prev) => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      });

      e.target.value = "";
    },
    [userScreenshots.length]
  );

  const removeUserScreenshot = useCallback(
    (index: number) => {
      setUserScreenshots((prev) => prev.filter((_, i) => i !== index));
      setUserScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const handleReset = useCallback(() => {
    setDescription("");
    autoScreenshotRef.current = null;
    setAutoScreenshot(null);
    setAutoScreenshotPreview(null);
    setScreenshotFailed(false);
    setUserScreenshots([]);
    setUserScreenshotPreviews([]);
    setError(null);
    setIssueUrl(null);
    setPhase("idle");
    setIsOpen(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus the panel when opened
      descriptionRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Trap focus within panel
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text)",
    marginBottom: "0.5rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    fontFamily: "var(--font-sans)",
    background: "var(--surface)",
    border: "2px solid var(--border)",
    borderRadius: "4px",
    color: "var(--text)",
    outline: "none",
    boxSizing: "border-box",
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: "0.75rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    border: "3px solid var(--border)",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label="Send feedback"
        aria-expanded={isOpen}
        id="feedback-widget"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 50,
          background: "var(--color-primary-600)",
          color: "var(--color-ink-950)",
          border: "3px solid var(--border)",
          borderRadius: "4px",
          padding: "12px 16px",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "16px",
          boxShadow: "4px 4px 0 0 var(--shadow-hard)",
          cursor: "pointer",
          transition: "transform 75ms, box-shadow 75ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translate(2px, 2px)";
          e.currentTarget.style.boxShadow = "1px 1px 0 0 var(--shadow-hard)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "4px 4px 0 0 var(--shadow-hard)";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "translate(4px, 4px)";
          e.currentTarget.style.boxShadow = "none";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "translate(2px, 2px)";
          e.currentTarget.style.boxShadow = "1px 1px 0 0 var(--shadow-hard)";
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = "none";
          e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus), 0 0 0 4px var(--bg)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = "";
          e.currentTarget.style.boxShadow = "4px 4px 0 0 var(--shadow-hard)";
        }}
      >
        💬 Feedback
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby="feedback-title"
          aria-modal="true"
          style={{
            position: "fixed",
            bottom: "80px",
            right: "24px",
            zIndex: 50,
            width: "380px",
            maxHeight: "80vh",
            overflowY: "auto",
            background: "var(--surface)",
            border: "3px solid var(--border)",
            borderRadius: "4px",
            boxShadow: "6px 6px 0 0 var(--shadow-hard)",
            padding: "24px",
          }}
        >
          {phase === "capturing" && (
            <div
              role="status"
              aria-live="polite"
              style={{
                textAlign: "center",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "1rem",
                  animation: "pulse 1s ease-in-out infinite",
                }}
              >
                📸
              </div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Capturing page...
              </p>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          )}

          {(phase === "form" || phase === "submitting") && (
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "2px solid var(--border)",
                }}
              >
                <h2
                  id="feedback-title"
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color: "var(--text)",
                  }}
                >
                  Share feedback
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={phase === "submitting"}
                  aria-label="Close feedback panel"
                  style={{
                    padding: "0.5rem",
                    border: "2px solid var(--border)",
                    background: "transparent",
                    cursor: phase === "submitting" ? "not-allowed" : "pointer",
                    color: "var(--text-muted)",
                    borderRadius: "4px",
                    fontSize: "1.25rem",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div
                  role="alert"
                  style={{
                    padding: "0.75rem",
                    background: "var(--color-danger)",
                    border: "2px solid var(--color-danger)",
                    borderRadius: "4px",
                    color: "var(--surface)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Auto-screenshot preview */}
              {autoScreenshotPreview && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p style={{ ...labelStyle, marginBottom: "0.5rem" }}>
                    Page screenshot (auto-captured)
                  </p>
                  <img
                    src={autoScreenshotPreview}
                    alt="Auto-captured screenshot of the page"
                    style={{
                      width: "100%",
                      maxHeight: "150px",
                      objectFit: "cover",
                      border: "2px solid var(--border)",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              )}

              {/* Screenshot capture failed notice */}
              {screenshotFailed && !autoScreenshotPreview && (
                <div
                  style={{
                    marginBottom: "1.5rem",
                    padding: "0.75rem",
                    background: "var(--surface-alt, var(--surface))",
                    border: "2px dashed var(--border)",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}
                >
                  📸 Screenshot capture wasn't available — no worries, you can
                  still send your feedback without it, or attach one below.
                </div>
              )}

              {/* Description editor */}
              <div ref={descriptionRef} style={{ marginBottom: "1.5rem" }}>
                <label style={labelStyle}>
                  What's on your mind?
                </label>
                <SharedMarkdownEditor
                  surface="comment"
                  initialContent={description}
                  onChange={setDescription}
                  placeholder="Tell us what you noticed — a bug, something confusing, or an idea to make things better."
                  readOnly={phase === "submitting"}
                  minHeight="150px"
                  maxHeight="200px"
                />
              </div>

              {/* Additional screenshots */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={labelStyle}>Add more screenshots (optional)</label>
                {userScreenshotPreviews.length < 3 && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1rem",
                      border: "2px dashed var(--border)",
                      borderRadius: "4px",
                      cursor: phase === "submitting" ? "not-allowed" : "pointer",
                      color: "var(--text-muted)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      transition: "background 150ms, border-color 150ms",
                    }}
                    onMouseEnter={(e) => {
                      if (phase !== "submitting") {
                        e.currentTarget.style.background = "var(--surface-alt)";
                        e.currentTarget.style.borderColor = "var(--focus)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      disabled={phase === "submitting"}
                      style={{ display: "none" }}
                    />
                    + Add screenshots
                  </label>
                )}

                {/* Screenshot thumbnails */}
                {userScreenshotPreviews.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    {userScreenshotPreviews.map((preview, index) => (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          width: "80px",
                          height: "80px",
                        }}
                      >
                        <img
                          src={preview}
                          alt={`User screenshot ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            border: "2px solid var(--border)",
                            borderRadius: "4px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeUserScreenshot(index)}
                          disabled={phase === "submitting"}
                          aria-label={`Remove screenshot ${index + 1}`}
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "24px",
                            height: "24px",
                            padding: 0,
                            border: "2px solid var(--border)",
                            borderRadius: "50%",
                            background: "var(--color-danger)",
                            color: "var(--surface)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: phase === "submitting" ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={phase === "submitting" || description.trim().length < 10}
                style={{
                  ...buttonBaseStyle,
                  width: "100%",
                  background:
                    phase === "submitting" || description.trim().length < 10
                      ? "var(--text-muted)"
                      : "var(--color-primary-600)",
                  color: "var(--color-ink-950)",
                  cursor:
                    phase === "submitting" || description.trim().length < 10
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    phase === "submitting" || description.trim().length < 10
                      ? "none"
                      : "4px 4px 0 0 var(--shadow-hard)",
                  transition: "transform 75ms, box-shadow 75ms",
                }}
                onMouseEnter={(e) => {
                  if (phase !== "submitting" && description.trim().length >= 10) {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "1px 1px 0 0 var(--shadow-hard)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (phase !== "submitting" && description.trim().length >= 10) {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "4px 4px 0 0 var(--shadow-hard)";
                  }
                }}
                onMouseDown={(e) => {
                  if (phase !== "submitting" && description.trim().length >= 10) {
                    e.currentTarget.style.transform = "translate(4px, 4px)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
                onMouseUp={(e) => {
                  if (phase !== "submitting" && description.trim().length >= 10) {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "1px 1px 0 0 var(--shadow-hard)";
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "none";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px var(--focus), 0 0 0 4px var(--bg)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "";
                  e.currentTarget.style.boxShadow =
                    phase === "submitting" || description.trim().length < 10
                      ? "none"
                      : "4px 4px 0 0 var(--shadow-hard)";
                }}
              >
                {phase === "submitting" ? "Sending..." : "Send feedback ✨"}
              </button>
            </>
          )}

          {phase === "success" && (
            <div role="status" aria-live="polite" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💜</div>
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  color: "var(--text)",
                }}
              >
                Thanks for your feedback!
              </h3>
              <p
                style={{
                  margin: "0 0 1.5rem 0",
                  color: "var(--text-muted)",
                  fontSize: "1rem",
                }}
              >
                We've logged this and will take a look.
              </p>
              {issueUrl && (
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    marginBottom: "1.5rem",
                    color: "var(--color-primary-700)",
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  View on GitHub →
                </a>
              )}
              <a
                href="/my-feedback"
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "var(--text)",
                  fontWeight: 700,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                View all my feedback →
              </a>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  ...buttonBaseStyle,
                  width: "100%",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                Send another
              </button>
            </div>
          )}

          {phase === "error" && (
            <div role="alert" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😔</div>
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  color: "var(--text)",
                }}
              >
                That didn't go through
              </h3>
              <p
                style={{
                  margin: "0 0 1.5rem 0",
                  color: "var(--text-muted)",
                  fontSize: "0.9375rem",
                }}
              >
                Something went wrong on our end. Your feedback matters, so give it
                another try?
              </p>
              <button
                type="button"
                onClick={() => setPhase("form")}
                style={{
                  ...buttonBaseStyle,
                  width: "100%",
                  background: "var(--color-primary-600)",
                  color: "var(--color-ink-950)",
                  boxShadow: "4px 4px 0 0 var(--shadow-hard)",
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
