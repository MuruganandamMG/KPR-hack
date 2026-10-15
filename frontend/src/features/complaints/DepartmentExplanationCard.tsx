import { useLanguage } from "../localization";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Scale,
  XCircle,
} from "lucide-react";
import type { Complaint } from "./types";

export interface DepartmentExplanationCardProps {
  complaint: Complaint;
}

export function DepartmentExplanationCard({
  complaint,
}: DepartmentExplanationCardProps) {
  const { t } = useLanguage();

  const deptExp = complaint.analysis?.department_explanation;
  if (!deptExp) return null;

  return (
    <div
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
      aria-label={t("Differential Department Explanation")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Building2 size={18} />
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-stone-500">
              {t("USP 7 · Transparent Department Explanation")}
            </p>
            <h3 className="font-semibold text-stone-900">
              {t("Differential Routing Diagnosis: ")}
              {t(deptExp.selected_department)}
            </h3>
          </div>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
          {t("Official Jurisdiction Assigned")}
        </span>
      </div>

      <div className="mt-3.5 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
        <p className="flex items-start gap-2 text-xs text-blue-950 font-medium leading-relaxed">
          <CheckCircle2 size={15} className="text-blue-700 shrink-0 mt-0.5" />
          <span>
            <strong>{t("Primary Remit: ")}</strong>
            {t(deptExp.why_selected)}
          </span>
        </p>
      </div>

      {deptExp.excluded_departments &&
        deptExp.excluded_departments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-stone-500">
              {t("Excluded Adjacent Departments & Rationale:")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {deptExp.excluded_departments.map((ex) => (
                <div
                  key={ex.department}
                  className="flex items-start gap-2 rounded-xl border border-stone-200/80 bg-stone-50/60 p-2.5 text-xs"
                >
                  <XCircle
                    size={14}
                    className="text-stone-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-stone-800">
                      {t(ex.department)}
                    </span>
                    <p className="mt-0.5 text-2xs text-stone-600 leading-normal">
                      {ex.exclusion_reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {deptExp.jurisdiction_basis && (
        <div className="mt-3.5 flex items-center gap-2 border-t border-stone-100 pt-3 text-2xs text-stone-500">
          <Scale size={13} className="text-stone-400 shrink-0" />
          <span>
            <strong>{t("Statutory Reference: ")}</strong>
            {deptExp.jurisdiction_basis}
          </span>
        </div>
      )}
    </div>
  );
}
