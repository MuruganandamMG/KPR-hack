import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  LoaderCircle,
  Mic,
  Square,
  Upload,
  Volume2,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { submitText, submitVoice } from "./api";
import { ComplaintDetail } from "./ComplaintDetail";
import type { Complaint } from "./types";
import { useRecorder } from "./useRecorder";

export function SubmitComplaint({
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void;
}) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<Complaint | null>(null);
  const lock = useRef(false);
  const attempt = useRef<{ payload: string | File; key: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const recorder = useRecorder(setFile);
  const recordingBusy = recorder.recording || recorder.pending;
  useEffect(() => {
    onPendingChange?.(busy || recordingBusy);
    return () => onPendingChange?.(false);
  }, [busy, recordingBusy, onPendingChange]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || recordingBusy) return;
    const payload = mode === "text" ? text : file;
    if (!payload) {
      setError("Record or upload an audio file.");
      return;
    }
    if (payload instanceof File && payload.size > 10 * 1024 * 1024) {
      setError("Audio must be 10 MiB or smaller.");
      return;
    }
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result =
        typeof payload === "string"
          ? await submitText(payload, attempt.current.key)
          : await submitVoice(payload, attempt.current.key);
      if (alive.current) setRecord(result);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Submission failed. Please retry.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (record)
    return (
      <div className="panel">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Complaint received</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRecord(null);
              setText("");
              setFile(null);
              attempt.current = null;
            }}
          >
            New complaint
          </Button>
        </div>
        <ComplaintDetail complaint={record} />
      </div>
    );
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[1.45fr_1fr]">
      <form onSubmit={submit} className="panel">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            Tell us what needs attention
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Use the words you’re comfortable with. We’ll help make sense of
            them.
          </p>
        </div>
        <div
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1"
          aria-label="Complaint input method"
        >
          <button
            type="button"
            aria-pressed={mode === "text"}
            disabled={busy || recordingBusy}
            className={`mode-tab ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
          >
            <FileText size={17} />
            Type a complaint
          </button>
          <button
            type="button"
            aria-pressed={mode === "voice"}
            disabled={busy}
            className={`mode-tab ${mode === "voice" ? "active" : ""}`}
            onClick={() => setMode("voice")}
          >
            <Mic size={17} />
            Use your voice
          </button>
        </div>
        {mode === "text" ? (
          <>
            <label className="field-label" htmlFor="complaint-text">
              Your complaint
            </label>
            <textarea
              id="complaint-text"
              disabled={busy}
              required
              minLength={3}
              maxLength={5000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="field min-h-48 resize-y"
              placeholder="For example: Enga area la moonu naala thanni varala…"
            />
            <div className="mt-2 flex justify-between gap-3 text-xs text-stone-400">
              <span>Any Indian language · Mixed languages welcome</span>
              <span>{text.length}/5000</span>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-7 text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${recorder.recording ? "animate-pulse bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-800"}`}
            >
              <Mic size={28} />
            </div>
            <p className="font-medium">
              {recorder.recording
                ? `Recording · ${recorder.seconds}s / 120s`
                : "Speak naturally. We’re listening."}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Up to 2 minutes · Maximum 10 MiB
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                disabled={busy}
                variant={recorder.recording ? "outline" : "default"}
                onClick={recordingBusy ? recorder.stop : recorder.start}
              >
                {recorder.pending ? (
                  <>Cancel microphone request</>
                ) : recorder.recording ? (
                  <>
                    <Square size={15} />
                    Stop recording
                  </>
                ) : (
                  <>
                    <Mic size={15} />
                    Start recording
                  </>
                )}
              </Button>
              <label
                className={`upload-control ${busy || recordingBusy ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload size={15} />
                Upload audio
                <input
                  aria-label="Upload audio"
                  type="file"
                  accept="audio/*,.webm,.m4a"
                  disabled={busy || recordingBusy}
                  className="sr-only"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setError("");
                  }}
                />
              </label>
            </div>
            {preview && (
              <div className="mt-5">
                <p className="mb-2 break-all text-xs text-stone-500">
                  {file?.name}
                </p>
                <audio
                  aria-label="Recording preview"
                  className="w-full"
                  controls
                  src={preview}
                />
              </div>
            )}
            {recorder.error && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {recorder.error}
              </p>
            )}
          </div>
        )}
        <div className="my-6 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          Your original words are preserved. AI suggests a department; an
          officer reviews and approves the route.
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={
            busy ||
            recordingBusy ||
            (mode === "text" ? text.trim().length < 3 : !file)
          }
        >
          {busy ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Understanding your complaint…
            </>
          ) : (
            <>
              Submit complaint
              <ArrowRight size={17} />
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-stone-400">
          You’ll receive a tracking ID to follow the progress.
        </p>
      </form>
      <aside className="space-y-6">
        <div className="rounded-3xl bg-emerald-900 p-7 text-white">
          <Volume2 size={26} className="mb-5 text-emerald-300" />
          <h2 className="text-2xl font-semibold leading-tight">
            Your words.
            <br />A clearer way forward.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-emerald-100/80">
            From local dialects to everyday expressions, civic services should
            understand how you speak.
          </p>
          <div className="mt-6 border-t border-white/15 pt-5">
            <p className="text-xs uppercase tracking-wider text-emerald-300">
              A complaint, translated into action
            </p>
            <p className="mt-3 text-sm">“Road romba mosama.”</p>
            <ArrowRight size={15} className="my-3 text-emerald-300" />
            <p className="text-sm text-emerald-100">
              “The road is severely damaged.”
            </p>
          </div>
        </div>
        <div className="px-3">
          <p className="eyebrow mb-5">How it works</p>
          {[
            ["01", "Share the issue", "Type or record in your own language."],
            [
              "02",
              "Understand & review",
              "AI explains; an officer approves routing.",
            ],
            [
              "03",
              "Follow the progress",
              "Keep your ID and check for updates.",
            ],
          ].map(([number, title, description]) => (
            <div className="mb-5 flex gap-4" key={number}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-xs font-semibold text-stone-400">
                {number}
              </span>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
