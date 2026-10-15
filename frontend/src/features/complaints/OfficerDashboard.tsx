import { useLanguage } from "../localization";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { listComplaints, trackComplaint, updateComplaint } from "./api";
import { ApiError } from "../../shared/request";
import { ComplaintDetail } from "./ComplaintDetail";
import {
  categories,
  statusLabels,
  type Complaint,
  type ComplaintPage,
  type Status,
} from "./types";

export function OfficerDashboard({ departments }: { departments: string[] }) {
  const { t } = useLanguage();

  const [page, setPage] = useState<ComplaintPage | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [status, setStatus] = useState<Status | "">("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [department, setDepartment] = useState("");
  const [secondaryDepartments, setSecondaryDepartments] = useState<string[]>(
    [],
  );
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departmentRole, setDepartmentRole] = useState<
    "" | "primary" | "secondary"
  >("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPage(null);
    setError("");
    const timer = setTimeout(() => {
      listComplaints(
        {
          status,
          search,
          offset,
          department: departmentFilter,
          department_role: departmentRole,
          category,
        },
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) {
            setPage(result);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(e.message);
            setLoading(false);
          }
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    status,
    search,
    offset,
    reload,
    departmentFilter,
    departmentRole,
    category,
  ]);
  function select(record: Complaint) {
    setSelected(record);
    setDepartment(
      record.assigned_department || record.analysis?.primary_department || "",
    );
    setSecondaryDepartments(
      record.assigned_department
        ? record.assigned_secondary_departments || []
        : record.analysis?.secondary_departments || [],
    );
    setNote("");
    setDecisionError("");
  }
  async function decide(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || lock.current) return;
    lock.current = true;
    setSaving(true);
    setDecisionError("");
    const next =
      selected.status === "routed"
        ? "in_progress"
        : selected.status === "in_progress"
          ? "resolved"
          : "routed";
    try {
      const result = await updateComplaint(selected.tracking_id, {
        version: selected.version,
        status: next,
        ...(next === "routed"
          ? { department, secondary_departments: secondaryDepartments }
          : {}),
        note,
      });
      if (!alive.current) return;
      select(result);
      setReload((value) => value + 1);
    } catch (e) {
      if (!alive.current) return;
      setDecisionError(e instanceof Error ? e.message : "Update failed.");
      if (e instanceof ApiError && e.status === 409) {
        try {
          const updated = await trackComplaint(selected.tracking_id);
          if (alive.current) {
            setSelected(updated);
            setDepartment(
              updated.assigned_department ||
                updated.analysis?.primary_department ||
                department,
            );
            setSecondaryDepartments(
              updated.assigned_department
                ? updated.assigned_secondary_departments || []
                : updated.analysis?.secondary_departments || [],
            );
            setReload((value) => value + 1);
          }
        } catch {
          /* Keep the conflict explanation visible. */
        }
      }
    } finally {
      lock.current = false;
      if (alive.current) setSaving(false);
    }
  }
  const canRoute =
    !!selected &&
    ["awaiting_review", "analysis_failed"].includes(selected.status);
  const canUpdate =
    selected &&
    ["awaiting_review", "analysis_failed", "routed", "in_progress"].includes(
      selected.status,
    );
  return (
    <div>
      {!selected ? (
        <section className="panel">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="mt-2 text-xl font-semibold">
                {t("Complaint queue")}
                {t(" ")}
                <span className="ml-1 text-sm font-normal text-stone-400">
                  {t(page?.total ?? "—")}
                </span>
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label={t("Refresh queue")}
              disabled={saving}
              onClick={() => {
                setSelected(null);
                setReload((v) => v + 1);
              }}
            >
              <RefreshCw size={15} />
            </Button>
          </div>
          <label htmlFor="queue-search" className="field-label">
            {t("Search complaints")}
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-3.5 text-stone-400"
            />
            <input
              id="queue-search"
              disabled={saving}
              className="field pl-10"
              placeholder={t("Tracking ID or complaint…")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
                setSelected(null);
              }}
            />
          </div>
          <label htmlFor="queue-department" className="field-label mt-4">
            {t("Filter by department")}
          </label>
          <select
            id="queue-department"
            className="field"
            disabled={saving}
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setDepartmentRole("");
              setOffset(0);
              setSelected(null);
            }}
          >
            <option value="">{t("All departments")}</option>
            {departments.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="queue-role" className="field-label">
                {t("Department role")}
              </label>
              <select
                id="queue-role"
                className="field"
                disabled={saving || !departmentFilter}
                value={departmentRole}
                onChange={(e) => {
                  setDepartmentRole(
                    e.target.value as "" | "primary" | "secondary",
                  );
                  setOffset(0);
                  setSelected(null);
                }}
              >
                <option value="">{t("Primary or secondary")}</option>
                <option value="primary">{t("Primary")}</option>
                <option value="secondary">{t("Secondary")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="queue-category" className="field-label">
                {t("Category")}
              </label>
              <select
                id="queue-category"
                className="field"
                disabled={saving}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setOffset(0);
                  setSelected(null);
                }}
              >
                <option value="">{t("All categories")}</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {t(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="queue-status" className="field-label mt-4">
            {t("Status")}
          </label>
          <select
            id="queue-status"
            disabled={saving}
            className="field"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status | "");
              setOffset(0);
              setSelected(null);
            }}
          >
            <option value="">{t("All statuses")}</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option value={key} key={key}>
                {t(label)}
              </option>
            ))}
          </select>
          {error && (
            <p role="alert" className="mt-5 text-sm text-red-700">
              {t(error)}
            </p>
          )}
          <div className="mt-6 space-y-3">
            {error ? null : loading ? (
              <p
                role="status"
                className="flex items-center gap-2 py-8 text-sm text-stone-500"
              >
                <LoaderCircle size={16} className="animate-spin" />
                {t("Loading complaints…")}
              </p>
            ) : !page?.items.length ? (
              <div className="py-10 text-center text-stone-400">
                <Inbox size={30} className="mx-auto mb-3" />
                <p className="text-sm">{t("No complaints match this view.")}</p>
              </div>
            ) : (
              page.items.map((item) => (
                <button
                  key={item.tracking_id}
                  disabled={saving}
                  onClick={() => select(item)}
                  className="queue-item"
                >
                  <span className="tracking-id block font-mono text-xs text-stone-500">
                    {item.tracking_id}
                  </span>
                  <span className="my-2 block text-sm font-semibold">
                    {item.analysis?.normalized_complaint ||
                      item.original_text ||
                      "Voice complaint · Manual review"}
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>{t(statusLabels[item.status])}</span>
                    <span
                      className={
                        item.analysis?.urgency === "Critical"
                          ? "text-red-700"
                          : "text-emerald-700"
                      }
                    >
                      {t(item.analysis?.urgency || "Unclassified")}
                      {t(" · Primary:")}
                      {t(" ")}
                      {t(
                        item.assigned_department ||
                          item.analysis?.primary_department ||
                          "Review needed",
                      )}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs text-stone-500">
                    {t("Secondary:")}
                    {t(" ")}
                    {t(
                      (item.assigned_department
                        ? item.assigned_secondary_departments || []
                        : item.analysis?.secondary_departments || []
                      )
                        .map((value) => t(value))
                        .join(", ") || "None",
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
          {page && page.total > 25 && (
            <div className="mt-5 flex items-center justify-between text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || saving || offset === 0}
                onClick={() => {
                  setOffset(Math.max(0, offset - 25));
                  setSelected(null);
                }}
              >
                {t("Previous")}
              </Button>
              <span>
                {t(offset + 1)}–{t(Math.min(offset + 25, page.total))}
                {t(" of ")}
                {t(page.total)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || saving || offset + 25 >= page.total}
                onClick={() => {
                  setOffset(offset + 25);
                  setSelected(null);
                }}
              >
                {t("Next")}
              </Button>
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <Button
            variant="outline"
            className="mb-6"
            disabled={saving}
            onClick={() => setSelected(null)}
            autoFocus
          >
            <ArrowLeft size={16} />
            {t(" Back to queue")}
          </Button>
          <ComplaintDetail
            key={selected.tracking_id}
            complaint={selected}
            showOriginal
            onSelectAction={(action) => setNote(action)}
          />
          {canUpdate && (
            <form
              onSubmit={decide}
              className="mt-7 border-t border-stone-100 pt-6"
            >
              <h3 className="mb-4 font-semibold">{t("Officer decision")}</h3>
              {canRoute && (
                <>
                  <label htmlFor="assigned-department" className="field-label">
                    {t("Assigned department")}
                  </label>
                  <select
                    id="assigned-department"
                    className="field mb-4"
                    disabled={saving}
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setSecondaryDepartments((values) =>
                        values.filter((name) => name !== e.target.value),
                      );
                    }}
                    required
                  >
                    <option value="" disabled>
                      {t("Select department")}
                    </option>
                    {departments.map((value) => (
                      <option key={value} value={value}>
                        {t(value)}
                      </option>
                    ))}
                  </select>
                  <fieldset className="mb-4" disabled={saving}>
                    <legend className="field-label">
                      {t("Secondary departments")}
                    </legend>
                    <p className="mb-3 text-xs text-stone-500">
                      {t(
                        "Select every supporting department needed to resolve this complaint.",
                      )}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {departments.map((value) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="accent-emerald-700"
                            disabled={value === department}
                            checked={secondaryDepartments.includes(value)}
                            onChange={(e) =>
                              setSecondaryDepartments((values) =>
                                e.target.checked
                                  ? [...values, value]
                                  : values.filter((name) => name !== value),
                              )
                            }
                          />
                          {t(value)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}
              <label htmlFor="decision-note" className="field-label">
                {t("Decision note")}
              </label>
              <textarea
                id="decision-note"
                className="field min-h-24"
                disabled={saving}
                required
                minLength={3}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "Explain your review, any department override, or the progress update.",
                )}
              />
              {decisionError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {t(decisionError)}
                </p>
              )}
              <Button
                className="mt-4 w-full"
                type="submit"
                disabled={
                  saving || note.trim().length < 3 || (canRoute && !department)
                }
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                {t(" ")}
                {t(
                  canRoute
                    ? "Approve routing"
                    : selected.status === "routed"
                      ? "Start work"
                      : "Mark resolved",
                )}
              </Button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
