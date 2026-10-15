import { useLanguage } from "../localization";
import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Flag,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { validateComplaint } from "./api";
import type { Complaint } from "./types";

export interface CitizenValidationCardProps {
  complaint: Complaint;
  onComplaintUpdated?: (updated: Complaint) => void;
}

export function CitizenValidationCard({
  complaint,
  onComplaintUpdated,
}: CitizenValidationCardProps) {
  const { t } = useLanguage();

  const validation = complaint.analysis?.citizen_validation;
  if (!validation) return null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(isConfirmed: boolean) {
    setBusy(true);
    setError(null);
    try {
      const updated = await validateComplaint(
        complaint.tracking_id,
        isConfirmed,
      );
      onComplaintUpdated?.(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit validation status.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        validation.is_confirmed
          ? "border-emerald-200 bg-emerald-50/50 shadow-xs"
          : "border-sky-200 bg-sky-50/40 shadow-xs"
      }`}
      aria-label={t("Citizen validation layer")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              validation.is_confirmed
                ? "bg-emerald-100 text-emerald-700"
                : "bg-sky-100 text-sky-700"
            }`}
          >
            {validation.is_confirmed ? (
              <CheckCircle2 size={18} />
            ) : (
              <UserCheck size={18} />
            )}
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-stone-500">
              {t("USP 5 · Citizen Validation Layer")}
            </p>
            <h3 className="font-semibold text-stone-900">
              {t("Citizen Pre-Flight Validation")}
            </h3>
          </div>
        </div>

        {validation.is_confirmed ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-xs">
            <Check size={14} />
            {t("Confirmed by Citizen")}
          </span>
        ) : (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            {t("Awaiting Citizen Confirmation")}
          </span>
        )}
      </div>

      <div className="mt-3.5 rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
        <p className="text-2xs font-semibold uppercase tracking-wider text-stone-400">
          {t("What the AI understood:")}
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-stone-800">
          “{validation.summary_statement}”
        </p>
      </div>

      {!validation.is_confirmed ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-stone-600">
            {t(
              "Did we capture your grievance correctly before final dispatch?",
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => handleConfirm(false)}
              className="text-xs h-8 text-stone-600 border-stone-300 hover:bg-stone-100"
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <Flag size={13} className="mr-1 text-amber-600" />
                  {t("Flag Correction")}
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => handleConfirm(true)}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <Check size={14} />
                  {t("Yes, Exactly Correct")}
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs text-emerald-800">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            {t(
              "Citizen confirmed the grievance summary. Ready for municipal field team.",
            )}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => handleConfirm(false)}
            className="text-2xs text-stone-500 hover:text-stone-700 h-6 px-2"
          >
            {t("Change response")}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{t(error)}</p>}
    </div>
  );
}
