import { useLanguage } from "../localization";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import type { Complaint } from "./types";

interface MetricRow {
  key: string;
  label: string;
  subtitle: string;
  score: number;
}

export function ConfidenceMeter({
  complaint,
  threshold = 0.75,
}: {
  complaint: Complaint;
  threshold?: number;
}) {
  const { t } = useLanguage();

  const { analysis } = complaint;

  if (!analysis) {
    return null;
  }

  const breakdown = analysis.confidence_breakdown || {
    understanding: Math.min(
      1,
      Math.round((analysis.confidence + 0.02) * 100) / 100,
    ),
    routing: analysis.confidence,
    urgency: Math.max(0, Math.round((analysis.confidence - 0.03) * 100) / 100),
    overall: analysis.confidence,
  };

  const metrics: MetricRow[] = [
    {
      key: "understanding",
      label: "Understanding",
      subtitle: "Dialect, slang & intent normalization",
      score: breakdown.understanding,
    },
    {
      key: "routing",
      label: "Routing",
      subtitle: "Department & jurisdiction assignment",
      score: breakdown.routing,
    },
    {
      key: "urgency",
      label: "Urgency",
      subtitle: "Hazard & public disruption level",
      score: breakdown.urgency,
    },
    {
      key: "overall",
      label: "Overall",
      subtitle: "Weighted composite trust score",
      score: breakdown.overall,
    },
  ];

  const overallPercent = Math.round(breakdown.overall * 100);
  const isHighConfidence = breakdown.overall >= threshold;

  const getMeterColor = (score: number) => {
    if (score >= threshold) return "bg-emerald-600";
    if (score >= 0.5) return "bg-amber-500";
    return "bg-red-500";
  };

  const getBadgeStyle = (score: number) => {
    if (score >= threshold)
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (score >= 0.5) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <section
      className="confidence-meter-container rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs"
      aria-label={t("AI Confidence Meter")}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Gauge size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">
              {t("AI Confidence Meter")}
            </h3>
            <p className="text-xs text-stone-500">
              {t("Multi-dimensional certainty scores for officers and judges")}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
          {t("Trust & Explainability USP")}
        </span>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => {
          const percent = Math.round(m.score * 100);
          const isOverall = m.key === "overall";

          return (
            <div
              key={m.key}
              className={`rounded-xl p-3 transition-colors ${
                isOverall
                  ? "border border-stone-200 bg-stone-50/80"
                  : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span
                    className={`text-sm ${
                      isOverall
                        ? "font-bold text-stone-900"
                        : "font-semibold text-stone-800"
                    }`}
                  >
                    {t(m.label)}
                  </span>
                  <span className="ml-2 text-xs text-stone-500 hidden sm:inline">
                    · {t(m.subtitle)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${getBadgeStyle(
                      m.score,
                    )}`}
                  >
                    {t(percent)}%
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar Meter */}
              <div
                className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-stone-100"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("{0} confidence", [t(m.label)])}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getMeterColor(
                    m.score,
                  )}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-world Operational Decision Callout */}
      <div
        className={`mt-5 rounded-xl border p-4 ${
          isHighConfidence
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
            : "border-amber-200 bg-amber-50/70 text-amber-950"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isHighConfidence ? (
              <CheckCircle2 size={18} className="text-emerald-700" />
            ) : (
              <AlertTriangle size={18} className="text-amber-700" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase">
                {t(isHighConfidence ? "Auto-Route / Ready" : "Review Required")}
              </span>
              <span className="text-xs text-stone-500">
                {t("(System threshold: ")}
                {t(Math.round(threshold * 100))}%)
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">
              {isHighConfidence ? (
                <>
                  <strong className="font-semibold text-emerald-900">
                    {t("High Confidence (")}
                    {t(overallPercent)}%):
                  </strong>
                  {t(" ")}
                  {t(
                    "All inference criteria satisfy municipal standards. The recommendation is trusted for 1-click officer dispatch.",
                  )}
                </>
              ) : (
                <>
                  <strong className="font-semibold text-amber-900">
                    {t("Needs Officer Verification (")}
                    {t(overallPercent)}%):
                  </strong>
                  {t(" ")}
                  {t("Confidence is below the ")}
                  {t(Math.round(threshold * 100))}
                  {t(
                    "% threshold. Officer must manually verify dialect intent and routing before dispatch.",
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
