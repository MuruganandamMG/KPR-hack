import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { Button } from "../../shared/ui/button";
import { trackComplaint } from "./api";
import { ComplaintDetail } from "./ComplaintDetail";
import type { Complaint } from "./types";

export function TrackComplaint() {
  const [id, setId] = useState("");
  const [record, setRecord] = useState<Complaint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function track(event: React.FormEvent) {
    event.preventDefault();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setRecord(null);
    try {
      const result = await trackComplaint(id, controller.signal);
      if (!controller.signal.aborted) setRecord(result);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Tracking failed.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel">
        <h2 className="text-xl font-semibold">
          A little clarity, every step of the way.
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Enter the tracking ID you received when you submitted your complaint.
        </p>
        <form onSubmit={track} className="mt-6">
          <label htmlFor="tracking-id" className="field-label">
            Tracking ID
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="tracking-id"
              required
              className="field flex-1 font-mono text-sm"
              placeholder="GRV-2026-…"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <Button type="submit" disabled={busy || !id.trim()}>
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}
              Track complaint
            </Button>
          </div>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {record ? (
          <div className="mt-8 border-t border-stone-100 pt-6">
            <ComplaintDetail complaint={record} />
          </div>
        ) : (
          !busy &&
          !error && (
            <div className="py-14 text-center text-stone-400">
              <Search className="mx-auto mb-3" size={32} strokeWidth={1.5} />
              <p className="text-sm">
                Your complaint’s journey will appear here.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
