import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  LoaderCircle,
  Mic,
  Square,
  Upload,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { submitText, submitVoice } from "./api";
import { AnalysisPanel } from "./AnalysisPanel";
import { AudioActivity } from "./AudioActivity";
import { complaintSamples } from "./samples";
import type { Complaint } from "./types";
import { useRecorder } from "./useRecorder";

export function SubmitComplaint({
  onPendingChange,
  onTrack,
}: {
  onPendingChange?: (pending: boolean) => void;
  onTrack?: (id: string) => void;
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
    if (lock.current || recordingBusy || record) return;
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
  const locked = busy || recordingBusy || !!record;
  function reset() {
    setRecord(null);
    setText("");
    setFile(null);
    setError("");
    attempt.current = null;
  }
  return (
    <div className="workspace-grid">
      <form onSubmit={submit} className="panel editor-panel">
        <div className="workspace-panel-heading">
          <div>
            <p className="eyebrow">01 / Citizen input</p>
            <h2 className="mt-1 text-lg font-semibold">
              Tell us what happened
            </h2>
          </div>
          <span className="text-xs text-stone-500">Text or voice</span>
        </div>
        <div className="input-switch" aria-label="Complaint input method">
          <button
            type="button"
            aria-pressed={mode === "text"}
            disabled={locked}
            className={`mode-tab ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
          >
            <FileText size={17} />
            Type a complaint
          </button>
          <button
            type="button"
            aria-pressed={mode === "voice"}
            disabled={locked}
            className={`mode-tab ${mode === "voice" ? "active" : ""}`}
            onClick={() => setMode("voice")}
          >
            <Mic size={17} />
            Use your voice
          </button>
        </div>
        {mode === "text" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500">Try a sample</span>
              {complaintSamples.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  className="sample-chip"
                  disabled={locked}
                  onClick={() => {
                    setText(sample.text);
                    setError("");
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <label className="field-label" htmlFor="complaint-text">
                Your complaint
              </label>
              <textarea
                id="complaint-text"
                disabled={locked}
                required
                minLength={3}
                maxLength={5000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="field complaint-editor"
                placeholder="Describe the issue in your own words."
              />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
                <span>Any Indian language or dialect</span>
                <span>{text.length}/5000</span>
              </div>
            </div>
          </>
        ) : (
          <div className="voice-workspace">
            <span
              className={`voice-symbol ${recorder.recording ? "recording" : ""}`}
            >
              <Mic size={34} />
            </span>
            <p className="font-medium">
              {recorder.recording
                ? `Recording: ${recorder.seconds}s / 120s`
                : recorder.pending
                  ? "Waiting for microphone..."
                  : "Record or upload your complaint"}
            </p>
            <p className="text-xs text-stone-500">Up to 2 minutes / 10 MiB</p>
            {recorder.recording && <AudioActivity stream={recorder.stream} />}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                disabled={busy || !!record}
                variant={recordingBusy ? "outline" : "default"}
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
                className={`upload-control ${locked ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload size={15} />
                Upload audio
                <input
                  aria-label="Upload audio"
                  type="file"
                  accept="audio/*,.webm,.m4a"
                  disabled={locked}
                  className="sr-only"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    event.currentTarget.value = "";
                    setError("");
                  }}
                />
              </label>
            </div>
            {preview && (
              <div className="w-full">
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
              <p role="alert" className="text-sm text-red-700">
                {recorder.error}
              </p>
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <div className="editor-actions">
          <span className="text-xs text-stone-500">
            {record
              ? "Original input saved"
              : "Routing requires officer approval"}
          </span>
          {record ? (
            <Button type="button" variant="outline" onClick={reset}>
              New complaint
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={
                locked || (mode === "text" ? text.trim().length < 3 : !file)
              }
            >
              {busy ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Submit complaint
                  <ArrowRight size={17} />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
      <AnalysisPanel complaint={record} pending={busy} onTrack={onTrack} />
    </div>
  );
}
