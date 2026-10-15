import { useLanguage } from "../localization";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, LoaderCircle, Sparkles } from "lucide-react";

export interface ThinkingTimelineProps {
  mode?: "text" | "voice";
  stepIntervalMs?: number;
}

export interface TimelineStep {
  title: string;
  detail: string;
}

export const VOICE_TIMELINE_STEPS: TimelineStep[] = [
  {
    title: "Receiving Voice Stream...",
    detail: "Buffering citizen audio stream and sampling frequency spectrum",
  },
  {
    title: "Converting Speech to Text...",
    detail: "Transcribing phonetics, acoustic tokens, and spoken speech",
  },
  {
    title: "Detecting Language...",
    detail: "Identifying Indic/Dravidian roots and code-mixed vocabulary",
  },
  {
    title: "Detecting Dialect & Slang...",
    detail: "Translating informal idioms and regional expressions",
  },
  {
    title: "Finding Complaint & Intent...",
    detail: "Extracting civic issue, grievance severity, and urgency",
  },
  {
    title: "Finding Department...",
    detail: "Matching grievance with municipal department jurisdictions",
  },
  {
    title: "Checking Confidence...",
    detail: "Evaluating multi-metric confidence against routing thresholds",
  },
  {
    title: "Running AI Critic Consensus...",
    detail: "Executing dual-AI cross-verification to audit hallucinations",
  },
  {
    title: "Generating Officer Summary...",
    detail: "Synthesizing executive triage brief and suggested action",
  },
  {
    title: "Finalizing Analysis...",
    detail: "Generating verification audit trail and tracking receipt",
  },
];

export const TEXT_TIMELINE_STEPS: TimelineStep[] = [
  {
    title: "Ingesting Citizen Text...",
    detail: "Reading submission payload and sanitizing characters",
  },
  {
    title: "Normalizing Vocabulary...",
    detail: "Disambiguating phonetic spelling and colloquial slang",
  },
  {
    title: "Detecting Language...",
    detail: "Identifying Indic/Dravidian roots and code-mixed vocabulary",
  },
  {
    title: "Detecting Dialect & Slang...",
    detail: "Translating informal idioms and regional expressions",
  },
  {
    title: "Finding Complaint & Intent...",
    detail: "Extracting civic issue, grievance severity, and urgency",
  },
  {
    title: "Finding Department...",
    detail: "Matching grievance with municipal department jurisdictions",
  },
  {
    title: "Checking Confidence...",
    detail: "Evaluating multi-metric confidence against routing thresholds",
  },
  {
    title: "Running AI Critic Consensus...",
    detail: "Executing dual-AI cross-verification to audit hallucinations",
  },
  {
    title: "Generating Officer Summary...",
    detail: "Synthesizing executive triage brief and suggested action",
  },
  {
    title: "Finalizing Analysis...",
    detail: "Generating verification audit trail and tracking receipt",
  },
];

export function ThinkingTimeline({
  mode = "text",
  stepIntervalMs = 450,
}: ThinkingTimelineProps) {
  const { t } = useLanguage();

  const steps = mode === "voice" ? VOICE_TIMELINE_STEPS : TEXT_TIMELINE_STEPS;
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepIntervalMs);

    return () => clearInterval(interval);
  }, [steps, stepIntervalMs]);

  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div
      className="w-full rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 via-white to-stone-50/40 p-4 text-left shadow-xs md:p-5"
      role="status"
      aria-label={t("AI Thinking Timeline")}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Sparkles size={15} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
                {t("AI Cognitive Reasoning Pipeline")}
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              {t("Active multi-stage inference & verification")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="text-xs font-semibold text-emerald-900">
            {t("Step ")}
            {t(currentStep + 1)}
            {t(" of ")}
            {t(steps.length)}
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
            {t(progressPercent)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stepped Timeline */}
      <ol className="mt-4 space-y-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isUpcoming = idx > currentStep;

          return (
            <li
              key={step.title}
              className={`flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                isCurrent
                  ? "border border-emerald-200 bg-emerald-50/70"
                  : isCompleted
                    ? "opacity-90"
                    : "opacity-45"
              }`}
            >
              {/* Icon node */}
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2
                    size={17}
                    className="text-emerald-700"
                    aria-label={t("Completed")}
                  />
                ) : isCurrent ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin text-emerald-700"
                    aria-label={t("In progress")}
                  />
                ) : (
                  <Circle
                    size={17}
                    className="text-stone-300"
                    aria-label={t("Pending")}
                  />
                )}
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? "text-emerald-950 font-bold"
                        : isCompleted
                          ? "text-stone-800 line-through decoration-emerald-500/40"
                          : "text-stone-400 font-normal"
                    }`}
                  >
                    {t(step.title)}
                  </span>
                  {isCurrent && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.2 text-[10px] font-semibold text-white animate-pulse">
                      {t("Active")}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] font-medium text-emerald-700">
                      {t("Done")}
                    </span>
                  )}
                </div>
                {isCurrent && (
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-800">
                    {t(step.detail)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
