import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import catalogs, { loadLanguageCatalog } from "./catalogs";

export const websiteLanguages = [
  ["en", "English"],
  ["ta", "தமிழ்"],
  ["hi", "हिन्दी"],
  ["te", "తెలుగు"],
  ["kn", "ಕನ್ನಡ"],
  ["ml", "മലയാളം"],
  ["mr", "मराठी"],
  ["bn", "বাংলা"],
  ["gu", "ગુજરાતી"],
  ["pa", "ਪੰਜਾਬੀ"],
] as const;
export type WebsiteLanguage = (typeof websiteLanguages)[number][0];
const storageKey = "acie.website-language";
const supported = (value: string | null): value is WebsiteLanguage =>
  websiteLanguages.some(([code]) => code === value);
type Translate = <T>(value: T, parameters?: unknown[]) => T;
const identity: Translate = (value, parameters) => {
  if (typeof value !== "string") return value;
  return value.replace(/\{(\d+)\}/g, (match, index) =>
    parameters?.[Number(index)] === undefined
      ? match
      : String(parameters[Number(index)]),
  ) as typeof value;
};
const LanguageContext = createContext<{
  language: WebsiteLanguage;
  setLanguage: (value: WebsiteLanguage) => void;
  t: Translate;
}>({ language: "en", setLanguage: () => {}, t: identity });

function initialLanguage(): WebsiteLanguage {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return supported(saved) ? saved : "en";
  } catch {
    /* Storage can be disabled; language switching still works. */
  }
  for (const preferred of navigator.languages || [navigator.language]) {
    const code = preferred.split("-")[0];
    if (supported(code)) return code;
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<WebsiteLanguage>(initialLanguage);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [languageError, setLanguageError] = useState(false);
  useEffect(() => {
    let active = true;
    setLanguageError(false);
    loadLanguageCatalog(language).then(
      () => {
        if (active) setCatalogVersion((version) => version + 1);
      },
      () => {
        if (active) setLanguageError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [language]);
  const t = useCallback<Translate>(
    (value, parameters) => {
      if (typeof value !== "string") return value;
      const key = value.trim().replace(/\s+/g, " ");
      if (!key) return value;
      const candidate = language === "en" ? key : catalogs[language]?.[key];
      const translated = typeof candidate === "string" ? candidate : key;
      const output = translated.replace(/\{(\d+)\}/g, (match, index) =>
        parameters?.[Number(index)] === undefined
          ? match
          : String(parameters[Number(index)]),
      );
      return (value.match(/^\s*/)?.[0] +
        output +
        value.match(/\s*$/)?.[0]) as typeof value;
    },
    [language, catalogVersion],
  );
  const setLanguage = useCallback((next: WebsiteLanguage) => {
    if (!supported(next)) return;
    updateLanguage(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* Session preference remains usable. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("ACIE | Civic complaint portal");
  }, [language, t]);
  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
  return (
    <LanguageContext.Provider value={value}>
      {languageError && (
        <p role="alert" className="notice m-4">
          {t("Language could not be loaded. Please try again.")}
        </p>
      )}
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export function WebsiteLanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-emerald-950">
      <span aria-hidden="true">◎</span>
      <span>{t("Language")}</span>
      <select
        aria-label="Website language"
        value={language}
        onChange={(event) => setLanguage(event.target.value as WebsiteLanguage)}
        className="min-h-11 max-w-40 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {websiteLanguages.map(([code, label]) => (
          <option key={code} value={code} lang={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
