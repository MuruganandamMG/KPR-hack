CREATE TABLE complaints (
    tracking_id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL,
    input_type TEXT NOT NULL CHECK(input_type IN ('text','voice')),
    original_text TEXT,
    original_audio BLOB,
    audio_mime TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL,
    analysis_json TEXT,
    analysis_error TEXT,
    requires_review INTEGER NOT NULL DEFAULT 1,
    review_reason TEXT NOT NULL DEFAULT '',
    assigned_department TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    analysis_ms INTEGER
);
CREATE TABLE complaint_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id TEXT NOT NULL REFERENCES complaints(tracking_id),
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    department TEXT,
    note TEXT NOT NULL
);
CREATE INDEX complaint_status_idx ON complaints(status, created_at);
CREATE TRIGGER preserve_original BEFORE UPDATE OF original_text, original_audio, audio_mime,
    input_type, tracking_id, created_at, idempotency_key, fingerprint ON complaints
BEGIN SELECT RAISE(ABORT, 'Original complaint evidence is immutable'); END;
CREATE TRIGGER preserve_complaint BEFORE DELETE ON complaints
BEGIN SELECT RAISE(ABORT, 'Complaints cannot be deleted'); END;
CREATE TRIGGER preserve_event_update BEFORE UPDATE ON complaint_events
BEGIN SELECT RAISE(ABORT, 'Audit events are append-only'); END;
CREATE TRIGGER preserve_event_delete BEFORE DELETE ON complaint_events
BEGIN SELECT RAISE(ABORT, 'Audit events are append-only'); END;
