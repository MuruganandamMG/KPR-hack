# Complaint workflows

Public UI: `SubmitComplaint`, `TrackComplaint`, `OfficerDashboard({departments})`. `ComplaintDetail` shows understanding, `EvidenceHighlight` phrase-level translation and reasoning bridge, `DecisionTree` explainable 6-step AI reasoning visualization, original evidence for officers, confidence, review status and timeline. `useRecorder` manages microphone permission, recording duration, timers and stream cleanup.

Submission uses a responsive editor/analysis workspace. `samples.ts` contains synthetic input examples only; sample chips never submit or invent inference. `AnalysisPanel` presents real empty/loading/result states. Submitted originals remain locked until New complaint. Optional `SubmitComplaint.onTrack(id)` opens `TrackComplaint({initialId})`, which fetches that receipt automatically. Routing explanations expand with native disclosure controls.

`AudioActivity` optionally meters the recorder's actual MediaStream through Web Audio. It owns sampling/context cleanup, while `useRecorder` retains stream ownership. Recording still works if metering is unavailable. Manual classification requires explicit department selection.

Native upload selection is cleared after capturing the File so a new complaint may select the same file. Failed recorder instances stop and cannot publish partial audio; stale generation callbacks cannot affect replacement recordings. These paths have UI regressions. Browser/live evidence and remaining permission-dependent checks: `docs/test-results/interactive-workspace.md` at the repository root.

`api.ts` provides named operations through `shared/request.ts`; `types.ts` matches `contracts/openapi.json`. Submissions reuse keys on network retries; officers submit versions. Tracking/queue requests cancel stale responses. Secrets and AI calls remain on the backend.

Dependencies: React, locally owned shadcn/ui Button, Lucide, shared request client. Recording needs HTTPS or localhost plus browser microphone support; uploads remain available. Accessible labels and input/loading/error/success/empty states are included.

Verify in `frontend`: `npm test`, `npm run build`, `npm run format:check`. Tests cover preserved text and tracking, missing IDs, and versioned routing via controlled HTTP responses. Inspect desktop/mobile layouts with Vite proxying the API on port 8000.

Current review notices and future-review fallback wording apply only before officer routing. Routed/in-progress/resolved complaints show completed review wording when no AI analysis exists; the original inference failure remains in the audit timeline. A UI regression test covers manually resolved complaints.
