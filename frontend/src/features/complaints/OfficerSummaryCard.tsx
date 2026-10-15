import { useLanguage } from "../localization";
import {
  AlertCircle,
  Building2,
  Check,
  ClipboardList,
  Clock,
  MapPin,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import type { Complaint, OfficerSummary } from "./types";

export function OfficerSummaryCard({
  complaint,
  onSelectAction,
}: {
  complaint: Complaint;
  onSelectAction?: (actionText: string) => void;
}) {
  const { t } = useLanguage();

  const { analysis } = complaint;

  if (!analysis) {
    return null;
  }

  const summary: OfficerSummary = analysis.officer_summary || {
    problem: analysis.intent || t("{0} issue reported", [t(analysis.category)]),
    area: "Ward / Locality Unspecified",
    duration: analysis.keywords.find(
      (k) =>
        k.toLowerCase().includes("naala") ||
        k.toLowerCase().includes("day") ||
        k.toLowerCase().includes("week"),
    )
      ? "Multiple Days"
      : "Ongoing / Active Issue",
    priority: analysis.urgency,
    department: analysis.primary_department,
    suggested_action: t(
      "Inspect and rectify {0} fault under {1} jurisdiction.",
      [t(analysis.category.toLowerCase()), t(analysis.primary_department)],
    ),
  };

  const priorityStyles: Record<string, string> = {
    Low: "bg-slate-100 text-slate-800 border-slate-300",
    Medium: "bg-blue-100 text-blue-900 border-blue-300",
    High: "bg-orange-100 text-orange-950 border-orange-300",
    Critical: "bg-red-100 text-red-950 border-red-300",
  };

  return (
    <section
      className="officer-summary-card rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/70 via-white to-stone-50 p-4 sm:p-5 shadow-xs"
      aria-label={t("Officer Executive Summary")}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-xs">
            <ClipboardList size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-900">
                {t("Officer 10-Second Executive Summary")}
              </h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                {t("Instant Triage USP")}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {t("Skip reading 200 words · Actionable 6-point briefing")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Problem */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <AlertCircle size={14} className="text-amber-600" />
            <span>{t("Problem")}</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-stone-900 leading-snug">
            {t(summary.problem)}
          </p>
        </div>

        {/* 2. Area */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <MapPin size={14} className="text-emerald-700" />
            <span>{t("Area / Location")}</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-stone-900 leading-snug">
            {t(summary.area)}
          </p>
        </div>

        {/* 3. Duration */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Clock size={14} className="text-blue-600" />
            <span>{t("Duration")}</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-stone-900 leading-snug">
            {t(summary.duration)}
          </p>
        </div>

        {/* 4. Priority */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Zap size={14} className="text-purple-600" />
            <span>{t("Priority")}</span>
          </div>
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-bold ${
                priorityStyles[summary.priority] ||
                "bg-stone-100 text-stone-800"
              }`}
            >
              {t(summary.priority)}
              {t(" Priority")}
            </span>
          </div>
        </div>

        {/* 5. Department */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Building2 size={14} className="text-indigo-600" />
            <span>{t("Department")}</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-stone-900 leading-snug">
            {t(summary.department)}
          </p>
        </div>

        {/* 6. Suggested Action (spans full row or flex) */}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
              <Sparkles size={14} className="text-emerald-700" />
              <span>{t("Suggested Action")}</span>
            </div>
            {onSelectAction && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs border-emerald-300 bg-white hover:bg-emerald-100 hover:text-emerald-950 font-semibold"
                onClick={() => onSelectAction(summary.suggested_action)}
              >
                <Check size={13} className="text-emerald-700" />
                {t("Use as Decision Note")}
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-emerald-950 leading-relaxed">
            {t("“")}
            {summary.suggested_action}
            {t("”")}
          </p>
        </div>
      </div>
    </section>
  );
}
