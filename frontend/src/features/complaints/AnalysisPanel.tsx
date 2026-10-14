import { CheckCircle2, ChevronRight, ScanText, Sparkles } from "lucide-react";
import { Button } from "../../shared/ui/button";
import { ComplaintDetail } from "./ComplaintDetail";
import { ThinkingTimeline } from "./ThinkingTimeline";
import type { Complaint } from "./types";

export function AnalysisPanel({
  complaint,
  pending,
  onTrack,
  mode,
  onComplaintUpdated,
}: {
  complaint: Complaint | null;
  pending: boolean;
  onTrack?: (id: string) => void;
  mode?: "text" | "voice";
  onComplaintUpdated?: (updated: Complaint) => void;
}) {
  return (
    <section
      className="panel analysis-panel"
      aria-label="Analysis"
      aria-busy={pending}
    >
      <div className="workspace-panel-heading">
        <div className="flex items-center gap-3">
          <span className="section-icon">
            <Sparkles size={19} />
          </span>
          <div>
            <p className="eyebrow">02 / Understanding</p>
            <h2 className="mt-1 text-lg font-semibold">
              {complaint ? "Complaint received" : "AI analysis"}
            </h2>
          </div>
        </div>
        {complaint && <CheckCircle2 className="text-emerald-700" size={20} />}
      </div>
      {pending ? (
        <ThinkingTimeline mode={mode} />
      ) : complaint ? (
        <>
          <ComplaintDetail
            complaint={complaint}
            onComplaintUpdated={onComplaintUpdated}
          />
          {onTrack && (
            <Button
              className="mt-6 w-full"
              variant="outline"
              onClick={() => onTrack(complaint.tracking_id)}
            >
              Track progress
              <ChevronRight size={16} />
            </Button>
          )}
        </>
      ) : (
        <div className="analysis-placeholder">
          <span className="analysis-symbol">
            <ScanText size={38} strokeWidth={1.4} />
          </span>
          <div>
            <h3 className="font-semibold text-stone-700">
              Your complaint, made clear
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              Submit text or audio to see the analysis.
            </p>
          </div>
          <div className="analysis-fields">
            <span>Language & meaning</span>
            <span>Department & priority</span>
            <span>Explanation & tracking ID</span>
          </div>
        </div>
      )}
    </section>
  );
}
