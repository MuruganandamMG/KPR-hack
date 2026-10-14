# Complaint workflows

Public UI: `SubmitComplaint`, `TrackComplaint`, `OfficerDashboard({departments})`. `ComplaintDetail` shows understanding, original evidence for officers, confidence, review status and timeline. `useRecorder` manages microphone permission, recording duration, timers and stream cleanup.

`api.ts` provides named operations through `shared/request.ts`; `types.ts` matches `contracts/openapi.json`. Submissions reuse keys on network retries; officers submit versions. Tracking/queue requests cancel stale responses. Secrets and AI calls remain on the backend.

Dependencies: React, locally owned shadcn/ui Button, Lucide, shared request client. Recording needs HTTPS or localhost plus browser microphone support; uploads remain available. Accessible labels and input/loading/error/success/empty states are included.

Verify in `frontend`: `npm test`, `npm run build`, `npm run format:check`. Tests cover preserved text and tracking, missing IDs, and versioned routing via controlled HTTP responses. Inspect desktop/mobile layouts with Vite proxying the API on port 8000.

Current review notices and future-review fallback wording apply only before officer routing. Routed/in-progress/resolved complaints show completed review wording when no AI analysis exists; the original inference failure remains in the audit timeline. A UI regression test covers manually resolved complaints.
