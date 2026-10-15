import { useLanguage } from "../localization";
import { Button } from "../../shared/ui/button";
import { audioUrl } from "./api";
import { statusLabels, type Complaint } from "./types";

export function LinkedIssues({
  complaint,
  onTrack,
}: {
  complaint: Complaint;
  onTrack?: (id: string) => void;
}) {
  const { t, language } = useLanguage();
  const children = complaint.children || [];
  const resolved = children.filter(
    (child) => child.status === "resolved",
  ).length;
  return (
    <section className="space-y-6" aria-label={t("Linked grievances")}>
      <header className="space-y-3">
        <p className="eyebrow">{t("Your tracking ID")}</p>
        <p className="break-all font-mono text-sm font-semibold text-emerald-900">
          {complaint.tracking_id}
        </p>
        <h3 className="text-xl font-semibold text-stone-900">
          {t("One submission, linked grievances")}
        </h3>
        <p className="max-w-prose text-sm text-stone-700">
          {t(
            "Each issue has its own ticket and progress. Routing requires officer approval.",
          )}
        </p>
        <p className="font-semibold text-emerald-900">
          {t("{0} / {1} issues resolved", [resolved, children.length])}
        </p>
        <progress
          className="h-2 w-full accent-emerald-700"
          aria-label={t("Resolution progress")}
          value={resolved}
          max={children.length}
        />
      </header>
      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {children.map((child, index) => {
          const issue = child.issue;
          if (!issue) return null;
          const urgency = child.analysis?.urgency || issue.urgency;
          const related = children.filter(
            (other) =>
              other.issue &&
              issue.related_issue_ids.includes(other.issue.issue_id),
          );
          return (
            <article
              key={child.tracking_id}
              aria-label={issue.normalized_complaint}
              className="py-6"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-stone-600">
                  {t("Issue {0}", [index + 1])}
                </span>
                <span className="pill">{t(statusLabels[child.status])}</span>
                <span className={`pill urgency-${urgency.toLowerCase()}`}>
                  {t(urgency)}
                  {t(" priority")}
                </span>
                <span className="text-stone-700">
                  {t(
                    issue.basis === "implicit"
                      ? "Implicit issue"
                      : "Explicit issue",
                  )}
                </span>
              </div>
              <h4
                lang="en"
                className="mt-3 text-lg font-semibold text-stone-900"
              >
                {issue.normalized_complaint}
              </h4>
              <p className="mt-2 break-all font-mono text-xs text-stone-600">
                {child.tracking_id}
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-stone-600">{t("Department routing")}</dt>
                  <dd className="mt-1 font-semibold text-emerald-900">
                    {t(
                      child.assigned_department ||
                        child.analysis?.primary_department ||
                        issue.department,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-600">{t("Category / intent")}</dt>
                  <dd className="mt-1 font-medium">{t(issue.category)}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">{t("Model confidence")}</dt>
                  <dd className="mt-1 font-medium">
                    {Math.round(issue.confidence * 100)}% {t("estimate")}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-stone-600">
                {t(
                  child.assigned_department
                    ? "Officer-approved assignments"
                    : "Recommendations awaiting officer approval",
                )}
              </p>
              <p
                lang="en"
                className="mt-3 max-w-prose text-sm leading-relaxed text-stone-700"
              >
                {issue.explanation}
              </p>
              {child.requires_review && (
                <p className="notice mt-3 text-sm">
                  {t("Officer review required")} {child.review_reason}
                </p>
              )}
              <details className="mt-4 text-sm text-stone-700">
                <summary className="min-h-9 cursor-pointer py-2 font-medium">
                  {t("Evidence & relationships")}
                </summary>
                <ul className="mt-2 list-inside list-disc space-y-2 break-words">
                  {issue.evidence.map((phrase) => (
                    <li key={phrase}>
                      <q>{phrase}</q>
                    </li>
                  ))}
                </ul>
                {issue.relationship_explanation && (
                  <p lang="en" className="mt-3 max-w-prose leading-relaxed">
                    {issue.relationship_explanation}
                  </p>
                )}
                {related.map((other) => (
                  <p
                    className="mt-2 break-all font-mono text-xs"
                    key={other.tracking_id}
                  >
                    {t("Related issue: {0}", [other.tracking_id])}
                  </p>
                ))}
              </details>
              {onTrack && (
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => onTrack(child.tracking_id)}
                >
                  {t("Track complaint")}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      <details className="text-sm text-stone-700">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">
          {t("Original evidence")}
        </summary>
        <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">
          {complaint.original_text || complaint.analysis?.transcript}
        </p>
        {complaint.input_type === "voice" && (
          <audio
            controls
            preload="none"
            aria-label={t("Original complaint recording")}
            className="mt-3 w-full"
            src={audioUrl(complaint.tracking_id)}
          />
        )}
      </details>
      <details className="text-sm text-stone-700">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">
          {t("Complaint timeline")}
        </summary>
        <ol className="mt-2 space-y-3">
          {complaint.events.map((event, index) => (
            <li key={index} className="break-words">
              <p className="font-medium">{t(statusLabels[event.status])}</p>
              <p className="mt-1 text-xs">
                {new Date(event.timestamp).toLocaleString(language)}
              </p>
              <p className="mt-1">{event.note}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
