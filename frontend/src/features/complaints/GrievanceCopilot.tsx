import { useState } from "react";
import {
  Bot,
  Clock3,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageSquarePlus,
  Sparkles,
  Users,
} from "lucide-react";

export interface GrievanceCopilotProps {
  currentText: string;
  onAppendText: (phrase: string) => void;
  disabled?: boolean;
}

export function GrievanceCopilot({
  currentText,
  onAppendText,
  disabled = false,
}: GrievanceCopilotProps) {
  const [minimized, setMinimized] = useState(false);

  const trimmed = currentText.trim();
  const isShort = trimmed.length > 0 && trimmed.length < 25;
  const hasLocation =
    /(near|street|road|nagar|colony|ward|area|lane|opposite|adutha|theru|salai)/i.test(
      trimmed,
    );
  const hasDuration =
    /(day|days|week|month|since|nal|naala|varusham|mani|hours)/i.test(trimmed);
  const hasScope =
    /(entire|all|house|street|village|school|hospital|people|ellorum)/i.test(
      trimmed,
    );

  // Suggested prompt chips based on what's missing
  const suggestions = [
    !hasLocation && {
      icon: MapPin,
      label: "+ Add Landmark",
      text: " near the main bus stop / school",
    },
    !hasDuration && {
      icon: Clock3,
      label: "+ Add Duration",
      text: " for the past 3 days",
    },
    !hasScope && {
      icon: Users,
      label: "+ Specify Scope",
      text: " affecting our entire street",
    },
  ].filter(Boolean) as {
    icon: typeof MapPin;
    label: string;
    text: string;
  }[];

  return (
    <div
      className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 transition-all text-xs"
      aria-label="Adaptive AI Grievance Copilot"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-200 text-emerald-800">
            <Bot size={15} />
          </span>
          <div>
            <span className="font-semibold text-emerald-950">
              AI Grievance Copilot
            </span>
            <span className="ml-2 text-2xs font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              USP 1 · Adaptive Intake
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMinimized(!minimized)}
          className="text-2xs font-medium text-emerald-800 hover:text-emerald-950 underline"
        >
          {minimized ? "Show Hints" : "Hide"}
        </button>
      </div>

      {!minimized && (
        <div className="mt-2.5 space-y-2">
          <p className="text-stone-700 leading-relaxed">
            {isShort ? (
              <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                <Lightbulb size={14} className="shrink-0 text-amber-600" />
                Your grievance is brief. Adding location or duration details
                helps municipal workers resolve it 40% faster.
              </span>
            ) : (
              <span className="text-stone-600">
                You can describe in any vernacular slang (e.g. Tamil /
                Tanglish). Tap quick-assist details to append:
              </span>
            )}
          </p>

          {suggestions.length > 0 && !disabled && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onAppendText(item.text)}
                    className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-2xs font-medium text-emerald-900 shadow-2xs hover:bg-emerald-100/70 transition-colors"
                  >
                    <Icon size={12} className="text-emerald-700" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
