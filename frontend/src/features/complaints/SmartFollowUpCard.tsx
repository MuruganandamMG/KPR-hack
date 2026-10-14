import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  HelpCircle,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { clarifyComplaint } from "./api";
import type { Complaint } from "./types";

export interface SmartFollowUpCardProps {
  complaint: Complaint;
  onComplaintUpdated?: (updated: Complaint) => void;
}

export function SmartFollowUpCard({
  complaint,
  onComplaintUpdated,
}: SmartFollowUpCardProps) {
  const followUp = complaint.analysis?.smart_follow_up;
  if (!followUp) return null;

  const currentAnswer = followUp.answered_option;
  const [selected, setSelected] = useState<string>(
    currentAnswer || followUp.options[0]?.label || "",
  );
  const [isEditing, setIsEditing] = useState<boolean>(!currentAnswer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOpt = followUp.options.find((opt) => opt.label === selected);

  async function handleConfirm() {
    if (!selectedOpt) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await clarifyComplaint(complaint.tracking_id, {
        selected_option: selectedOpt.label,
        urgency: selectedOpt.urgency_impact,
      });
      onComplaintUpdated?.(updated);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit clarification. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Answered State
  if (currentAnswer && !isEditing) {
    return (
      <section
        aria-label="Smart follow-up clarification"
        className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 text-left shadow-xs md:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-semibold tracking-wider text-emerald-900 uppercase">
                  AI Smart Clarification Confirmed
                </h3>
              </div>
              <p className="text-xs text-stone-500">
                Citizen clarified grievance scope
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-emerald-800 hover:text-emerald-950"
            onClick={() => setIsEditing(true)}
          >
            Change Answer
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-white/80 p-3">
          <div>
            <p className="text-xs font-semibold text-stone-500">
              Confirmed Scope:
            </p>
            <p className="text-sm font-bold text-emerald-950">
              {currentAnswer}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Updated Urgency:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                complaint.analysis?.urgency === "Critical"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : complaint.analysis?.urgency === "High"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {complaint.analysis?.urgency} Priority
            </span>
          </div>
        </div>
      </section>
    );
  }

  // Interactive Question State
  return (
    <section
      aria-label="Smart follow-up clarification"
      className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 p-4 text-left shadow-xs md:p-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <HelpCircle size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-semibold tracking-wider text-amber-900 uppercase">
                AI Smart Follow-up Clarification
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Interactive triage · Clarify scope to prioritize response
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
          Action Recommended
        </span>
      </div>

      {/* Question Prompt */}
      <div className="mt-3">
        <h4 className="text-sm font-bold text-stone-900">
          {followUp.question}
        </h4>
        <p className="mt-1 text-xs text-stone-500">
          {followUp.category_context}
        </p>
      </div>

      {/* Options Radio List */}
      <div
        className="mt-3 space-y-2"
        role="radiogroup"
        aria-label={followUp.question}
      >
        {followUp.options.map((opt) => {
          const isSelected = selected === opt.label;
          return (
            <label
              key={opt.label}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                isSelected
                  ? "border-amber-400 bg-amber-50/80 shadow-xs"
                  : "border-stone-200 bg-white/70 hover:border-amber-200 hover:bg-stone-50"
              }`}
            >
              <input
                type="radio"
                name={`followup-${complaint.tracking_id}`}
                value={opt.label}
                checked={isSelected}
                disabled={busy}
                onChange={() => setSelected(opt.label)}
                className="sr-only"
              />
              <div className="mt-0.5 shrink-0">
                {isSelected ? (
                  <CheckCircle2 size={18} className="text-amber-700" />
                ) : (
                  <Circle size={18} className="text-stone-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold text-stone-900">
                    {opt.label}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      opt.urgency_impact === "Critical"
                        ? "bg-red-100 text-red-800"
                        : opt.urgency_impact === "High"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {opt.priority_weight} ({opt.urgency_impact})
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {opt.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-amber-100 pt-3">
        <p className="text-[11px] text-stone-500">
          Selecting higher scope automatically updates municipal dispatch
          priority.
        </p>
        <div className="flex items-center gap-2">
          {currentAnswer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy || !selected}
            onClick={handleConfirm}
            className="bg-amber-700 text-white hover:bg-amber-800"
          >
            {busy ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                Updating Priority...
              </>
            ) : (
              <>
                Confirm &amp; Update Priority
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
