import { useLanguage } from "../localization";
import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileCheck,
  HelpCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { completeComplaintDetails } from "./api";
import type { Complaint } from "./types";

export interface CompletenessCardProps {
  complaint: Complaint;
  onComplaintUpdated?: (updated: Complaint) => void;
}

export function CompletenessCard({
  complaint,
  onComplaintUpdated,
}: CompletenessCardProps) {
  const { t } = useLanguage();

  const completeness = complaint.analysis?.completeness;
  if (!completeness) return null;

  const [activeField, setActiveField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingItems = completeness.missing_fields || [];
  const isComplete = completeness.score >= 100 || missingItems.length === 0;

  async function handleSave(fieldName: string) {
    if (!fieldValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await completeComplaintDetails(
        complaint.tracking_id,
        fieldName,
        fieldValue.trim(),
      );
      onComplaintUpdated?.(updated);
      setActiveField(null);
      setFieldValue("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update complaint details.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
      aria-label={t("Complaint completeness and missing details")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              isComplete
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isComplete ? <FileCheck size={18} /> : <CircleAlert size={18} />}
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-stone-500">
              {t("USP 3 · Missing Information Detection")}
            </p>
            <h3 className="font-semibold text-stone-900">
              {t("Complaint Completeness: ")}
              {t(completeness.score)}%
            </h3>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isComplete
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {t(
            isComplete
              ? "Action-Ready"
              : t("{0} detail(s) missing", [t(missingItems.length)]),
          )}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full transition-all duration-500 ${
            completeness.score >= 80
              ? "bg-emerald-600"
              : completeness.score >= 50
                ? "bg-amber-500"
                : "bg-rose-500"
          }`}
          style={{
            width: `${Math.min(100, Math.max(10, completeness.score))}%`,
          }}
        />
      </div>

      {/* Missing items list */}
      {!isComplete && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            {t(
              "Fill missing details to accelerate on-ground municipal action:",
            )}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {missingItems.map((item) => (
              <div
                key={item.field_name}
                className="flex flex-col justify-between rounded-xl border border-stone-200 bg-stone-50/70 p-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                    <HelpCircle size={14} className="text-amber-600" />
                    <span>{t(item.field_name)}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    {item.prompt_question}
                  </p>
                  <p className="mt-1 text-2xs italic text-stone-400">
                    {item.example_suggestion}
                  </p>
                </div>

                {activeField === item.field_name ? (
                  <div className="mt-2.5 space-y-2">
                    <input
                      type="text"
                      className="field text-xs py-1.5 px-2.5 w-full bg-white border-stone-300 rounded-lg"
                      placeholder={t("Enter {0}...", [
                        t(item.field_name.toLowerCase()),
                      ])}
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={busy || !fieldValue.trim()}
                        onClick={() => handleSave(item.field_name)}
                        className="text-xs py-1 h-7"
                      >
                        {busy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setActiveField(null);
                          setFieldValue("");
                        }}
                        className="text-xs py-1 h-7 text-stone-500"
                      >
                        {t("Cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2.5 w-full text-xs h-7 gap-1 border-stone-300 bg-white hover:bg-stone-100"
                    onClick={() => {
                      setActiveField(item.field_name);
                      setFieldValue("");
                    }}
                  >
                    <Plus size={13} />
                    {t("Add ")}
                    {t(item.field_name)}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{t(error)}</p>}

      {isComplete && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 size={15} className="text-emerald-600" />
          <span>
            {t(
              "Complaint has all high-priority fields: location, duration, and scope.",
            )}
          </span>
        </div>
      )}
    </div>
  );
}
