# Translation and multi-department routing verification

Scope: strengthen the existing PRD FR-05/06/07/11/13/14/15 flow without changing the stack or adding government integrations.

## Behavior and acceptance

- Gemini produces faithful, professional administrative English: retain all reported issues, locations, durations, uncertainty and requested action; never add facts or claim work has occurred. Category describes the dominant issue, primary department owns it, and supporting departments have explicit evidence and necessary work.
- Results show recommended primary and all secondary departments before the detailed explanation, plus category/intent and a copyable formal complaint for staff. Approved assignments remain distinct from AI recommendations.
- Officers confirm or override primary and secondary departments. No duplicates or overlap; routing is atomic, versioned and recorded in append-only audit events. Progress updates cannot alter approved assignments.
- Department-wise queue filters include both primary and secondary involvement, with optional role and category filtering. Before approval use recommendations; after approval use assignments, never stale AI recommendations. Filters apply before pagination/counting.
- Provider failure still saves original evidence/tracking and permits explicit manual multi-department routing. No generated translation is displayed or copied when unavailable.

## Interfaces and affected folders

- `civic_intelligence/`: improve prompt and structured-output field descriptions without changing required analysis fields or invalidating stored results.
- `complaints/` backend: optional `OfficerDecision.secondary_departments`; additive `Complaint.assigned_secondary_departments` and `AuditEvent.secondary_departments`. Omission on initial routing keeps AI secondary recommendations excluding the selected primary; explicit empty list clears them. Existing routed records receive empty supporting assignments because earlier approval did not record them.
- Queue adds validated `department`, `department_role` (primary/secondary), and `category`; role requires a department. Preserve existing parameters/callers.
- Versioned migration 002 adds JSON arrays for assignments/events. Shared database bootstrap must apply versions 1 then 2 to new databases and upgrade existing version 1 transactionally. Preserve immutable evidence/events and reject unknown future versions. Back up SQLite via its backup API before upgrade; recovery uses the backup and earlier application, not destructive in-place rollback.
- Frontend `complaints/`: public routing display, formal-copy function/control, supporting-department selection, queue filters and typed API fields.
- Integration edits: shared migration runner, generated OpenAPI and feature documentation only. No new dependencies.

## Verification

Reproduce failures first. Run backend tests across real API/temporary SQLite (approval, overrides, manual fallback, retrieval, audit, conflicts, filters/pagination and version-1 upgrade). Run frontend regressions (prominent routes, copy, multi-assignment approval, primary-overlap prevention, category/role filters), full test/build/format checks, Ruff, contract regeneration and diff review. Inspect desktop/mobile via browser against real API. Evaluate live Gemini on synthetic formal, dialect, multilingual, misspelled, ambiguous and multi-department complaints; record failures and qualitative translation checks separately from controlled tests. Broad accuracy and hardware speech coverage require independent human labels.
