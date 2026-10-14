import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  Mic,
  Square,
  Upload,
  Route,
  Droplets,
  Waves,
  Sparkles,
  ShieldCheck,
  MapPin,
  Clock3,
  Users,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { submitText, submitVoice } from "./api";
import { AnalysisPanel } from "./AnalysisPanel";
import { AudioActivity } from "./AudioActivity";
import { complaintSamples } from "./samples";
import type { Complaint } from "./types";
import { useRecorder } from "./useRecorder";
import "./intake.css";

const sampleIcons = [Route, Droplets, Waves];
const sampleDescriptions = [
  "Potholes & damaged streets",
  "Interruptions & supply issues",
  "Blocked drains & flooding",
];

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
  const editor = useRef<HTMLTextAreaElement>(null);
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
  if (busy || record) {
    return (
      <div>
        {record && (
          <Button
            type="button"
            variant="outline"
            className="mb-5"
            onClick={reset}
            autoFocus
          >
            New complaint
          </Button>
        )}
        <AnalysisPanel
          complaint={record}
          pending={busy}
          onTrack={onTrack}
          mode={mode}
          onComplaintUpdated={setRecord}
        />
      </div>
    );
  }
  return (
    <div className="citizen-intake">
      <form onSubmit={submit} className="panel editor-panel">
        <div className="workspace-panel-heading">
          <div>
            <p className="eyebrow">LET’S START HERE</p>
            <h2 className="mt-1 text-lg font-semibold">
              Tell us what happened
            </h2>
          </div>
          <span className="intake-private">
            <ShieldCheck size={15} /> Original words preserved
          </span>
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
            <div className="intake-samples">
              <p className="mb-3 text-xs text-stone-500">
                Need a starting point?{" "}
                <span className="text-stone-700">
                  Try an example, then make it yours.
                </span>
              </p>
              <div className="intake-sample-grid">
                {complaintSamples.map((sample, index) => {
                  const Icon = sampleIcons[index];
                  return (
                    <button
                      key={sample.label}
                      type="button"
                      className="intake-sample"
                      aria-label={sample.label}
                      aria-pressed={text === sample.text}
                      disabled={locked}
                      onClick={() => {
                        setText(sample.text);
                        setError("");
                        editor.current?.focus();
                      }}
                    >
                      <span className="sample-icon">
                        <Icon size={22} />
                      </span>
                      <span>
                        <strong>{sample.label}</strong>
                        <small>{sampleDescriptions[index]}</small>
                      </span>
                      {text === sample.text ? (
                        <Check size={16} />
                      ) : (
                        <ArrowRight size={16} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5">
              <label className="field-label" htmlFor="complaint-text">
                Your complaint
              </label>
              <textarea
                id="complaint-text"
                ref={editor}
                aria-describedby="complaint-help"
                disabled={locked}
                required
                minLength={3}
                maxLength={5000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="field complaint-editor"
                placeholder="What happened, and where? For example: The street near our school has deep potholes. It gets flooded when it rains…"
              />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
                <span id="complaint-help">
                  Any Indian language or dialect · No formal wording needed
                </span>
                <span>{text.length}/5000</span>
              </div>
            </div>
            <details className="intake-tips">
              <summary>
                <Sparkles size={15} /> What makes a helpful complaint?
                <ChevronDown size={15} />
              </summary>
              <div className="intake-tip-grid">
                <p>
                  <MapPin size={17} />
                  <strong>Where is it?</strong>
                  <span>Mention the street, area, or a nearby landmark.</span>
                </p>
                <p>
                  <Clock3 size={17} />
                  <strong>Since when?</strong>
                  <span>Share when it started and how often it happens.</span>
                </p>
                <p>
                  <Users size={17} />
                  <strong>Who is affected?</strong>
                  <span>Explain the impact and any immediate danger.</span>
                </p>
              </div>
            </details>
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
          <span className="intake-review-note">
            <ShieldCheck size={18} />
            <span>
              <strong>You report. We help make sense of it.</strong>
              <small>Routing requires officer approval</small>
            </span>
          </span>
          <Button
            type="submit"
            disabled={
              locked || (mode === "text" ? text.trim().length < 3 : !file)
            }
          >
            <>
              Submit complaint
              <ArrowRight size={17} />
            </>
          </Button>
        </div>
      </form>
    </div>
  );
}
