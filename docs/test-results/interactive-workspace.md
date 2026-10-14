# Interactive MVP verification

Date: 2026-10-14. The workspace separates citizen input from real AI analysis. No example output is substituted for inference.

## Implemented

- Compact prototype header, responsive editor/analysis layout and concise copy.
- Road/water/drainage sample chips that populate text without submitting.
- Real empty/loading/receipt states; submitted originals remain locked until New complaint.
- Expandable department explanations and Track progress opening the saved ID automatically.
- Optional activity meter based on real microphone samples, with Web Audio cleanup.
- Explicit department selection for manual classification.

## Bugs fixed

- Persistent upload inputs prevented choosing the same file after New complaint. The selected File is captured and the native input cleared; regression observed failing then passing.
- A failed recorder could remain active, and its late stop callback could disrupt replacement state. Failure now stops the instance, rejects partial output, and callbacks validate their generation. Regression observed failing then passing; independently reviewed.

## Automated evidence

- `npm test`: 14 passed.
- `npm run build`: passed, including TypeScript.
- `npm run format:check`: passed.
- `npm audit`: zero vulnerabilities.
- `python -m pytest`: 31 passed; real temporary SQLite and FFmpeg, with controlled inference.
- Ruff and Git whitespace checks passed. One upstream Starlette/httpx TestClient deprecation warning remains.

## Live evidence

Using the user's configured `gemini-3.5-flash-lite` through the real backend:

- Tamil road sample normalized into “The road is in very bad condition with large potholes on our street.” Validated department Public Works, Medium urgency, model confidence estimate 0.95.
- Text record `GRV-2026-d8506f2bae594787a749e946eb7e5c08` passed browser submission, expandable explanation, automatic tracking, officer routing, in-progress and resolution. Original text remained unchanged; citizen tracking displayed the same status and audit notes.
- A synthetic spoken English road complaint generated with Windows speech synthesis passed the real voice endpoint, received a correct transcript and Public Works recommendation. Original retrieved WAV bytes matched exactly. Voice record: `GRV-2026-303e4ebb380d4188a2986f634553b7b9` (awaiting officer review).
- Mobile at 390 × 844 showed stacked panels/sample controls with no horizontal overflow. Short desktop at 1280 × 686 showed no horizontal overflow and a submit button fully within the viewport (bottom 677 px). Temporary viewport overrides were reset.

These are two checked examples, not an accuracy benchmark or language-coverage claim. Future provider failures still preserve receipts for manual review.

## Screenshots

- [Final workspace](interactive-workspace.jpg)
- [Live analysis and explanation](interactive-analysis.jpg)
- [Mobile](interactive-mobile.jpg)

## Partially verified

Physical microphone capture and browser file-picker upload remain unverified. The browser extension rejects file upload until its Allow access to file URLs setting is enabled. No permission setting was changed or bypassed. Backend voice ingestion/inference/storage and same-file UI behavior were verified separately. Meter hardware readings require a permitted microphone session.
