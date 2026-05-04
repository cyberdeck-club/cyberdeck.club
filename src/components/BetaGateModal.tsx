/**
 * BetaGateModal - Multi-state modal for beta access gating
 * 
 * Gates access to beta.cyberdeck.club with the following states:
 * - idle: Not a beta site, render nothing
 * - signup: 5-field form for requesting beta access
 * - submitting: Loading state while submitting
 * - pending: Request is pending admin approval
 * - approved: Request approved, show success message
 * - rejected: Request rejected, show message
 * - waitlisted: User has been waitlisted
 * - login: For returning approved users to get magic link
 * - authenticated: User is logged in, let them through
 */

import React, { useCallback, useEffect, useState } from "react";

type BetaState =
  | "idle"
  | "signup"
  | "submitting"
  | "pending"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "login"
  | "authenticated";

const STORAGE_EMAIL_KEY = "cyberdeck-beta-email";
const STORAGE_STATUS_KEY = "cyberdeck-beta-status";
const STORAGE_DISPLAY_NAME_KEY = "cyberdeck-beta-display-name";

interface BetaGateModalProps {
  isAuthenticated: boolean;
}

interface FormData {
  displayName: string;
  email: string;
  interestReason: string;
  makingBackground: string;
  referralSource: string;
}

interface FormErrors {
  displayName?: string;
  email?: string;
  interestReason?: string;
  makingBackground?: string;
  referralSource?: string;
}

const MAX_CHARS = {
  displayName: 30,
  interestReason: 500,
  makingBackground: 500,
  referralSource: 200,
} as const;

