import {
  AlertOctagon,
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { Complaint } from "./types";

export interface RoutingRiskCardProps {
  complaint: Complaint;
}

export function RoutingRiskCard({ complaint }: RoutingRiskCardProps) {
  const risk = complaint.analysis?.routing_risk;
  if (!risk) return null;

  const isHighRisk = risk.level === "High" || risk.level === "Critical";
  const scorePercent = Math.round(risk.score * 100);

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isHighRisk
          ? "border-amber-300 bg-amber-50/60 shadow-xs"
          : "border-emerald-200 bg-emerald-50/40 shadow-xs"
      }`}
      aria-label="Routing Risk Assessment"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              isHighRisk
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isHighRisk ? (
              <AlertOctagon size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-stone-500">
              USP 6 · Misrouting Prevention
            </p>
            <h3 className="font-semibold text-stone-900">
              Routing Risk Score: {risk.level} ({scorePercent}%)
            </h3>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isHighRisk
              ? "bg-amber-200 text-amber-950"
              : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {risk.recommendation}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-700">
        <strong className="font-medium text-stone-900">
          Protocol Guidance:{" "}
        </strong>
        {risk.mitigation_notes}
      </p>

      {risk.risk_factors && risk.risk_factors.length > 0 && (
        <div className="mt-3.5 border-t border-stone-200/60 pt-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-stone-500">
            Assessed Risk Factors:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {risk.risk_factors.map((factor, idx) => (
              <span
                key={`${factor}-${idx}`}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs"
              >
                <Info size={12} className="text-stone-400" />
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
