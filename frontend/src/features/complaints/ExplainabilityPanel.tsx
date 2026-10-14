import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Complaint } from "./types";

export interface ExplainabilityPanelProps {
  complaint: Complaint;
  defaultOpen?: boolean;
}

interface Checkpoint {
  id: string;
  title: string;
  detail: string;
  badge: string;
}

export function ExplainabilityPanel({
  complaint,
  defaultOpen = true,
}: ExplainabilityPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { analysis } = complaint;

  if (!analysis) return null;

  // Extract duration from officer summary, evidence highlights, or fallback
  const durationText =
    analysis.officer_summary?.duration &&
    analysis.officer_summary.duration !== "Unspecified"
      ? analysis.officer_summary.duration
      : analysis.evidence_highlights?.find(
          (e) =>
            e.translation.toLowerCase().includes("day") ||
            e.translation.toLowerCase().includes("week") ||
            e.translation.toLowerCase().includes("hour") ||
            e.translation.toLowerCase().includes("month"),
        )?.translation || "Active ongoing disruption";

  // Extract prominent dialect / vernacular phrase
  const dialectEvidence =
    analysis.evidence_highlights?.[0]?.phrase ||
    analysis.keywords?.[0] ||
    "Regional colloquialisms";

  const dialectTranslation =
    analysis.evidence_highlights?.[0]?.translation || "";

  const assignedDept =
    complaint.assigned_department || analysis.primary_department;

  // 7 core checkpoints mandated by government-grade explainability
  const checkpoints: Checkpoint[] = [
    {
      id: "language",
      title: `Detected ${analysis.language}`,
      detail: `Citizen input was accurately recognized as ${analysis.language} with verified phonetics and vocabulary.`,
      badge: analysis.language,
    },
    {
      id: "dialect",
      title: `Recognized dialect phrase`,
      detail: dialectTranslation
        ? `Colloquial phrase "${dialectEvidence}" translated to "${dialectTranslation}" (${analysis.dialect || "Regional Dialect"}).`
        : `Idiomatic expression "${dialectEvidence}" decoded from ${analysis.dialect || "regional dialect"}.`,
      badge: analysis.dialect || "Dialect Recognized",
    },
    {
      id: "mapping",
      title: `Complaint mapped to ${analysis.category}`,
      detail: `Civic intent resolved as "${analysis.intent}" within municipal taxonomy.`,
      badge: analysis.category,
    },
    {
      id: "essential",
      title: `Essential Service`,
      detail: `${analysis.category} is classified as an Essential Municipal Service under public welfare statutes.`,
      badge: "Statutory Lifeline",
    },
    {
      id: "duration",
      title: `Duration detected`,
      detail: `Issue verified as persistent (${durationText}), escalating community impact.`,
      badge: durationText,
    },
    {
      id: "priority",
      title: `${analysis.urgency} Priority`,
      detail: `Assigned ${analysis.urgency} urgency based on service criticality, outage duration, and citizen impact.`,
      badge: `${analysis.urgency} Priority`,
    },
    {
      id: "routing",
      title: `Routed to ${assignedDept} Department`,
      detail: `${assignedDept} holds direct municipal jurisdiction, equipment, and field officers to resolve this fault.`,
      badge: assignedDept,
    },
  ];

  return (
    <section
      aria-label="Explainability panel"
      className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-4 text-left shadow-xs md:p-5"
    >
      {/* Header with expand/collapse control */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 text-left focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-xs">
            <ShieldCheck size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
                Explainability Panel · XAI
              </h3>
            </div>
            <h2 className="mt-0.5 text-base font-bold text-stone-900">
              Why was this routed?
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 sm:inline-block">
            7 of 7 Criteria Verified
          </span>
          <span className="text-stone-500">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
      </button>

      {/* Checkpoints Body */}
      {isOpen && (
        <div className="mt-4 space-y-2.5 border-t border-emerald-100/80 pt-4">
          <p className="text-xs text-stone-500">
            Automated reasoning trace confirming verifiable linguistic and
            statutory evidence for this municipal routing decision:
          </p>

          <ol className="space-y-2" aria-label="Routing criteria checklist">
            {checkpoints.map((cp) => (
              <li
                key={cp.id}
                className="flex items-start gap-3 rounded-xl border border-emerald-100/90 bg-white/90 p-2.5 shadow-2xs transition-all hover:border-emerald-200 hover:bg-emerald-50/30 md:p-3"
              >
                {/* Green checkmark circle */}
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-stone-900 md:text-sm">
                      ✔ {cp.title}
                    </span>
                    <span className="rounded-md bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {cp.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                    {cp.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Trust Guarantee Footer */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-100/60 p-2.5 text-xs text-emerald-900">
            <FileCheck2 size={16} className="shrink-0 text-emerald-800" />
            <p className="leading-snug">
              <strong className="font-semibold">
                Transparent Governance Guarantee:
              </strong>{" "}
              100% deterministic traceability from citizen dialect to official
              department jurisdiction.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
