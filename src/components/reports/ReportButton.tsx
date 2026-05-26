import { useState } from "react";
import { ROLES } from "../../lib/roles";

interface ReportButtonProps {
  entityType: string;
  entityId: string;
  userRole: number;
}

export default function ReportButton({ entityType, entityId, userRole }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Only show to Members+ (userRole is already a numeric level)
  if (userRole < ROLES.MEMBER) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          reason,
          details: details || undefined,
        }),
      });

      if (response.status === 201) {
        setMessage({ type: "success", text: "Report submitted successfully" });
        setReason("");
        setDetails("");
        setTimeout(() => setIsOpen(false), 2000);
      } else if (response.status === 409) {
        setMessage({ type: "error", text: "You have already reported this content" });
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to submit report" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-link transition-colors underline decoration-1 underline-offset-2 cursor-pointer"
        aria-label="Report this content"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
        Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-surface border-2 border-border p-6 max-w-md w-full mx-4 rounded-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text mb-4">Report Content</h3>

            {message && (
              <div className={`p-3 mb-4 border-2 ${message.type === "success" ? "bg-primary-100 border-primary-600" : "bg-ink-100 border-ink-600"} rounded-sm`}>
                <p className="text-sm text-text">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Reason for report
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason((e.target as HTMLSelectElement).value)}
                  className="w-full p-3 border-2 border-border bg-surface text-text rounded-sm"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="off_topic">Off Topic</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
                  className="w-full p-3 border-2 border-border bg-surface text-text min-h-[100px] rounded-sm"
                  placeholder="Provide any additional context..."
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 border-2 border-border hover:bg-surface-alt transition-colors rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reason || isSubmitting}
                  className="px-5 py-2.5 bg-primary-600 text-text-inverse border-2 border-border hover:bg-primary-700 transition-colors rounded-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