export function BetaGateModal({ isAuthenticated }: BetaGateModalProps) {
  const [state, setState] = useState<BetaState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [displayNameFromStorage, setDisplayNameFromStorage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  
  const [formData, setFormData] = useState<FormData>({
    displayName: "",
    email: "",
    interestReason: "",
    makingBackground: "",
    referralSource: "",
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Beta detection
  const isBetaDomain =
    typeof window !== "undefined" &&
    (window.location.hostname === "beta.cyberdeck.club" ||
      window.location.search.includes("beta=true"));

  // Check status on mount
  useEffect(() => {
    if (!isBetaDomain) {
      setState("idle");
      setHasChecked(true);
      return;
    }

    // If authenticated, let them through
    if (isAuthenticated) {
      setState("authenticated");
      setHasChecked(true);
      return;
    }

    // Check localStorage for cached email and status
    const cachedEmail = localStorage.getItem(STORAGE_EMAIL_KEY);
    const cachedStatus = localStorage.getItem(STORAGE_STATUS_KEY) as BetaState | null;
    const cachedDisplayName = localStorage.getItem(STORAGE_DISPLAY_NAME_KEY);

    if (cachedDisplayName) {
      setDisplayNameFromStorage(cachedDisplayName);
    }

    if (cachedEmail && cachedStatus) {
      setFormData(prev => ({ ...prev, email: cachedEmail }));

      // Check with server to get current status
      checkStatus(cachedEmail);
    } else {
      // No cached data, show signup
      setState("signup");
      setHasChecked(true);
    }
  }, [isBetaDomain, isAuthenticated]);

  // Check status with server
  const checkStatus = useCallback(async (checkEmail: string) => {
    try {
      const response = await fetch(
        `/api/beta/status?email=${encodeURIComponent(checkEmail)}`
      );

      if (!response.ok) {
        setState("signup");
        setHasChecked(true);
        return;
      }

      const data = await response.json();

      switch (data.status) {
        case "none":
          // No signup found, clear cache and show signup
          localStorage.removeItem(STORAGE_EMAIL_KEY);
          localStorage.removeItem(STORAGE_STATUS_KEY);
          localStorage.removeItem(STORAGE_DISPLAY_NAME_KEY);
          setState("signup");
          break;
        case "pending":
          setState("pending");
          localStorage.setItem(STORAGE_STATUS_KEY, "pending");
          break;
        case "approved":
          setState("approved");
          localStorage.setItem(STORAGE_STATUS_KEY, "approved");
          break;
        case "rejected":
          setState("rejected");
          localStorage.setItem(STORAGE_STATUS_KEY, "rejected");
          break;
        case "waitlisted":
          setState("waitlisted");
          localStorage.setItem(STORAGE_STATUS_KEY, "waitlisted");
          break;
        default:
          setState("signup");
      }
    } catch {
      // On error, show signup
      setState("signup");
    }
    setHasChecked(true);
  }, []);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.displayName.trim()) {
      errors.displayName = "Please tell us what to call you";
    } else if (formData.displayName.length > MAX_CHARS.displayName) {
      errors.displayName = `Name must be ${MAX_CHARS.displayName} characters or less`;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!formData.interestReason.trim()) {
      errors.interestReason = "We'd love to hear what draws you to cyberdecks";
    } else if (formData.interestReason.length > MAX_CHARS.interestReason) {
      errors.interestReason = `Must be ${MAX_CHARS.interestReason} characters or less`;
    }
    
    if (formData.makingBackground.length > MAX_CHARS.makingBackground) {
      errors.makingBackground = `Must be ${MAX_CHARS.makingBackground} characters or less`;
    }
    
    if (formData.referralSource.length > MAX_CHARS.referralSource) {
      errors.referralSource = `Must be ${MAX_CHARS.referralSource} characters or less`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle input change
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [formErrors]);

  // Handle blur for touched state
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  // Submit for beta access
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Mark all fields as touched for validation display
      setTouched({
        displayName: true,
        email: true,
        interestReason: true,
        makingBackground: true,
        referralSource: true,
      });

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setState("submitting");

      try {
        const response = await fetch("/api/beta/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.toLowerCase().trim(),
            displayName: formData.displayName.trim(),
            interestReason: formData.interestReason.trim(),
            makingBackground: formData.makingBackground.trim() || undefined,
            referralSource: formData.referralSource.trim() || undefined,
          }),
        });

        const data = await response.json();

        // Store for later
        localStorage.setItem(STORAGE_EMAIL_KEY, formData.email.toLowerCase().trim());
        localStorage.setItem(STORAGE_DISPLAY_NAME_KEY, formData.displayName.trim());

        if (!response.ok) {
          setError(data.error || "Something went wrong. Please try again.");
          setState("signup");
          setIsSubmitting(false);
          return;
        }

        // Handle response based on status
        switch (data.status) {
          case "approved":
            setState("approved");
            localStorage.setItem(STORAGE_STATUS_KEY, "approved");
            break;
          case "rejected":
            setState("rejected");
            localStorage.setItem(STORAGE_STATUS_KEY, "rejected");
            break;
          case "waitlisted":
            setState("waitlisted");
            localStorage.setItem(STORAGE_STATUS_KEY, "waitlisted");
            break;
          case "pending":
          default:
            setState("pending");
            localStorage.setItem(STORAGE_STATUS_KEY, "pending");
            break;
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
        setState("signup");
      }
      setIsSubmitting(false);
    },
    [formData, validateForm]
  );

  // Handle login form submit for returning approved users
  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email || !emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        return;
      }

      setIsSubmitting(true);

      try {
        // First check beta signup status
        const statusResponse = await fetch(
          `/api/beta/status?email=${encodeURIComponent(formData.email.toLowerCase().trim())}`
        );

        if (!statusResponse.ok) {
          setError("Failed to check signup status. Please try again.");
          setIsSubmitting(false);
          return;
        }

        const statusData = await statusResponse.json();

        switch (statusData.status) {
          case "approved": {
            // User is approved - send magic link via Better Auth
            const siteUrl = window.location.origin;
            const magicLinkResponse = await fetch("/api/auth/sign-in/magic-link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: formData.email.toLowerCase().trim(),
                callbackURL: siteUrl,
              }),
            });

            if (!magicLinkResponse.ok) {
              let errorMessage = "Failed to send magic link";
              try {
                const errorData = await magicLinkResponse.json();
                errorMessage = errorData.error?.message || errorMessage;
              } catch {
                // response body not JSON — use default message
              }
              setError(errorMessage);
              setIsSubmitting(false);
              return;
            }

            // Show success - magic link sent
            setState("approved");
            localStorage.setItem(STORAGE_STATUS_KEY, "approved");
            break;
          }
          case "pending":
            setState("pending");
            localStorage.setItem(STORAGE_STATUS_KEY, "pending");
            break;
          case "rejected":
            setState("rejected");
            localStorage.setItem(STORAGE_STATUS_KEY, "rejected");
            break;
          case "waitlisted":
            setState("waitlisted");
            localStorage.setItem(STORAGE_STATUS_KEY, "waitlisted");
            break;
          case "none":
          default:
            // No signup found - tell them to request access first
            setError("No beta access request found for this email. Please request access first.");
            setState("signup");
            break;
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
      setIsSubmitting(false);
    },
    [formData]
  );

  // Switch to login state
  const handleShowLogin = useCallback(() => {
    setError(null);
    setState("login");
  }, []);

  // Switch back to signup state
  const handleShowSignup = useCallback(() => {
    setError(null);
    setState("signup");
  }, []);

  // Resend magic link for approved users
  const handleResendMagicLink = useCallback(async () => {
    const email = formData.email || localStorage.getItem(STORAGE_EMAIL_KEY);
    if (!email) {
      setError("No email found. Please sign in again.");
      setState("login");
      return;
    }

    setResendStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          callbackURL: window.location.origin,
        }),
      });

      if (!response.ok) {
        setResendStatus("error");
        setError("Failed to resend magic link. Please try again.");
        return;
      }

      setResendStatus("sent");
    } catch {
      setResendStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }, [formData.email]);

  // Clear localStorage and reset to signup (e.g. wrong email / shared device)
  const handleResetBeta = useCallback(() => {
    localStorage.removeItem(STORAGE_EMAIL_KEY);
    localStorage.removeItem(STORAGE_STATUS_KEY);
    localStorage.removeItem(STORAGE_DISPLAY_NAME_KEY);
    setFormData({
      displayName: "",
      email: "",
      interestReason: "",
      makingBackground: "",
      referralSource: "",
    });
    setDisplayNameFromStorage(null);
    setResendStatus("idle");
    setError(null);
    setState("signup");
  }, []);

  // Don't render anything until we've checked
  if (!hasChecked) return null;

  // Not a beta site or authenticated, render nothing
  if (state === "idle" || state === "authenticated") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-gate-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--surface)",
          border: "4px solid var(--border)",
          borderRadius: "8px",
          boxShadow: "8px 8px 0 var(--shadow-hard)",
          padding: "2rem",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "2.5rem",
              marginBottom: "0.5rem",
            }}
          >
            🔧
          </div>
          <h2
            id="beta-gate-title"
            style={{
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "var(--text)",
              lineHeight: 1.2,
            }}
          >
            cyberdeck.club
          </h2>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Request beta access
          </p>
        </div>

        {/* Content based on state */}
        {(state === "signup" || state === "submitting") && (
          <>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: "var(--text)",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              We're opening cyberdeck.club to a small group of beta testers. It takes about 30 seconds to request access, and a real person reviews every request (usually within a day or two).
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Display Name */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="displayName"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  What should we call you?
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Your name, nickname, handle — whatever you go by"
                  maxLength={MAX_CHARS.displayName}
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg)",
                    border: `3px solid ${touched.displayName && formErrors.displayName ? "var(--color-danger)" : "var(--border)"}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: "var(--text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = touched.displayName && formErrors.displayName ? "var(--color-danger)" : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    This becomes your display name on the site.
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {formData.displayName.length}/{MAX_CHARS.displayName}
                  </span>
                </div>
                {touched.displayName && formErrors.displayName && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: 500 }}>
                    {formErrors.displayName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Your email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg)",
                    border: `3px solid ${touched.email && formErrors.email ? "var(--color-danger)" : "var(--border)"}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: "var(--text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = touched.email && formErrors.email ? "var(--color-danger)" : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  We'll only use this to send you your login link. No newsletters, no spam, no sharing.
                </p>
                {touched.email && formErrors.email && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: 500 }}>
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Interest Reason */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="interestReason"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  What's drawing you to cyberdecks?
                </label>
                <textarea
                  id="interestReason"
                  name="interestReason"
                  value={formData.interestReason}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="No wrong answers — we're just curious what sparked your interest"
                  maxLength={MAX_CHARS.interestReason}
                  required
                  disabled={isSubmitting}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg)",
                    border: `3px solid ${touched.interestReason && formErrors.interestReason ? "var(--color-danger)" : "var(--border)"}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: "var(--text)",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = touched.interestReason && formErrors.interestReason ? "var(--color-danger)" : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", color: formData.interestReason.length > MAX_CHARS.interestReason * 0.9 ? "var(--color-warn)" : "var(--text-muted)" }}>
                    {formData.interestReason.length}/{MAX_CHARS.interestReason}
                  </span>
                </div>
                {touched.interestReason && formErrors.interestReason && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: 500 }}>
                    {formErrors.interestReason}
                  </p>
                )}
              </div>

              {/* Making Background (Optional) */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="makingBackground"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Have you made anything before?{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                </label>
                <textarea
                  id="makingBackground"
                  name="makingBackground"
                  value={formData.makingBackground}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Knitting, woodworking, Arduino projects, zines, cosplay, baking, whatever — it all counts"
                  maxLength={MAX_CHARS.makingBackground}
                  disabled={isSubmitting}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg)",
                    border: `3px solid ${touched.makingBackground && formErrors.makingBackground ? "var(--color-danger)" : "var(--border)"}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: "var(--text)",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = touched.makingBackground && formErrors.makingBackground ? "var(--color-danger)" : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", color: formData.makingBackground.length > MAX_CHARS.makingBackground * 0.9 ? "var(--color-warn)" : "var(--text-muted)" }}>
                    {formData.makingBackground.length}/{MAX_CHARS.makingBackground}
                  </span>
                </div>
                {touched.makingBackground && formErrors.makingBackground && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: 500 }}>
                    {formErrors.makingBackground}
                  </p>
                )}
              </div>

              {/* Referral Source (Optional) */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  htmlFor="referralSource"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  How did you hear about us?{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                </label>
                <input
                  id="referralSource"
                  name="referralSource"
                  type="text"
                  value={formData.referralSource}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="A friend, social media, a blog post, vibes..."
                  maxLength={MAX_CHARS.referralSource}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg)",
                    border: `3px solid ${touched.referralSource && formErrors.referralSource ? "var(--color-danger)" : "var(--border)"}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: "var(--text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = touched.referralSource && formErrors.referralSource ? "var(--color-danger)" : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {formData.referralSource.length}/{MAX_CHARS.referralSource}
                  </span>
                </div>
                {touched.referralSource && formErrors.referralSource && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: 500 }}>
                    {formErrors.referralSource}
                  </p>
                )}
              </div>

              {error && (
                <p
                  style={{
                    margin: "0 0 1rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--color-danger)",
                    color: "var(--text-inverse)",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "0.875rem 1.5rem",
                  backgroundColor: "var(--color-primary-600)",
                  color: "var(--text-inverse)",
                  border: "3px solid var(--border)",
                  borderRadius: "4px",
                  boxShadow: "4px 4px 0 var(--shadow-hard)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: "all 0.15s ease",
                  fontFamily: "var(--font-display)",
                }}
                onMouseDown={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 var(--shadow-hard)";
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
                }}
              >
                {isSubmitting ? "Sending..." : "Request access"}
              </button>
            </form>

            <p
              style={{
                margin: "1rem 0 0",
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Already have access?{" "}
              <button
                type="button"
                onClick={handleShowLogin}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary-700)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                  textDecoration: "underline",
                }}
              >
                Sign in
              </button>
            </p>
          </>
        )}

        {state === "login" && (
          <>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: "var(--text)",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              Welcome back! Enter your email and we'll send you a magic link to sign in to the beta.
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label
                  htmlFor="beta-login-email"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Your email
                </label>
                <input
                  id="beta-login-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg)",
                    border: "3px solid var(--border)",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: "var(--text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {error && (
                <p
                  style={{
                    margin: "0 0 1rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--color-danger)",
                    color: "var(--text-inverse)",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "0.875rem 1.5rem",
                  backgroundColor: "var(--color-primary-600)",
                  color: "var(--text-inverse)",
                  border: "3px solid var(--border)",
                  borderRadius: "4px",
                  boxShadow: "4px 4px 0 var(--shadow-hard)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: "all 0.15s ease",
                  fontFamily: "var(--font-display)",
                }}
                onMouseDown={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 var(--shadow-hard)";
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
                }}
              >
                {isSubmitting ? "Sending..." : "Send Magic Link"}
              </button>
            </form>

            <p
              style={{
                margin: "1rem 0 0",
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Need access?{" "}
              <button
                type="button"
                onClick={handleShowSignup}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary-700)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                  textDecoration: "underline",
                }}
              >
                Request it
              </button>
            </p>
          </>
        )}

        {state === "pending" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              ✨
            </div>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              Got it!
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                color: "var(--text)",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              We'll review your request and email you within a day or two. Keep an eye on your inbox (and your spam folder, just in case).
            </p>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              {displayNameFromStorage ? `Thanks, ${displayNameFromStorage}!` : "You're on the list!"} 💖
            </p>
            <p
              style={{
                margin: "1rem 0 0",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Not you?{" "}
              <button
                type="button"
                onClick={handleResetBeta}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary-700)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                  textDecoration: "underline",
                }}
              >
                Start over
              </button>
            </p>
          </div>
        )}

        {state === "approved" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              🎉
            </div>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              You're in!
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                color: "var(--text)",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              You've been approved! Check your email at{" "}
              <strong>{formData.email || localStorage.getItem(STORAGE_EMAIL_KEY) || "your email"}</strong> for a magic sign-in link.
            </p>

            {error && (
              <p
                style={{
                  margin: "0 0 1rem",
                  padding: "0.75rem",
                  backgroundColor: "var(--color-danger)",
                  color: "var(--text-inverse)",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {error}
              </p>
            )}

            {resendStatus === "sent" ? (
              <p
                style={{
                  margin: "0 0 0.5rem",
                  color: "var(--text)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                ✅ New magic link sent! Check your inbox.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendMagicLink}
                disabled={resendStatus === "sending"}
                style={{
                  display: "inline-block",
                  margin: "0 0 0.75rem",
                  padding: "0.625rem 1.25rem",
                  backgroundColor: "var(--color-primary-600)",
                  color: "var(--text-inverse)",
                  border: "3px solid var(--border)",
                  borderRadius: "4px",
                  boxShadow: "4px 4px 0 var(--shadow-hard)",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: resendStatus === "sending" ? "not-allowed" : "pointer",
                  opacity: resendStatus === "sending" ? 0.7 : 1,
                  transition: "all 0.15s ease",
                  fontFamily: "var(--font-display)",
                }}
                onMouseDown={(e) => {
                  if (resendStatus !== "sending") {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 var(--shadow-hard)";
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "4px 4px 0 var(--shadow-hard)";
                }}
              >
                {resendStatus === "sending" ? "Sending..." : "Resend magic link"}
              </button>
            )}

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              Magic links expire in 5 minutes. Hit resend if you need a fresh one. ✨
            </p>
            <p
              style={{
                margin: "1rem 0 0",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Not you?{" "}
              <button
                type="button"
                onClick={handleResetBeta}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary-700)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                  textDecoration: "underline",
                }}
              >
                Start over
              </button>
            </p>
          </div>
        )}

        {state === "rejected" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              💔
            </div>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              Not this time
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                color: "var(--text)",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              Your request wasn't approved for this round. Check your email for details.
            </p>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              Keep building in the meantime. 🛠️
            </p>
          </div>
        )}

        {state === "waitlisted" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              📝
            </div>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              You're on the list!
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                color: "var(--text)",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              We're bringing people in a few at a time. We'll email you when it's your turn.
            </p>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              {displayNameFromStorage ? `Hang in there, ${displayNameFromStorage}!` : "Hang in there!"} 💖
            </p>
            <p
              style={{
                margin: "1rem 0 0",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Not you?{" "}
              <button
                type="button"
                onClick={handleResetBeta}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary-700)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                  textDecoration: "underline",
                }}
              >
                Start over
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BetaGateModal;
