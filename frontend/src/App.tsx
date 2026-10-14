import { useEffect, useState } from "react";
import { ArrowUpRight, Globe2, Landmark, ShieldCheck } from "lucide-react";
import { getMeta } from "./features/complaints/api";
import { SubmitComplaint } from "./features/complaints/SubmitComplaint";
import { TrackComplaint } from "./features/complaints/TrackComplaint";
import { OfficerDashboard } from "./features/complaints/OfficerDashboard";
import type { Meta } from "./features/complaints/types";

type View = "submit" | "track" | "officer";
export default function App() {
  const [view, setView] = useState<View>("submit");
  const [pending, setPending] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getMeta(controller.signal)
      .then(setMeta)
      .catch((e) => {
        if (!controller.signal.aborted) setMetaError(e.message);
      });
    return () => controller.abort();
  }, []);
  const titles = {
    submit: (
      <>
        Every voice matters.
        <br />
        <span className="text-emerald-800">Let yours be understood.</span>
      </>
    ),
    track: (
      <>
        Your complaint.
        <br />
        <span className="text-emerald-800">Its progress, in plain sight.</span>
      </>
    ),
    officer: (
      <>
        Better understanding.
        <br />
        <span className="text-emerald-800">Better civic action.</span>
      </>
    ),
  };
  return (
    <>
      <header className="border-b border-stone-200/80 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!pending) setView("submit");
            }}
            className="flex items-center gap-3"
            aria-label="ACIE home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white">
              <Landmark size={21} />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">
                ACIE<span className="text-emerald-700">.</span>
              </span>
              <span className="block text-[10px] uppercase tracking-[.14em] text-stone-400">
                Civic intelligence engine
              </span>
            </span>
          </a>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-1 rounded-xl bg-stone-100 p-1"
          >
            {(
              [
                ["submit", "Submit complaint"],
                ["track", "Track complaint"],
                ["officer", "Officer workspace"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                disabled={pending}
                aria-current={view === key ? "page" : undefined}
                className={`nav-tab ${view === key ? "active" : ""}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <span className="hidden items-center gap-2 text-xs text-stone-500 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
            Hackathon prototype
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-9 flex items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-4 flex items-center gap-2">
              <span className="h-px w-6 bg-emerald-700" />
              Bridging language. Connecting communities.
            </p>
            <h1 className="text-3xl font-semibold leading-[1.16] tracking-tight sm:text-[42px]">
              {titles[view]}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-500">
              {view === "submit"
                ? "Civic complaints in your language, transformed into clear, explainable action."
                : view === "track"
                  ? "Stay connected to your complaint from the first review to its resolution."
                  : "Review the evidence, validate the recommendation, and guide the next step."}
            </p>
          </div>
          <div className="hidden h-20 w-20 items-center justify-center rounded-full border border-emerald-900/10 text-emerald-800 sm:flex">
            <Globe2 size={38} strokeWidth={1} />
          </div>
        </div>
        {metaError && (
          <div className="notice mb-6" role="alert">
            {metaError}
          </div>
        )}
        {meta && !meta.ai_configured && (
          <div className="notice mb-6">
            Gemini is not configured. Complaints will be saved with a tracking
            ID for manual officer review. Add the server’s GEMINI_API_KEY to
            enable AI analysis.
          </div>
        )}
        {meta && !meta.voice_available && view === "submit" && (
          <div className="notice mb-6">
            Voice processing is unavailable on this server. Text complaints are
            available.
          </div>
        )}
        {view === "submit" ? (
          <SubmitComplaint onPendingChange={setPending} />
        ) : view === "track" ? (
          <TrackComplaint />
        ) : (
          <OfficerDashboard departments={meta?.departments || []} />
        )}
      </main>
      <footer className="border-t border-stone-200/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-stone-500 sm:px-8">
          <span className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-700" />
            Preserved originals · Explainable recommendations · Human approval
          </span>
          <span className="flex items-center gap-1">
            Built for accessible civic services
            <ArrowUpRight size={13} />
          </span>
        </div>
      </footer>
    </>
  );
}
