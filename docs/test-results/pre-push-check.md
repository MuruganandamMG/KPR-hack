# Pre-push verification

Date: 2026-10-14. Configured AI model: `gemini-3.5-flash-lite`.

## Passed

- Backend: 31 pytest tests, Ruff lint, and Ruff format checks.
- Python dependency consistency: `pip check` reported no broken requirements.
- Frontend: 8 Vitest tests, TypeScript/production build, and Prettier checks.
- Frontend dependency audit: zero reported vulnerabilities.
- Stored OpenAPI contract matches the application's generated schema.
- Live text submission through the frontend API proxy classified a colloquial road complaint as Public Works. Tracking, unchanged original wording, idempotent submission replay, officer routing/start/resolution, audit events, and stale-version rejection were verified.
- Live voice submission used locally synthesized English speech about missing water supply. Gemini recommended Water Supply; retrieval preserved the original WAV bytes exactly. This verifies the upload/inference path without claiming a physical microphone test.
- Commit candidates were checked for the configured API key, Google API key patterns, private-key markers, and accidental database/dependency/build files. The local `.env` and generated SQLite files are ignored.

Synthetic text record: `GRV-2026-972de84700a347acab6b05d0737a5c11` (resolved). Synthetic voice record: `GRV-2026-b0119c694f5048bdb2a9f7455650bd88` (awaiting officer review). Existing citizen complaints were not changed.

## Limits

- Docker is not installed in this environment, so container build and runtime were not verified.
- Physical microphone recording and live dialectal voice recognition were not tested in this run.
- Successful text and synthesized-voice examples are smoke checks, not a benchmark of dialect coverage or routing accuracy.
- Pytest reported one existing FastAPI/Starlette TestClient deprecation warning; all tests passed.
- No hosted Render deployment or real municipal integration was verified.
