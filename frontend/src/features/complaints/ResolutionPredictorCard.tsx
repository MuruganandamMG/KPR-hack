import { useLanguage } from "../localization";
import { AlertTriangle, Clock, FastForward, Timer, Zap } from "lucide-react";
import type { Complaint } from "./types";

export interface ResolutionPredictorCardProps {
  complaint: Complaint;
}

export function ResolutionPredictorCard({
  complaint,
}: ResolutionPredictorCardProps) {
  const { t } = useLanguage();

  const predictor = complaint.analysis?.resolution_predictor;
  if (!predictor) return null;

  return (
    <div
      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs"
      aria-label={t("Resolution Time Predictor")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Timer size={18} />
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-emerald-800">
              {t("USP 8 · Resolution SLA Predictor")}
            </p>
            <h3 className="font-semibold text-stone-900">
              {t("Estimated Resolution: ")}
              {t(predictor.estimated_timeline_label)}
            </h3>
          </div>
        </div>

        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <Clock size={13} />
          {t(predictor.sla_category)}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-900">
          <Zap size={14} className="text-emerald-600" />
          {t(predictor.completeness_time_saved)}
        </span>
        <span className="text-2xs text-stone-500">
          {t("Expected SLA Target: <")}
          {t(predictor.estimated_hours_max)}
          {t("h")}
        </span>
      </div>

      {predictor.bottleneck_warning && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span>{t(predictor.bottleneck_warning)}</span>
        </div>
      )}
    </div>
  );
}
