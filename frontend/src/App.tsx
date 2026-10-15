import { useLanguage } from "./features/localization";
import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { getMeta } from "./features/complaints/api";
import { SubmitComplaint } from "./features/complaints/SubmitComplaint";
import { TrackComplaint } from "./features/complaints/TrackComplaint";
import { OfficerDashboard } from "./features/complaints/OfficerDashboard";
import type { Meta } from "./features/complaints/types";
import {
  LanguageProvider,
  WebsiteLanguageSelector,
} from "./features/localization";

type View = "submit" | "track" | "officer";
export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();

  const [view, setView] = useState<View>("submit");
  const [pending, setPending] = useState(false);
  const [trackingId, setTrackingId] = useState("");
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
    submit: "Complaint workspace",
    track: "Track a complaint",
    officer: "Officer workspace",
  };
  function openTracking(id: string) {
    setTrackingId(id);
    setView("track");
  }
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          href="#"
          aria-label={t("ACIE home")}
          className="flex items-center gap-3"
          onClick={(event) => {
            event.preventDefault();
            if (!pending) setView("submit");
          }}
        >
          <span className="brand-symbol">
            <Landmark size={23} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            {t("ACIE")}
            <span className="text-emerald-700">.</span>
          </span>
          <span className="prototype-label">{t("MVP prototype")}</span>
        </a>
        <WebsiteLanguageSelector />
        <nav aria-label={t("Main navigation")} className="app-navigation">
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
              {t(label)}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-workspace">
        <div className="page-heading">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t(titles[view])}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {t(
                view === "submit"
                  ? "Submit text or audio for civic analysis."
                  : view === "track"
                    ? "Status, department and updates in one place."
                    : "Review evidence. Approve routing. Update progress.",
              )}
            </p>
          </div>
          <span className="hidden text-xs text-stone-500 sm:block">
            {t(
              view === "officer"
                ? "Synthetic demo data only"
                : "Citizen services",
            )}
          </span>
        </div>
        {metaError && (
          <div className="notice mb-5" role="alert">
            {t(metaError)}
          </div>
        )}
        {meta && !meta.ai_configured && (
          <div className="notice mb-5">
            {t("AI unavailable. Complaints are saved for manual review.")}
          </div>
        )}
        {meta && !meta.voice_available && view === "submit" && (
          <div className="notice mb-5">{t("Voice unavailable. Use text.")}</div>
        )}
        {view === "submit" ? (
          <SubmitComplaint
            onPendingChange={setPending}
            onTrack={openTracking}
          />
        ) : view === "track" ? (
          <TrackComplaint initialId={trackingId} />
        ) : (
          <OfficerDashboard departments={meta?.departments || []} />
        )}
      </main>
    </div>
  );
}
