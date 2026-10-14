# Complaint workflows

The officer workspace shows the full-width queue first. Selecting a complaint replaces the queue with its detail and decision screen. Back to queue preserves search, filters and pagination; navigation is disabled while a decision is saving. `interactive.test.tsx` covers this sequential flow.

Public UI: `SubmitComplaint`, `TrackComplaint`, `OfficerDashboard({departments})`. `ComplaintDetail` shows understanding, `ThinkingTimeline` step-by-step active cognitive reasoning progression, `OfficerSummaryCard` 10-second rapid triage grid with 1-click decision note pre-fill, `EvidenceHighlight` phrase-level translation and reasoning bridge, `SelfVerificationCard` dual-AI critic consensus and hallucination elimination, `ConfidenceMeter` multi-bar certainty metrics with threshold auto-routing guidance, `DecisionTree` explainable 6-step AI reasoning visualization, original evidence for officers, confidence, review status and timeline. `useRecorder` manages microphone permission, recording duration, timers and stream cleanup.

Submission opens directly on the input form without a promotional banner or journey panel. `intake.css` scopes the responsive styling to this screen. Example cards fill and focus the editor, highlight an exact sample match, and allow immediate editing; they never submit or invent inference. Native expandable writing tips explain location, duration, and impact. `intake.test.tsx` covers sample selection, focus, editing, and draft preservation across input modes.

Submitting replaces the form with the analysis loading screen and saved result. `AnalysisPanel` presents real loading/result states with `ThinkingTimeline` displaying step-by-step cognitive progress during analysis. New complaint returns to a cleared form; network errors return to the form with the input and retry key preserved. `samples.ts` contains synthetic input examples only. Optional `SubmitComplaint.onTrack(id)` opens `TrackComplaint({initialId})`, which fetches that receipt automatically. Routing explanations expand with native disclosure controls.

`AudioActivity` optionally meters the recorder's actual MediaStream through Web Audio. It owns sampling/context cleanup, while `useRecorder` retains stream ownership. Recording still works if metering is unavailable. Manual classification requires explicit department selection.

Native upload selection is cleared after capturing the File so a new complaint may select the same file. Failed recorder instances stop and cannot publish partial audio; stale generation callbacks cannot affect replacement recordings. These paths have UI regressions. Browser/live evidence and remaining permission-dependent checks: `docs/test-results/interactive-workspace.md` at the repository root.

`api.ts` provides named operations through `shared/request.ts`; `types.ts` matches `contracts/openapi.json`. Submissions reuse keys on network retries; officers submit versions. Tracking/queue requests cancel stale responses. Secrets and AI calls remain on the backend.

Dependencies: React, locally owned shadcn/ui Button, Lucide, shared request client. Recording needs HTTPS or localhost plus browser microphone support; uploads remain available. Accessible labels and input/loading/error/success/empty states are included.

Verify in `frontend`: `npm test`, `npm run build`, `npm run format:check`. Tests cover preserved text and tracking, missing IDs, and versioned routing via controlled HTTP responses. Inspect desktop/mobile layouts with Vite proxying the API on port 8000.

Current review notices and future-review fallback wording apply only before officer routing. Routed/in-progress/resolved complaints show completed review wording when no AI analysis exists; the original inference failure remains in the audit timeline. A UI regression test covers manually resolved complaints.

Department routing is visible before formal text and explanations. `formalComplaint.ts` formats copyable staff text, reference, priority and recommended/approved routing; unavailable analysis cannot create a formal translation. Officers confirm supporting departments with checkboxes and cannot duplicate the primary. Queue filters select department, primary/secondary role and category; failed filter requests clear stale results. Approved supporting assignments appear in tracking and timeline. `routing.test.tsx` covers these flows and removal of fabricated phrase translations. Live evidence: `docs/test-results/routing-quality.md`.
