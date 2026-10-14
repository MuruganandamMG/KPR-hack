import {
  AlertTriangle,
  HeartHandshake,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { Complaint } from "./types";

export interface EmotionalUrgencyCardProps {
  complaint: Complaint;
}

export function EmotionalUrgencyCard({ complaint }: EmotionalUrgencyCardProps) {
  const emotional = complaint.analysis?.emotional_urgency;
  if (!emotional) return null;

  const isEscalated = emotional.base_urgency !== emotional.escalated_urgency;
  const scorePercent = Math.round(emotional.emotional_score * 100);

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        emotional.detected || isEscalated
          ? "border-rose-200 bg-rose-50/60 shadow-sm"
          : "border-stone-200 bg-stone-50/50"
      }`}
      aria-label="Emotional urgency analysis"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              emotional.detected
                ? "bg-rose-100 text-rose-700"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {emotional.detected ? (
              <HeartHandshake size={18} />
            ) : (
              <Sparkles size={18} />
            )}
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-stone-500">
              USP 2 · AI Distress & Urgency Detection
            </p>
            <h3 className="font-semibold text-stone-900">
              {emotional.detected
                ? "Emotional Distress & Urgency Elevated"
                : "Emotional Urgency Evaluation"}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEscalated && (
            <span className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <ShieldAlert size={13} />
              Elevated: {emotional.base_urgency} → {emotional.escalated_urgency}
            </span>
          )}
          <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700">
            Distress index: {scorePercent}%
          </span>
        </div>
      </div>

      {emotional.escalation_reason && (
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          <strong className="font-medium text-stone-900">
            Reason for priority adjustment:{" "}
          </strong>
          {emotional.escalation_reason}
        </p>
      )}

      {emotional.distress_signals && emotional.distress_signals.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-stone-200/60">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Detected distress & vulnerability indicators:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {emotional.distress_signals.map((signal, idx) => (
              <span
                key={`${signal}-${idx}`}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-800 shadow-2xs"
              >
                <AlertTriangle size={12} className="text-rose-600" />
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
