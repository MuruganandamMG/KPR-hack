# ACIE · AI Civic Intelligence Engine

A hackathon prototype for multilingual text/voice complaints, explainable Gemini analysis, officer-approved routing and citizen tracking. Read [PRD.md](PRD.md) and [plan.md](plan.md). Gemini is the sole provider under the repository stack rule; PRD Grok failover is deferred.

## Local setup

Requires Python 3.12+ and Node.js 22.12+. From root on Windows:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements-dev.txt
Copy-Item .env.example .env
# Edit .env and set GEMINI_API_KEY on the server.
.venv/Scripts/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

For development with the virtual environment activated, run this from `D:\code-vault`:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload --reload-dir backend
```

`--app-dir backend` adds the backend folder to Python's import path, including the reload subprocess. The application uses `app.*` imports, so both `app.main:app` without `--app-dir backend` and `backend.app.main:app` fail when started from the repository root. The server loads the project's root `.env`; relative database and frontend paths are also resolved from the project root. Process environment variables override `.env`. Restart the backend after editing `.env`, then refresh the browser; Python-only reload watching does not automatically reload `.env` changes.

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`; Vite proxies `/api` to FastAPI. API docs: `http://127.0.0.1:8000/docs`. Unix: substitute `.venv/bin/python`. FFmpeg is bundled by imageio-ffmpeg; system FFmpeg is preferred and `FFMPEG_PATH` can override it.

Without a Gemini key, accepted complaints are saved with tracking IDs and marked for manual officer review. The UI clearly shows analysis is unavailable. No fabricated AI is used. The default model is `gemini-3.5-flash-lite`; the local `.env`, server default, example environment, and Render configuration use this model. Restart the backend after changing `GEMINI_MODEL`. See the official [Gemini 3.5 Flash-Lite reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

## Feature map

| Feature | Backend | Frontend |
| --- | --- | --- |
| Intake, tracking, routing, audit | `backend/app/features/complaints/` | `frontend/src/features/complaints/` |
| Gemini inference/validation | `backend/app/features/civic_intelligence/` | Analysis in complaints |
| Shared configuration/database/transport/UI | `backend/app/shared/` | `frontend/src/shared/` |

Exact contract: [contracts/openapi.json](contracts/openapi.json). Feature READMEs document interfaces/tests. Text limit: 5000 characters. Voice: 10 MiB/120 seconds. Confidence is an uncalibrated model estimate. Every route requires officer approval. Immutable evidence, append-only audit events, submission idempotency and optimistic officer versions protect records.

Primary and secondary assignments are approved and audited together. Officer queues filter by department, routing role and category. Formal complaint text can be copied for staff with routing approval clearly identified. SQLite migration 002 upgrades existing records without inventing historical secondary approvals; back up using SQLite's backup API before upgrading. Verification and AI limitations: [routing quality report](docs/test-results/routing-quality.md).

## Verification

```powershell
.venv/Scripts/python -m pytest
.venv/Scripts/python -m ruff check backend scripts
.venv/Scripts/python -m ruff format --check backend scripts
cd frontend
npm test
npm run build
npm run format:check
npm audit
```

Tests use temporary databases and controlled AI responses, not billable API calls. See [docs/evaluation.md](docs/evaluation.md) for live dialect/routing/timing evaluation. Mocked tests do not prove language coverage or AI accuracy.

## Docker and Render

```powershell
docker build -t acie .
docker run --rm -p 8000:8000 --env-file .env -e DATABASE_PATH=/app/data/acie.db -v acie-data:/app/data acie
```

Docker serves frontend/API together on port 8000. `render.yaml` defines a single Docker service with a persistent disk; it is configuration, not an existing deployment. Set `GEMINI_API_KEY` in Render. Paid persistent storage preserves SQLite across redeployments; use one instance and SQLite's backup API. See [Render disks](https://render.com/docs/disks) and [Docker deployment](https://render.com/docs/docker).

Authentication/RBAC and real government integration remain out of scope. Use synthetic demo data; deployment with real data requires access controls and privacy/operational validation. Text/audio is sent to Gemini for inference. See official [audio](https://ai.google.dev/gemini-api/docs/audio) and [structured JSON](https://ai.google.dev/gemini-api/docs/structured-output) references.
