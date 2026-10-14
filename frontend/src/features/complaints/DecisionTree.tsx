import {
  AlertTriangle,
  ArrowDown,
  Building2,
  FileText,
  Globe,
  Mic,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import type { Complaint } from "./types";

interface StepNode {
  step: string;
  title: string;
  value: string;
  subtitle?: string;
  details?: string;
  keywords?: string[];
  icon: typeof Mic;
  badge?: {
    text: string;
    className: string;
  };
}

export function DecisionTree({ complaint }: { complaint: Complaint }) {
  const { analysis } = complaint;

  if (!analysis) {
    const isResolved = complaint.status === "resolved";
    return (
      <div
        className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 text-sm"
        aria-label="AI Decision Tree"
      >
        <div className="flex items-center gap-2 font-medium text-stone-700">
          <AlertTriangle size={18} className="text-amber-600" />
          <span>Decision Tree Unavailable</span>
        </div>
        <p className="mt-2 text-stone-500">
          {isResolved
            ? "This complaint was classified and resolved manually by an officer without AI decision tree inference."
            : complaint.analysis_error ||
              "This complaint is being reviewed manually by an officer. An automated decision tree is generated during AI inference."}
        </p>
      </div>
    );
  }

  const isVoice = complaint.input_type === "voice";
  const confidencePercent = Math.round(analysis.confidence * 100);

  const urgencyStyles: Record<string, string> = {
    Low: "bg-slate-100 text-slate-700 border-slate-200",
    Medium: "bg-blue-50 text-blue-700 border-blue-200",
    High: "bg-orange-50 text-orange-800 border-orange-200",
    Critical: "bg-red-50 text-red-800 border-red-200",
  };

  const steps: StepNode[] = [
    {
      step: "01",
      title: "Input Ingestion",
      value: isVoice ? "Voice Recording" : "Text Submission",
      subtitle: isVoice
        ? complaint.audio_mime || "Audio format"
        : `${complaint.original_text?.length ?? 0} characters`,
      details:
        complaint.original_text ||
        analysis.transcript ||
        "Audio recording captured",
      icon: isVoice ? Mic : FileText,
      badge: {
        text: isVoice ? "Audio Stream" : "Raw Text",
        className: "bg-stone-100 text-stone-700",
      },
    },
    {
      step: "02",
      title: "Language Identification",
      value: analysis.language,
      subtitle: "Phonetic & linguistic analysis",
      details: "Detected source dialect without pre-translation bias",
      icon: Globe,
      badge: {
        text: "Language",
        className: "bg-emerald-50 text-emerald-800",
      },
    },
    {
      step: "03",
      title: "Dialect & Regional Nuance",
      value: analysis.dialect || "Standard phrasing",
      subtitle: analysis.dialect
        ? "Colloquial terminology resolved"
        : "Standard vocabulary matched",
      details: analysis.detected_meaning,
      icon: Sparkles,
      badge: {
        text: analysis.dialect ? "Regional Dialect" : "Standard",
        className: "bg-purple-50 text-purple-800",
      },
    },
    {
      step: "04",
      title: "Complaint Category & Intent",
      value: analysis.category,
      subtitle: analysis.intent,
      keywords: analysis.keywords,
      icon: Tag,
      badge: {
        text: "Civic Category",
        className: "bg-sky-50 text-sky-800",
      },
    },
    {
      step: "05",
      title: "Urgency Assessment",
      value: `${analysis.urgency} Priority`,
      subtitle:
        analysis.urgency === "Critical"
          ? "Immediate threat to public safety or life"
          : analysis.urgency === "High"
            ? "Substantial community hazard or disruption"
            : analysis.urgency === "Medium"
              ? "Noticeable inconvenience requiring scheduled action"
              : "Routine municipal maintenance",
      icon: Zap,
      badge: {
        text: `${analysis.urgency} Urgency`,
        className:
          urgencyStyles[analysis.urgency] || "bg-stone-100 text-stone-700",
      },
    },
    {
      step: "06",
      title: "Department Routing",
      value: analysis.primary_department,
      subtitle: `Model confidence: ${confidencePercent}%`,
      details: analysis.explanation,
      icon: Building2,
      badge: {
        text: `${confidencePercent}% Confidence`,
        className:
          analysis.confidence >= 0.75
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-amber-50 text-amber-800 border-amber-200",
      },
    },
  ];

  return (
    <div
      className="decision-tree-container"
      aria-label="AI Decision Tree"
      role="region"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-900">
            Explainable AI Reasoning Tree
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            USP
          </span>
        </div>
        <span className="text-xs text-stone-500">
          6-step verifiable inference path
        </span>
      </div>

      <ol className="decision-tree-steps" role="list">
        {steps.map((node, index) => {
          const Icon = node.icon;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={node.step}
              className="decision-tree-node relative"
              role="listitem"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      isLast
                        ? "border-emerald-300 bg-emerald-600 text-white shadow-sm"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon size={18} />
                  </div>
                  {!isLast && (
                    <div
                      className="decision-tree-stem my-1 flex flex-col items-center"
                      aria-hidden="true"
                    >
                      <div className="h-6 w-0.5 bg-emerald-200" />
                      <ArrowDown size={14} className="text-emerald-500" />
                    </div>
                  )}
                </div>

                <div className="decision-tree-card min-w-0 flex-1 rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-xs sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-mono text-[11px] font-semibold tracking-wider text-stone-600 uppercase">
                      Step {node.step} · {node.title}
                    </span>
                    {node.badge && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${node.badge.className}`}
                      >
                        {node.badge.text}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-base font-semibold text-stone-900">
                    {node.value}
                  </p>

                  {node.subtitle && (
                    <p className="mt-0.5 text-xs text-stone-500">
                      {node.subtitle}
                    </p>
                  )}

                  {node.keywords && node.keywords.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-stone-600">
                        Extracted keywords:
                      </span>
                      {node.keywords.map((word, i) => (
                        <span
                          key={`${word}-${i}`}
                          className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-700"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  )}

                  {node.details && (
                    <p className="mt-2 text-xs leading-relaxed text-stone-600">
                      {node.details}
                    </p>
                  )}

                  {isLast && analysis.secondary_departments.length > 0 && (
                    <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-500">
                      <span className="font-medium text-stone-700">
                        Secondary department recommendations:
                      </span>{" "}
                      {analysis.secondary_departments.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
