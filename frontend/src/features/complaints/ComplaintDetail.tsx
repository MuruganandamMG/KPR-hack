import { CheckCircle2, Clock3, Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "../../shared/ui/button";
import { audioUrl } from "./api";
import { statusLabels, type Complaint } from "./types";

export function ComplaintDetail({
  complaint,
  showOriginal = false,
}: {
  complaint: Complaint;
  showOriginal?: boolean;
}) {
  const { analysis } = complaint;
  const awaitingOfficer = [
    "received",
    "awaiting_review",
    "analysis_failed",
  ].includes(complaint.status);
  const [copyMessage, setCopyMessage] = useState("");
  async function copyId() {
    try {
      await navigator.clipboard.writeText(complaint.tracking_id);
      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Select and copy the ID above.");
    }
  }
  return (
    <section className="detail space-y-6" aria-label="Complaint details">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Your tracking ID</p>
          <p className="tracking-id mt-2 font-mono text-sm font-semibold text-emerald-900">
            {complaint.tracking_id}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copyId}>
          <Copy size={14} />
          Copy ID
        </Button>
      </div>
      {copyMessage && (
        <p role="status" className="text-sm text-stone-600">
          {copyMessage}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <span className="pill">
          <Clock3 size={13} />
          {statusLabels[complaint.status]}
        </span>
        {analysis && (
          <span className={`pill urgency-${analysis.urgency.toLowerCase()}`}>
            {analysis.urgency} priority
          </span>
        )}
        {complaint.requires_review && (
          <span className="pill bg-amber-50 text-amber-800">
            Officer review required
          </span>
        )}
      </div>
      {complaint.analysis_error && awaitingOfficer && (
        <div className="notice" role="status">
          {complaint.analysis_error}
        </div>
      )}
      {complaint.status === "received" && (
        <div className="notice">
          Your complaint is saved and analysis is underway. Refresh tracking
          shortly.
        </div>
      )}
      {complaint.review_reason && complaint.requires_review && (
        <div className="notice">{complaint.review_reason}</div>
      )}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
        <p className="eyebrow text-emerald-800">What we understood</p>
        <p className="mt-3 text-lg leading-relaxed text-stone-800">
          {analysis?.normalized_complaint ||
            (awaitingOfficer
              ? "An officer will review your original complaint."
              : "Your original complaint was reviewed by an officer.")}
        </p>
        {analysis && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-emerald-800">
            <span>{analysis.language}</span>
            {analysis.dialect && (
              <>
                <span>·</span>
                <span>{analysis.dialect}</span>
              </>
            )}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-stone-500">Assigned department</dt>
          <dd className="mt-1 font-semibold">
            {complaint.assigned_department || "Awaiting officer approval"}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">AI recommendation</dt>
          <dd className="mt-1 font-semibold">
            {analysis?.primary_department || "Manual classification"}
          </dd>
        </div>
        {analysis && (
          <>
            <div>
              <dt className="text-stone-500">Category / intent</dt>
              <dd className="mt-1 font-semibold">
                {analysis.category} · {analysis.intent}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Model confidence</dt>
              <dd className="mt-1 font-semibold">
                {Math.round(analysis.confidence * 100)}%{" "}
                <span className="font-normal text-stone-400">estimate</span>
              </dd>
            </div>
          </>
        )}
      </dl>
      {analysis && (
        <div className="border-t border-stone-100 pt-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldCheck size={17} className="text-emerald-700" />
            Why this recommendation?
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.keywords.map((word, i) => (
              <span className="keyword" key={`${word}-${i}`}>
                {word}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-stone-600">
            {analysis.detected_meaning}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {analysis.explanation}
          </p>
          {analysis.secondary_departments.length > 0 && (
            <p className="mt-3 text-sm">
              Additional departments:{" "}
              {analysis.secondary_departments.join(", ")}
            </p>
          )}
        </div>
      )}
      {showOriginal && (
        <div className="border-t border-stone-100 pt-5">
          <h3 className="font-semibold">Original evidence</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
            {complaint.original_text ||
              analysis?.transcript ||
              "Transcript unavailable; listen to the original audio."}
          </p>
          {complaint.input_type === "voice" && (
            <audio
              aria-label="Original complaint recording"
              controls
              preload="none"
              className="mt-4 w-full"
              src={audioUrl(complaint.tracking_id)}
            />
          )}
        </div>
      )}
      <div className="border-t border-stone-100 pt-5">
        <h3 className="font-semibold">Complaint timeline</h3>
        <ol className="mt-4 space-y-4">
          {complaint.events.map((event, i) => (
            <li className="flex gap-3" key={`${event.timestamp}-${i}`}>
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
              <div>
                <p className="text-sm font-medium">
                  {statusLabels[event.status]}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-stone-600">{event.note}</p>
                {event.department && (
                  <p className="text-xs text-emerald-700">{event.department}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
