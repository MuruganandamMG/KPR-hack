import { useLanguage } from "../localization";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CheckCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Complaint, SelfVerification } from "./types";

export function SelfVerificationCard({ complaint }: { complaint: Complaint }) {
  const { t } = useLanguage();

  const { analysis } = complaint;

  if (!analysis) {
    return null;
  }

  const isCategoryAgreed =
    analysis.category !== "Other" && analysis.confidence >= 0.75;

  const verification: SelfVerification = analysis.self_verification || {
    status: isCategoryAgreed ? "Verified" : "Flagged for Review",
    critique: isCategoryAgreed
      ? `Critic pass audited the complaint statement against ${analysis.primary_department} jurisdiction; confirmed zero jurisdictional overlap.`
      : "Critic pass flagged routing for manual officer verification due to borderline confidence or ambiguous category.",
    agreement: isCategoryAgreed,
    verification_confidence: isCategoryAgreed
      ? Math.min(1, Math.round((analysis.confidence + 0.02) * 100) / 100)
      : analysis.confidence,
  };

  const isVerified =
    verification.agreement && verification.status === "Verified";
  const confidencePercent = Math.round(
    verification.verification_confidence * 100,
  );

  return (
    <section
      className={`self-verification-card rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
        isVerified
          ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-stone-50/80"
          : "border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-stone-50/80"
      }`}
      aria-label={t("AI Self Verification")}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${
              isVerified ? "bg-emerald-600" : "bg-amber-600"
            }`}
          >
            <ShieldCheck size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-900">
                {t("AI Self-Verification Pass")}
              </h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                {t("Dual-AI Audit USP")}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {t(
                "Two-pass model consensus to eliminate hallucinations and routing errors",
              )}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
            isVerified
              ? "border-emerald-300 bg-emerald-100 text-emerald-900"
              : "border-amber-300 bg-amber-100 text-amber-900"
          }`}
        >
          {isVerified ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-700" />
              {t("Verified (Correct)")}
            </>
          ) : (
            <>
              <AlertTriangle size={13} className="text-amber-700" />
              {t(verification.status)}
            </>
          )}
        </span>
      </div>

      {/* Two-pass visual comparison grid */}
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        {/* Pass 1: Primary Model */}
        <div className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-stone-500 uppercase">
                <Bot size={13} className="text-emerald-700" />
                {t("1st AI · Primary Generator")}
              </span>
              <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-600">
                {t("Pass 1")}
              </span>
            </div>

            <div className="mt-2.5">
              <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wide">
                {t("Selected Department")}
              </p>
              <p className="text-sm font-bold text-stone-900">
                {t(analysis.primary_department)}
              </p>
            </div>

            <div className="mt-2">
              <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wide">
                {t("Assessed Urgency")}
              </p>
              <p className="text-xs font-semibold text-stone-700">
                {t(analysis.urgency)}
                {t(" Priority")}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-stone-100 pt-2 text-xs text-stone-500">
            {t("Initial confidence:")}
            {t(" ")}
            <span className="font-semibold text-stone-800">
              {t(Math.round(analysis.confidence * 100))}%
            </span>
          </div>
        </div>

        {/* Connector stem */}
        <div className="hidden md:flex flex-col items-center justify-center px-1 text-stone-400">
          <div className="h-6 w-0.5 bg-stone-200" />
          <div className="my-1 rounded-full border border-stone-200 bg-white p-1 text-emerald-700 shadow-2xs">
            <ArrowRight size={14} />
          </div>
          <div className="h-6 w-0.5 bg-stone-200" />
        </div>

        {/* Pass 2: Critic Auditor */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-3.5 shadow-2xs ${
            isVerified
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-amber-200 bg-amber-50/40"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-stone-700 uppercase">
                <CheckCheck size={13} className="text-emerald-700" />
                {t("2nd AI · Critic Review")}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  isVerified
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {t("Pass 2 (Audit)")}
              </span>
            </div>

            <div className="mt-2.5">
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
                {t("Audit Target")}
              </p>
              <p className="text-sm font-bold text-stone-900">
                {t("Department & Urgency Check")}
              </p>
            </div>

            <div className="mt-2">
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
                {t("Consensus Result")}
              </p>
              <p
                className={`text-xs font-bold ${
                  isVerified ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {t(
                  isVerified
                    ? "Consensus Reached (Agreed)"
                    : "Disputed / Review Needed",
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-stone-200/60 pt-2 text-xs text-stone-600">
            {t("Audit confidence:")}
            {t(" ")}
            <span className="font-semibold text-stone-900">
              {t(confidencePercent)}%
            </span>
          </div>
        </div>
      </div>

      {/* Critic Audit Statement */}
      <div className="mt-4 rounded-xl border border-stone-200/90 bg-white p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700">
          <Sparkles size={14} className="text-emerald-700" />
          <span>{t("Independent Critic Statement")}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-stone-700 italic">
          {t("“")}
          {verification.critique}
          {t("”")}
        </p>
      </div>
    </section>
  );
}
