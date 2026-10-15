import { useLanguage } from "../localization";
import {
  Check,
  CheckCircle2,
  Eye,
  Lock,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { Complaint } from "./types";

export interface HallucinationGuardrailCardProps {
  complaint: Complaint;
}

export function HallucinationGuardrailCard({
  complaint,
}: HallucinationGuardrailCardProps) {
  const { t } = useLanguage();

  const guard = complaint.analysis?.hallucination_guardrail;
  if (!guard) return null;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        guard.is_safe_to_route
          ? "border-emerald-200 bg-emerald-50/30 shadow-xs"
          : "border-rose-300 bg-rose-50/60 shadow-xs"
      }`}
      aria-label={t("Hallucination Prevention Guardrail")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              guard.is_safe_to_route
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {guard.is_safe_to_route ? (
              <ShieldCheck size={18} />
            ) : (
              <Lock size={18} />
            )}
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-stone-500">
              {t("USP 10 · AI Knows When It Doesn't Know")}
            </p>
            <h3 className="font-semibold text-stone-900">
              {t("Certainty Guardrail: ")}
              {t(guard.certainty_level)}
            </h3>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            guard.is_safe_to_route
              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
              : "bg-rose-600 text-white shadow-xs"
          }`}
        >
          {t(
            guard.is_safe_to_route
              ? "Auto-Dispatch Safe"
              : "Safety Lock Active · Officer Review Mandated",
          )}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-700">
        <strong className="font-medium text-stone-900">
          {t("Safety Assessment:")}
          {t(" ")}
        </strong>
        {guard.safeguard_reason}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Known Facts */}
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <CheckCircle2 size={12} />
            {t("Verified Known Facts:")}
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-stone-700">
            {guard.known_facts.map((fact, idx) => (
              <li key={`${fact}-${idx}`} className="flex items-start gap-1.5">
                <span className="text-emerald-600 shrink-0 font-bold">✔</span>
                <span>{t(fact)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ambiguous Elements */}
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <XCircle size={12} />
            {t("Ambiguous / Unverified Factors:")}
          </p>
          {guard.ambiguous_elements.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-xs text-stone-700">
              {guard.ambiguous_elements.map((amb, idx) => (
                <li key={`${amb}-${idx}`} className="flex items-start gap-1.5">
                  <span className="text-rose-500 shrink-0 font-bold">⚠</span>
                  <span>{t(amb)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-stone-500 italic">
              {t("No unresolved ambiguities detected. Clean classification.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
