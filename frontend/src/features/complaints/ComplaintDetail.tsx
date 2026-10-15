import { useLanguage } from "../localization";
import { CheckCircle2, Clock3, Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "../../shared/ui/button";
import { audioUrl } from "./api";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { DecisionTree } from "./DecisionTree";
import { EvidenceHighlight } from "./EvidenceHighlight";
import { ExplainabilityPanel } from "./ExplainabilityPanel";
import { OfficerSummaryCard } from "./OfficerSummaryCard";
import { SelfVerificationCard } from "./SelfVerificationCard";
import { SmartFollowUpCard } from "./SmartFollowUpCard";
import { CompletenessCard } from "./CompletenessCard";
import { EmotionalUrgencyCard } from "./EmotionalUrgencyCard";
import { CommunityDialectCard } from "./CommunityDialectCard";
import { RoutingRiskCard } from "./RoutingRiskCard";
import { DepartmentExplanationCard } from "./DepartmentExplanationCard";
import { ResolutionPredictorCard } from "./ResolutionPredictorCard";
import { FasterResolutionCard } from "./FasterResolutionCard";
import { HallucinationGuardrailCard } from "./HallucinationGuardrailCard";
import { LinkedIssues } from "./LinkedIssues";
import { formalComplaint } from "./formalComplaint";
import { statusLabels, type Complaint } from "./types";

export function ComplaintDetail({
  complaint,
  showOriginal = false,
  onSelectAction,
  onComplaintUpdated,
  onTrack,
}: {
  complaint: Complaint;
  onTrack?: (id: string) => void;
  showOriginal?: boolean;
  onSelectAction?: (actionText: string) => void;
  onComplaintUpdated?: (updated: Complaint) => void;
}) {
  const { t, language } = useLanguage();

  const { analysis } = complaint;
  const approved = !!complaint.assigned_department;
  const secondary = approved
    ? complaint.assigned_secondary_departments || []
    : analysis?.secondary_departments || [];
  const awaitingOfficer = [
    "received",
    "awaiting_review",
    "analysis_failed",
  ].includes(complaint.status);
  const [copyMessage, setCopyMessage] = useState("");
  const [formalCopyMessage, setFormalCopyMessage] = useState("");
  async function copyFormalComplaint() {
    const text = formalComplaint(complaint);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setFormalCopyMessage("Formal complaint copied.");
    } catch {
      setFormalCopyMessage(
        "Copy is unavailable. Select and copy the formal complaint below.",
      );
    }
  }
  async function copyId() {
    try {
      await navigator.clipboard.writeText(complaint.tracking_id);
      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Select and copy the ID above.");
    }
  }
  if (complaint.children?.length) {
    return <LinkedIssues complaint={complaint} onTrack={onTrack} />;
  }
  return (
    <section className="detail space-y-6" aria-label={t("Complaint details")}>
      {complaint.parent_tracking_id && (
        <div className="text-sm text-stone-700">
          <p className="break-all">
            {t("Parent complaint")}: {complaint.parent_tracking_id}
          </p>
          {onTrack && (
            <Button
              className="mt-2"
              variant="outline"
              size="sm"
              onClick={() => onTrack(complaint.parent_tracking_id!)}
            >
              {t("View all linked issues")}
            </Button>
          )}
          {complaint.issue && (
            <p className="mt-2">
              {t(
                complaint.issue.basis === "implicit"
                  ? "Implicit issue"
                  : "Explicit issue",
              )}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t("Your tracking ID")}</p>
          <p className="tracking-id mt-2 font-mono text-sm font-semibold text-emerald-900">
            {complaint.tracking_id}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copyId}>
          <Copy size={14} />
          {t("Copy ID")}
        </Button>
      </div>
      {copyMessage && (
        <p role="status" className="text-sm text-stone-600">
          {t(copyMessage)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <span className="pill">
          <Clock3 size={13} />
          {t(statusLabels[complaint.status])}
        </span>
        {analysis && (
          <span className={`pill urgency-${analysis.urgency.toLowerCase()}`}>
            {t(analysis.urgency)}
            {t(" priority")}
          </span>
        )}
        {complaint.requires_review && (
          <span className="pill bg-amber-50 text-amber-800">
            {t("Officer review required")}
          </span>
        )}
      </div>
      {complaint.analysis_error && awaitingOfficer && (
        <div className="notice" role="status">
          {t(complaint.analysis_error)}
        </div>
      )}
      {complaint.status === "received" && (
        <div className="notice">
          {t(
            "Your complaint is saved and analysis is underway. Refresh tracking shortly.",
          )}
        </div>
      )}
      {complaint.review_reason && complaint.requires_review && (
        <div className="notice">{t(complaint.review_reason)}</div>
      )}
      <section
        aria-label={t("Department routing")}
        className="rounded-2xl border border-stone-200 p-5"
      >
        <h3 className="font-semibold">{t("Department routing")}</h3>
        <p className="mt-1 text-xs text-stone-500">
          {t(
            approved
              ? "Officer-approved assignments"
              : "Recommendations awaiting officer approval",
          )}
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">
              {t("Primary department (")}
              {t(approved ? "assigned" : "recommended")})
            </dt>
            <dd className="mt-1 font-semibold text-emerald-900">
              {t(
                complaint.assigned_department ||
                  analysis?.primary_department ||
                  "Manual classification needed",
              )}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">
              {t("Secondary departments (")}
              {t(approved ? "assigned" : "recommended")})
            </dt>
            <dd className="mt-1 font-semibold">
              {t(
                secondary.map((value) => t(value)).join(", ") ||
                  (approved
                    ? "None assigned"
                    : analysis
                      ? "None recommended"
                      : "Awaiting manual classification"),
              )}
            </dd>
          </div>
        </dl>
      </section>
      {analysis?.department_explanation && (
        <DepartmentExplanationCard complaint={complaint} />
      )}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
        <p className="eyebrow text-emerald-800">
          {t("Formal complaint for staff")}
        </p>
        <p
          lang={analysis ? "en" : undefined}
          className="mt-3 text-lg leading-relaxed text-stone-800"
        >
          {analysis?.normalized_complaint ||
            (awaitingOfficer
              ? "An officer will review your original complaint."
              : "Your original complaint was reviewed by an officer.")}
        </p>
        {analysis && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-emerald-800">
            <span>{t(analysis.language)}</span>
            {analysis.dialect && (
              <>
                <span>·</span>
                <span>{t(analysis.dialect)}</span>
              </>
            )}
          </div>
        )}
        {analysis && (
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            onClick={copyFormalComplaint}
          >
            <Copy size={14} />
            {t(" Copy formal complaint")}
          </Button>
        )}
        {formalCopyMessage && (
          <p role="status" className="mt-2 text-sm text-stone-600">
            {t(formalCopyMessage)}
          </p>
        )}
      </div>
      {analysis?.smart_follow_up && (
        <SmartFollowUpCard
          complaint={complaint}
          onComplaintUpdated={onComplaintUpdated}
        />
      )}
      {analysis?.completeness && (
        <CompletenessCard
          complaint={complaint}
          onComplaintUpdated={onComplaintUpdated}
        />
      )}
      {analysis?.resolution_predictor && (
        <ResolutionPredictorCard complaint={complaint} />
      )}
      {analysis?.faster_resolution && (
        <FasterResolutionCard complaint={complaint} />
      )}
      {analysis?.emotional_urgency && (
        <EmotionalUrgencyCard complaint={complaint} />
      )}
      {analysis?.routing_risk && <RoutingRiskCard complaint={complaint} />}
      {analysis?.learned_dialect && (
        <CommunityDialectCard complaint={complaint} />
      )}
      {analysis && (
        <OfficerSummaryCard
          complaint={complaint}
          onSelectAction={onSelectAction}
        />
      )}
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-stone-500">{t("Routing approval")}</dt>
          <dd className="mt-1 font-semibold">
            {t(approved ? "Approved by officer" : "Awaiting officer approval")}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">{t("AI primary recommendation")}</dt>
          <dd className="mt-1 font-semibold">
            {t(analysis?.primary_department || "Manual classification")}
          </dd>
        </div>
        {analysis && (
          <>
            <div>
              <dt className="text-stone-500">{t("Category / intent")}</dt>
              <dd className="mt-1 font-semibold">
                {t(analysis.category)} · {analysis.intent}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">{t("Model confidence")}</dt>
              <dd className="mt-1 font-semibold">
                {t(Math.round(analysis.confidence * 100))}%{t(" ")}
                <span className="font-normal text-stone-400">
                  {t("estimate")}
                </span>
              </dd>
            </div>
          </>
        )}
      </dl>
      {analysis && (
        <div className="border-t border-stone-100 pt-5">
          <EvidenceHighlight complaint={complaint} />
        </div>
      )}
      {analysis && (
        <div className="border-t border-stone-100 pt-5">
          <SelfVerificationCard complaint={complaint} />
        </div>
      )}
      {analysis?.hallucination_guardrail && (
        <div className="border-t border-stone-100 pt-5">
          <HallucinationGuardrailCard complaint={complaint} />
        </div>
      )}
      {analysis && (
        <div className="border-t border-stone-100 pt-5">
          <ConfidenceMeter complaint={complaint} />
        </div>
      )}
      {analysis && (
        <div className="border-t border-stone-100 pt-5">
          <DecisionTree complaint={complaint} />
        </div>
      )}
      {analysis && (
        <div className="border-t border-stone-100 pt-5">
          <ExplainabilityPanel complaint={complaint} defaultOpen={true} />
          {analysis.secondary_departments.length > 0 && (
            <p className="mt-3 text-xs text-stone-500">
              {t("Supporting collaborating departments:")}
              {t(" ")}
              <span className="font-semibold text-stone-700">
                {t(
                  analysis.secondary_departments
                    .map((value) => t(value))
                    .join(", "),
                )}
              </span>
            </p>
          )}
        </div>
      )}
      {showOriginal && (
        <div className="border-t border-stone-100 pt-5">
          <h3 className="font-semibold">{t("Original evidence")}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
            {complaint.original_text ||
              analysis?.transcript ||
              "Transcript unavailable; listen to the original audio."}
          </p>
          {complaint.input_type === "voice" && (
            <audio
              aria-label={t("Original complaint recording")}
              controls
              preload="none"
              className="mt-4 w-full"
              src={audioUrl(complaint.tracking_id)}
            />
          )}
        </div>
      )}
      <div className="border-t border-stone-100 pt-5">
        <h3 className="font-semibold">{t("Complaint timeline")}</h3>
        <ol className="mt-4 space-y-4">
          {complaint.events.map((event, i) => (
            <li className="flex gap-3" key={`${event.timestamp}-${i}`}>
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
              <div>
                <p className="text-sm font-medium">
                  {t(statusLabels[event.status])}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {t(new Date(event.timestamp).toLocaleString(language))}
                </p>
                <p className="mt-1 text-sm text-stone-600">{t(event.note)}</p>
                {event.department && (
                  <p className="text-xs text-emerald-700">
                    {t("Primary: ")}
                    {t(event.department)}
                  </p>
                )}
                {event.secondary_departments?.length > 0 && (
                  <p className="text-xs text-emerald-700">
                    {t("Secondary: ")}
                    {t(
                      event.secondary_departments
                        .map((value) => t(value))
                        .join(", "),
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
