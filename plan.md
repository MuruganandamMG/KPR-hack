# ACIE Implementation Plan

**Goal:** Deliver the PRD's hackathon prototype: multilingual text/voice intake, explainable Gemini analysis, validated officer routing, immutable originals, and citizen tracking.

**Architecture:** One React/TypeScript/Vite/Tailwind frontend and one FastAPI backend. SQLite stores complaints, original audio, validated AI results, and append-only status events. A dedicated AI gateway uses Gemini; SQLAlchemy handles persistence and Pydantic validates boundaries. Docker serves the built frontend and API together.

**Spec:** `PRD.md`, with the scope resolutions below. Work is authorized by the user's request to plan and implement. Execute inline; retain changes in the shared workspace for review.

## Scope resolutions and acceptance criteria

- Repository instructions take precedence over PRD provider differences: Gemini only; no Grok integration or claim of provider failover. Retry malformed or transient Gemini responses once, then preserve the complaint for manual review.
- Authentication/RBAC and actual government integration remain out of scope. Officer endpoints are prototype endpoints and must not be exposed to real citizen data without access controls.
- Indian languages, dialects, spelling errors, and mixed-language input are sent unchanged to Gemini. Language coverage and accuracy are model capabilities to evaluate, not guaranteed by code.
- Accept text of 3–5000 nonblank characters. Voice is limited to 10 MiB and 120 seconds, normalized by FFmpeg into WAV for inference; retain uploaded bytes and original transcript.
- Every accepted complaint is persisted with an unpredictable `GRV-<year>-<random>` tracking ID before AI analysis. Idempotency keys prevent duplicate submissions and reject reuse with different content.
- AI output must match a strict schema: transcript, normalized English administrative complaint, detected language/dialect, category, intent, primary/secondary department, urgency, confidence [0,1], keywords, meaning, and concise decision explanation. Do not request private chain-of-thought.
- Department names belong to a server allowlist. Category/department mismatches, ambiguous categories, and confidence below 0.75 require human review. All routing is approved by an officer; AI never executes routing.
- Store originals immutably. Status changes and routing decisions add audit events atomically. Version checks reject stale officer updates.
- Citizen interface: text/voice intake, loading/error states, analysis result, tracking ID, status timeline. Officer interface: searchable/filterable queue, original/transcript and recommendation details, department override with a reason, route approval, and progress/resolution updates.
- Render/Docker configuration is provided, not deployed. SQLite requires persistent storage. No fabricated demo inference or measured accuracy claims.

## Feature and interface map

| Responsibility | Backend | Frontend |
| --- | --- | --- |
| Intake, analysis, storage, tracking, officer review | `backend/app/features/complaints/` | `frontend/src/features/complaints/` |
| Gemini adapter and inference schema | `backend/app/features/civic_intelligence/` | Analysis presentation inside complaints |
| Configuration/database/transport | `backend/app/shared/` | `frontend/src/shared/` |
| Cross-boundary specification | `contracts/openapi.json` (generated from FastAPI) | TypeScript types and API module |

API operations: `POST /api/complaints` (JSON text), `POST /api/complaints/voice` (multipart audio), `GET /api/complaints` (paginated officer queue), `GET /api/complaints/{tracking_id}`, `PATCH /api/complaints/{tracking_id}` (versioned officer decision), `GET /api/complaints/{tracking_id}/audio`, `GET /api/meta`, `GET /api/health`. Error responses use `detail`; invalid inputs 422, missing records 404, stale updates/idempotency conflicts 409, invalid audio 422, oversized audio 413. Accepted complaints return 201 even when analysis fails, with explicit `analysis_failed` state and explanation.

Statuses: `received → awaiting_review | analysis_failed → routed → in_progress → resolved`. Manual routing of failed analysis is permitted with department and reason. No silent regression of status. Review threshold is server configuration. Confidence is an uncalibrated model estimate, not a probability guarantee.

## Review focus

1. Wrong or malformed AI output cannot assign an unsupported department or bypass review.
2. Double-clicks/network retries cannot create duplicate complaints; key reuse with different content returns 409.
3. AI failure cannot lose original text/audio or leave the citizen without a tracking ID.
4. Simultaneous officer updates cannot overwrite decisions or mutate original evidence.
5. Invalid, oversized, or overlong audio cannot bypass validation; microphone denial and recording cleanup have usable UI behavior.

## Task 1: Complaint intake and civic inference

- [x] Establish manifests, central configuration, versioned SQLite migration, inference schema, and feature folders.
- [x] Cover malformed recommendations, threshold rules, preserved inputs/provider failure, idempotency and text validation.
- [x] Implement Gemini gateway with JSON schema generation and one bounded retry; verify with controlled HTTP transport.
- [x] Implement repository/service, text/voice handlers, audio normalization, and immutable original protection.
- [x] Verify full backend suite.

## Task 2: Officer workflow and citizen tracking

- [x] Cover routing, mandatory notes, legal transitions, stale/concurrent versions, unknown IDs, pagination and audit history.
- [x] Implement named queue/get/update/audio operations using transactions and explicit schemas.
- [x] Generate `contracts/openapi.json`; document public interfaces and feature ownership.
- [x] Verify the backend suite and contract generation.

## Task 3: Frontend and packaging

- [x] Add typed request client and complaint API operations outside components.
- [x] Build responsive citizen intake/tracking and officer queue/detail, accessible controls and state feedback, audio upload and MediaRecorder cleanup.
- [x] Add UI tests for submission/retries, tracking errors, routing, pending/cancelled microphone acquisition and stale permission failures.
- [x] Add Docker/Render files, safe environment examples, setup/feature map and evaluation fixtures/instructions.
- [x] Verify automated tests/build, review code independently, and fix substantive findings.
- [x] Inspect browser rendering at desktop/mobile sizes and exercise text intake, tracking and the complete manual officer workflow. Evidence: `docs/test-results/browser-check.md`.

## Completion evidence

Automated verification: 31 backend tests; 8 frontend tests; TypeScript/Vite production build; Ruff lint/format; Prettier; npm audit (zero vulnerabilities); OpenAPI generation and Git whitespace review. Independent review found unsafe upload MIME replay and microphone permission/cleanup races; reproduced with failing regression checks and fixed. Original audio is now served using a container-derived allowlisted MIME. Browser testing also discovered stale future-review wording after manual resolution; a failing UI regression was added, the wording was fixed, and the live resolved screen was rechecked. A subsequent backend regression verifies root environment/data/frontend configuration from other launch directories.

Gemini is now configured after fixing root `.env` loading and updating the unavailable old model to `gemini-3.8-flash`. Live requests currently return Google's temporary HTTP 503 high-demand response, including on an account-exposed alternative model; no successful live interpretation/accuracy is claimed. Evidence: `docs/test-results/gemini-configuration.md`. Audio tests run real FFmpeg decoding with a controlled inference gateway. Desktop/mobile testing passed via Edge at `localhost:5173`, including intake, not-found tracking, manual routing, progress and resolution. Hardware recording, browser upload, Docker runtime and Render deployment remain unverified. Browser upload requires the extension's file URL permission, which was not changed; Docker is unavailable. One upstream Starlette/httpx TestClient deprecation warning remains; all automated tests pass.
