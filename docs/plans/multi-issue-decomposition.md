# Multi-issue and implicit grievance decomposition

Extend the existing complaints and civic_intelligence features, preserving the current React/FastAPI/Gemini/SQLite stack and officer approval gate.

## Behavior and contract
- Gemini returns 1–10 independent issues, with stable issue IDs, normalized complaint, category, department, urgency, confidence, explanation, explicit/implicit basis, verbatim evidence and optional related issue IDs/relationship explanation.
- Health/Public Health is supported for reported illness. Do not infer diagnoses or invent causality. No disaster-management policy is configured, so optional flood assessment is excluded.
- Existing analysis fields remain compatible. Old stored records without issues continue as single tickets. New Gemini responses must contain issues; invalid decomposition saves the original for manual review.
- A multi-issue submission remains the parent receipt. Create one child per issue in the same transaction as analysis, with its own tracking ID, recommendation, review flag, version and audit history. Implicit issues always require verification, and parent review state includes flagged children. One-issue submissions remain one actionable ticket whose issue fields determine routing and review. Compatible existing enhancements are retained.
- Parent linkage and issue metadata are immutable. Children reference original evidence on their parent; do not duplicate audio. Replaying intake does not create additional children. Child persistence errors roll back decomposition and leave an actionable manual-review original when fallback persistence is available.
- GET receipt includes current child records. Department queues show actionable children rather than the parent. Decisions operate on individual tickets. Parent status is derived from child progress (resolved only when all are resolved).
- Citizen submission/tracking displays all child tickets, evidence, relationships and progress. Child IDs can be tracked directly; officers continue using existing decision controls.

## Integration points
AI schema/prompt/adapter; complaints schema/service/repository; migration 003 and migration registry; generated OpenAPI and TypeScript types; ComplaintDetail and TrackComplaint; feature/root documentation. Preserve existing uncommitted edits. No new dependency.

## Acceptance and verification
Controlled inference through real FastAPI and temporary SQLite: explicit three-way decomposition, implicit health concern, related issues, independent child routing/resolution, parent aggregation, evidence/audio retrieval, idempotency, malformed/unsupported/duplicate output, low confidence and provider failure. Verify old records/migrations and existing single-issue behavior. UI tests verify linked progress and navigation; inspect browser desktop/mobile. Run pytest, Ruff, frontend tests/build/format and export contract. Live Gemini accuracy remains a separate check using synthetic labeled inputs, dependent on credentials/service availability.
