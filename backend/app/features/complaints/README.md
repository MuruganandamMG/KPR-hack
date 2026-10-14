# Complaints

`router.py` is the feature's public interface registered by `app/main.py`: text/voice creation, paginated queue, tracking, versioned decisions and original audio. Exact schemas: `contracts/openapi.json`.

`schemas.py` validates inputs. `service.py` saves before calling the AI gateway. `repository.py` owns SQLAlchemy/SQLite reads, transactional decisions, idempotency and audit events. `audio.py` validates containers/duration and converts to mono 16 kHz WAV through FFmpeg. Uploaded bytes remain unchanged in SQLite.

Original fields and events are protected by SQLite triggers. Tracking IDs use UUID entropy. Creation requires an `Idempotency-Key` header of 8–128 letters, digits, underscores or hyphens. Replays return the same complaint; key reuse with different content returns 409. Accepted submissions return 201 even if analysis fails. Every recommendation awaits officer approval. Routing requires department and note; subsequent transitions are routed → in_progress → resolved. Stale versions return 409.

Dependencies: civic intelligence public gateway/schema, shared configuration/database, FastAPI, SQLAlchemy, FFmpeg. Verify: `.venv/Scripts/python -m pytest backend/app/features/complaints`. Tests use real temporary SQLite databases and audio conversion with a controlled test AI gateway.

Routing accepts optional `secondary_departments`. Explicit `[]` removes supporting recommendations; omission on initial approval retains AI secondaries except the selected primary. Approved supporting assignments are returned as `assigned_secondary_departments` and each routing/progress event records `secondary_departments`. Duplicates, primary overlap and assignment changes after approval are rejected. Queue supports `department`, `department_role=primary|secondary` (requires department), and `category`; filters run before counting/pagination. Approved assignments take precedence over recommendations.

Schema versions 1 and 2 are installed transactionally from `shared/migrations/001_complaints.sql` and `002_secondary_routing.sql`; unknown future versions are rejected. Version 1 records/events receive empty supporting assignments because historical approval did not capture secondary departments. Back up with SQLite's backup API before upgrading; copying just the database during WAL writes is unsafe. Restore the backup with the older application for recovery. Stored audio enlarges backups; this prototype does not implement a high-volume archive.
