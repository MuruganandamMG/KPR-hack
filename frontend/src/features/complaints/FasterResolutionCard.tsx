import {
  ArrowUpRight,
  Check,
  FastForward,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { Complaint } from "./types";

export interface FasterResolutionCardProps {
  complaint: Complaint;
}

export function FasterResolutionCard({ complaint }: FasterResolutionCardProps) {
  const faster = complaint.analysis?.faster_resolution;
  if (!faster || !faster.suggestions || faster.suggestions.length === 0)
    return null;

  return (
    <div
      className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs"
      aria-label="AI Faster Resolution Suggestions"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <FastForward size={18} />
          </span>
          <div>
            <p className="eyebrow text-xs uppercase tracking-wider text-purple-800">
              USP 9 · Actionable Acceleration Clues
            </p>
            <h3 className="font-semibold text-stone-900">
              AI Suggests Faster Field Resolution
            </h3>
          </div>
        </div>

        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-900 border border-purple-200">
          {faster.overall_speedup_factor}
        </span>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {faster.suggestions.map((item, idx) => (
          <div
            key={`${item.item_name}-${idx}`}
            className="flex flex-col justify-between rounded-xl border border-purple-100 bg-white p-3 shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-xs text-stone-900">
                  {item.item_name}
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-2xs font-bold text-emerald-700 border border-emerald-100">
                  Save {item.potential_time_saved}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-stone-600 leading-normal">
                {item.impact_rationale}
              </p>
            </div>
            <p className="mt-2 text-2xs italic text-stone-400 border-t border-stone-100 pt-1.5">
              {item.example}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
