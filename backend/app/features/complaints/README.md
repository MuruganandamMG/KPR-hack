# Complaints

`router.py` is the feature's public interface registered by `app/main.py`: text/voice creation, paginated queue, tracking, versioned decisions and original audio. Exact schemas: `contracts/openapi.json`.

`schemas.py` validates inputs. `service.py` saves before calling the AI gateway. `repository.py` owns SQLAlchemy/SQLite reads, transactional decisions, idempotency and audit events. `audio.py` validates containers/duration and converts to mono 16 kHz WAV through FFmpeg. Uploaded bytes remain unchanged in SQLite.

Original fields and events are protected by SQLite triggers. Tracking IDs use UUID entropy. Creation requires an `Idempotency-Key` header of 8–128 letters, digits, underscores or hyphens. Replays return the same complaint; key reuse with different content returns 409. Accepted submissions return 201 even if analysis fails. Every recommendation awaits officer approval. Routing requires department and note; subsequent transitions are routed → in_progress → resolved. Stale versions return 409.

Dependencies: civic intelligence public gateway/schema, shared configuration/database, FastAPI, SQLAlchemy, FFmpeg. Verify: `.venv/Scripts/python -m pytest backend/app/features/complaints`. Tests use real temporary SQLite databases and audio conversion with a controlled test AI gateway.

Schema version 1 is installed transactionally from `shared/migrations/001_complaints.sql`; unknown future versions are rejected. Back up with SQLite's backup API before future migrations; copying just the database during WAL writes is unsafe. Stored audio enlarges backups; this prototype does not implement a high-volume archive.
