import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  FileText,
  Lightbulb,
  Mic,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { Complaint, EvidenceItem } from "./types";

export function EvidenceHighlight({ complaint }: { complaint: Complaint }) {
  const { analysis } = complaint;

  if (!analysis) {
    return null;
  }

  const rawText =
    complaint.original_text ||
    analysis.transcript ||
    "Original citizen input transcript";

  // Build items from backend evidence_highlights or derive from keywords & detected meaning
  let items: EvidenceItem[] =
    analysis.evidence_highlights && analysis.evidence_highlights.length > 0
      ? analysis.evidence_highlights
      : [];

  if (items.length === 0 && analysis.keywords && analysis.keywords.length > 0) {
    items = analysis.keywords.slice(0, 4).map((kw) => {
      const isUrgent =
        kw.toLowerCase().includes("naala") ||
        kw.toLowerCase().includes("day") ||
        kw.toLowerCase().includes("mosama") ||
        kw.toLowerCase().includes("urgent") ||
        analysis.urgency === "High" ||
        analysis.urgency === "Critical";

      return {
        phrase: kw,
        translation:
          kw.toLowerCase() === "mosama"
            ? "severely damaged / poor condition"
            : kw.toLowerCase() === "thanni"
              ? "water supply"
              : kw.toLowerCase() === "road"
                ? "roadway infrastructure"
                : `${kw} (translated)`,
        significance: isUrgent
          ? `Direct indicator for ${analysis.urgency} urgency`
          : `Civic keyword linked to ${analysis.primary_department}`,
      };
    });
  }

  const urgencyPillStyles: Record<string, string> = {
    Low: "bg-slate-100 text-slate-800 border-slate-300",
    Medium: "bg-blue-100 text-blue-900 border-blue-300",
    High: "bg-orange-100 text-orange-950 border-orange-300",
    Critical: "bg-red-100 text-red-950 border-red-300",
  };

  const urgencyBridgeExplanation =
    analysis.urgency === "Critical"
      ? "Direct threat to life, public safety, or emergency infrastructure reported"
      : analysis.urgency === "High"
        ? "Essential civic utility unavailable or persistent hazard requiring expedited resolution"
        : analysis.urgency === "Medium"
          ? "Noticeable disruption requiring scheduled operational maintenance"
          : "Routine municipal request with standard turnaround window";

  return (
    <section
      className="evidence-highlight-section rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-stone-50/80 p-4 sm:p-5 shadow-xs"
      aria-label="Evidence Highlighting"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">
              Evidence Highlighting & Translation
            </h3>
            <p className="text-xs text-stone-500">
              Bilingual phrase mapping with observable civic proof
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
          Explainable AI USP
        </span>
      </div>

      {/* Citizen's verbatim statement */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs font-medium text-stone-500">
          <span className="flex items-center gap-1.5 font-semibold text-stone-700">
            {complaint.input_type === "voice" ? (
              <Mic size={14} className="text-emerald-700" />
            ) : (
              <FileText size={14} className="text-emerald-700" />
            )}
            Citizen says (Verbatim Dialect Input)
          </span>
          <span className="italic">
            {analysis.language} · {analysis.dialect || "Colloquial"}
          </span>
        </div>
        <p className="mt-2 text-base font-serif italic text-stone-800">
          &ldquo;{rawText}&rdquo;
        </p>
      </div>

      {/* Highlighted Phrase Cards with upward arrows */}
      {items.length > 0 && (
        <div className="mb-5">
          <p className="mb-2.5 text-xs font-semibold tracking-wider text-stone-500 uppercase">
            Phrase-Level Translation & Civic Interpretation
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => (
              <div
                key={`${item.phrase}-${idx}`}
                className="group relative flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs transition-colors hover:border-emerald-400"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 font-mono text-xs font-bold text-emerald-900">
                      {item.phrase}
                    </span>
                    <span className="text-[10px] font-medium text-stone-400">
                      dialect phrase
                    </span>
                  </div>

                  <div className="my-1.5 flex items-center gap-1 text-emerald-700">
                    <ArrowUp size={14} className="shrink-0 stroke-[2.5]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      Translates to
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-stone-800">
                    {item.translation}
                  </p>
                </div>

                <div className="mt-2.5 border-t border-stone-100 pt-2 text-xs text-stone-600">
                  <span className="font-medium text-stone-700">Impact: </span>
                  {item.significance}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning Bridge: Why Urgency & Department were determined */}
      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-lg bg-emerald-700 p-1.5 text-white">
            <Lightbulb size={16} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Reasoning Bridge · Why Urgency is {analysis.urgency}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">
              {urgencyBridgeExplanation}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 shadow-xs">
                Citizen Evidence: &ldquo;
                {items[0]?.phrase || analysis.keywords[0] || "Reported fault"}
                &rdquo;
              </span>
              <span className="text-stone-400">→</span>
              <span className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 shadow-xs">
                Impact: {analysis.detected_meaning}
              </span>
              <span className="text-stone-400">→</span>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-semibold ${
                  urgencyPillStyles[analysis.urgency] ||
                  "bg-stone-100 text-stone-800"
                }`}
              >
                <Zap size={12} />
                {analysis.urgency} Priority
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
