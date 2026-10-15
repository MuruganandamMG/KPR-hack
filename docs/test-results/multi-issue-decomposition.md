# Multi-issue grievance decomposition verification

Date: 2026-10-15. Synthetic inputs only; no production complaints or citizen information. Implementation plan: `docs/plans/multi-issue-decomposition.md`.

## Automated verification

- `.venv/bin/python -m pytest -q`: 63 passed. One existing Starlette/httpx deprecation warning; no test failures.
- Backend checks use real FastAPI requests and temporary SQLite databases with controlled inference. Coverage includes three explicit issues, implicit Health work, category/department/confidence/evidence validation, unknown relationships and duplicates, parent/child tracking and department queues, independent routing and resolution, review aggregation, submission replay, shared voice evidence, immutable links, legacy migration rollback on child-insert failure, manual recovery after persistence failure, and canonical single-issue routing/review when summary fields disagree.
- `npm test --prefix frontend`: 66 passed across 7 files. The new tests cover linked progress, explicit/implicit labels, evidence and related child IDs, child tracking, and returning to the parent receipt. Existing intake, officer, routing and localization checks remain green.
- `npm run build --prefix frontend`: passes TypeScript and Vite production build.
- `.venv/bin/python -m ruff check backend scripts`, `.venv/bin/python -m ruff format --check backend scripts`, `npm run format:check --prefix frontend`, and `git diff --check`: pass.
- `npm audit` in `frontend`: 0 vulnerabilities.
- `PYTHONPATH=backend .venv/bin/python scripts/export_contract.py`: regenerated OpenAPI. TypeScript types and consumers were updated together.

## Live Gemini and API/persistence checks

Used the configured server-side Gemini model through the real submission endpoint and temporary databases, rather than substituting controlled responses. Human-specified expected department sets were compared with returned issue departments. Each receipt was retrieved and replayed with its original idempotency key; all four retrievals/replays matched and no duplicate children appeared.

| Synthetic input | Expected / observed routes | Linked child count |
| --- | --- | --- |
| Damaged road, failed streetlights, garbage uncollected for four days | Public Works, Electricity, Sanitation | 3 |
| Rainwater entering house with blocked drain and broken road | Drainage, Public Works | 2 |
| No water, reliance on reportedly contaminated borewell water, children getting sick | Water Supply, Health | 2 |
| Repaired road, working lights, no illness; only garbage collection stopped | Sanitation | 0 (single actionable receipt) |

All observed route sets matched this small labeled sample. This is a smoke check, not a routing-accuracy/dialect benchmark. Confidence remains an uncalibrated model estimate.

The first live run invented a shared location for co-reported faults and overstated water/illness causality. Prompt tightening removed the location assumption and produced a cautious normalized health complaint and an implicit Health issue in the second run. However, its relationship explanation still said alternate water sources were “leading to illness,” and its explanation mixed unverified causality with causal wording. Verbatim evidence/structural validation does **not** guarantee semantic correctness. Implicit issues now always require officer verification of evidence and relationships, regardless of model confidence; all tickets require officer routing approval. No diagnosis or causality guarantee is claimed. Further human-labeled multilingual/voice evaluation remains outstanding.

A focused independent code review found mismatched single-issue summary routing and a stuck receipt after child persistence failure. Both were reproduced, fixed and regression-tested; follow-up review confirmed the fixes with 12 decomposition tests passing.

## Browser and operational limits

A temporary API served the real built frontend and synthetic linked receipt. Browser access to `http://127.0.0.1:8788` was rejected because permission was declined. No alternate browser or workaround was attempted. Desktop/mobile visual inspection and a browser-driven intake → routing → tracking flow remain unverified. UI interaction tests and backend HTTP/persistence tests passed separately.

Voice conversion, unchanged original bytes and child audio retrieval were verified with synthetic WAV and controlled inference, not live speech recognition. New static catalog entries preserve all supported languages/interpolation; native-speaker review was not performed.

Migration 003 is additive and leaves old records as single complaints; back up SQLite before upgrading. Recovery to an older application requires restoring the pre-migration backup. Simulated storage failure proves no partial child tickets or child audit events commit. When SQLite can still save the fallback state, the original receipt becomes `analysis_failed` with a useful error, accepted HTTP 201, idempotent replay and successful manual officer routing. A persistent database outage can still prevent saving that fallback state. Existing authentication/government integration remain outside the prototype scope.
