# Interactive MVP workspace

User direction: implement the proposed input-to-analysis workspace, keep the interface neat and concise, and find/fix relevant workflow bugs. Preserve existing inference, routing, persistence, and audit safeguards; no guarantee of judging results or model accuracy.

## Acceptance

- Compact ACIE header with a visible MVP prototype label; full-width, responsive work area without slogans, promotional sidebar or repeated footer copy.
- Submission editor beside analysis on desktop; stacked on mobile. Balanced input height rather than a viewport-sized empty textarea.
- Three labeled synthetic text samples fill the editor without submitting. Editing, resetting and switching input methods remain safe during pending requests/recording.
- Analysis pane displays empty/loading/success/failure truthfully, preserving tracking IDs on unavailable inference. Successful submission locks its original input until New complaint is selected.
- Track progress opens citizen tracking with the received ID and fetches its current status.
- Voice uses the existing recorder/upload limits and optional actual Web Audio activity feedback. Timer, stream, activity sampling and late callbacks are cleaned up. No synthetic waveform or inferred transcript is displayed as real evidence.
- Routing explanation can expand, while department, confidence, review reasons, original evidence and audit timeline remain available.
- Manual classification starts with an explicit department selection instead of silently defaulting to Water Supply.

## Files/interfaces

Frontend App (navigation and prefilled tracking), styles, complaints SubmitComplaint, AnalysisPanel, samples, TrackComplaint, useRecorder, ComplaintDetail and OfficerDashboard. Feature README and root feature map remain accurate. Existing API and backend schema are unchanged.

SubmitComplaint adds optional `onTrack(trackingId: string)`; TrackComplaint adds optional `initialId: string`; useRecorder exposes its owned `stream`. AudioActivity maps actual microphone samples to a meter in [0,1] and owns its sampling/context cleanup, keeping recording independent of metering availability. AnalysisPanel consumes complaint/pending state. Sample values are input examples only.

## Verification

Run existing plus targeted frontend regression tests, production build, formatting and backend suite. Inspect desktop/mobile in Edge; verify sample input, validation, result presentation and seeded tracking with synthetic complaints through the running API. Verify routing decisions and immutable originals with temporary test storage/controlled inference. Run an independent review and fix important findings. Live inference and actual microphone/file upload require available service and browser permissions; document results separately.

Completed: 14 frontend tests, 31 backend tests, build, formatting, audit and independent review. Live Gemini text and synthetic spoken audio succeeded; browser tracking/routing/resolution and responsive checks passed. Physical microphone and browser upload remain permission-dependent and partially verified. Detailed evidence: `docs/test-results/interactive-workspace.md`.
