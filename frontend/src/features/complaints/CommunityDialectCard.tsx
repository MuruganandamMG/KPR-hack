import { useLanguage } from "../localization";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Globe2,
  Languages,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import { addCommunityDialect, getCommunityDialects } from "./api";
import type { Complaint, LearnedDialectWord } from "./types";

export interface CommunityDialectCardProps {
  complaint: Complaint;
}

export function CommunityDialectCard({ complaint }: CommunityDialectCardProps) {
  const { t } = useLanguage();

  const dialectWord = complaint.analysis?.learned_dialect;
  const [modalOpen, setModalOpen] = useState(false);
  const [communityList, setCommunityList] = useState<LearnedDialectWord[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // New word form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newCategory, setNewCategory] = useState(
    complaint.analysis?.category || "Water Supply",
  );
  const [savingWord, setSavingWord] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  async function openCommunityDictionary() {
    setModalOpen(true);
    setLoadingList(true);
    try {
      const data = await getCommunityDialects();
      setCommunityList(data);
    } catch {
      // Fallback to sample / currently detected term if network fails
      if (dialectWord) {
        setCommunityList([dialectWord]);
      }
    } finally {
      setLoadingList(false);
    }
  }

  async function handleAddWord(e: React.FormEvent) {
    e.preventDefault();
    if (!newWord.trim() || !newMeaning.trim()) return;
    setSavingWord(true);
    try {
      const saved = await addCommunityDialect({
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        category: newCategory,
        region: "Tamil Regional Vernacular",
      });
      setCommunityList((prev) => [saved, ...prev]);
      setNewWord("");
      setNewMeaning("");
      setShowAddForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingWord(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-xs"
      aria-label={t("Community Dialect Learning")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Languages size={18} />
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-indigo-800">
              {t("USP 4 · Community Dialect Learning")}
            </p>
            <h3 className="font-semibold text-stone-900">
              {t("Regional Vernacular Dictionary")}
            </h3>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={openCommunityDictionary}
          className="text-xs h-8 border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
        >
          <BookOpen size={14} className="mr-1.5" />
          {t("View Dialect Lexicon")}
        </Button>
      </div>

      {dialectWord ? (
        <div className="mt-3.5 rounded-xl border border-indigo-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-indigo-950 font-serif">
                “{t(dialectWord.word)}”
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-2xs font-medium text-indigo-700 border border-indigo-100">
                {t(dialectWord.region)}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
              <Check size={14} />
              {t(" Learned & Verified")}
            </span>
          </div>

          <p className="mt-2 text-xs text-stone-600">
            <strong className="text-stone-800">
              {t("Civic Translation: ")}
            </strong>
            {t(dialectWord.suggested_meaning)}
            {t(" (Mapped to ")}
            {t(dialectWord.category)})
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-stone-600">
          {t(
            "Standard civic vocabulary identified. Regional idioms are auto-indexed into the municipal lexicon.",
          )}
        </p>
      )}

      {/* Community Lexicon Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe2 size={20} className="text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-stone-900">
                    {t("Community Dialect Knowledge Base")}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {t("Crowdsourced & AI-verified regional vocabulary")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            {submitSuccess && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
                {t(
                  "✔ New dialect term successfully contributed to the municipal AI!",
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">
                {t(communityList.length)}
                {t(" Registered Term(s)")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus size={13} />
                {t(showAddForm ? "Close Form" : "Contribute Term")}
              </Button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddWord}
                className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs space-y-2.5"
              >
                <p className="font-medium text-stone-800">
                  {t("Add local slang or dialect word:")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder={t("Dialect word (e.g. Sombu)")}
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    className="field text-xs py-1.5 px-2 bg-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder={t("Standard Meaning (e.g. Water Pipe / Pot)")}
                    value={newMeaning}
                    onChange={(e) => setNewMeaning(e.target.value)}
                    className="field text-xs py-1.5 px-2 bg-white"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="field text-xs py-1 px-2 bg-white w-40"
                  >
                    <option value="Water Supply">{t("Water Supply")}</option>
                    <option value="Roads">{t("Roads")}</option>
                    <option value="Sanitation">{t("Sanitation")}</option>
                    <option value="Electricity">{t("Electricity")}</option>
                    <option value="Drainage">{t("Drainage")}</option>
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingWord}
                    className="text-xs h-7"
                  >
                    {savingWord ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      "Save to Lexicon"
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
              {loadingList ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  <Loader2
                    size={18}
                    className="animate-spin mx-auto mb-2 text-indigo-500"
                  />
                  {t("Loading vernacular database...")}
                </div>
              ) : communityList.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-400">
                  {t("No terms registered yet.")}
                </p>
              ) : (
                communityList.map((item, idx) => (
                  <div
                    key={`${item.word}-${idx}`}
                    className="flex items-start justify-between rounded-xl border border-stone-200/80 bg-white p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">
                          {item.word}
                        </span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-2xs text-stone-600">
                          {t(item.category)}
                        </span>
                      </div>
                      <p className="mt-1 text-stone-600">
                        {item.suggested_meaning}
                      </p>
                    </div>
                    <span className="text-2xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                      {t("Active")}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-stone-100 pt-3 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs h-8"
              >
                {t("Close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
