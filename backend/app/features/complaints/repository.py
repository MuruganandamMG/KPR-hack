import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from .schemas import Complaint


def now():
    return datetime.now(timezone.utc).isoformat()


def read_complaint(connection, tracking_id: str) -> Complaint:
    row = (
        connection.execute(
            text("SELECT * FROM complaints WHERE tracking_id=:id"), {"id": tracking_id}
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "Complaint not found. Check your tracking ID.")
    data = dict(row)
    data["analysis"] = json.loads(data.pop("analysis_json")) if data["analysis_json"] else None
    data["assigned_secondary_departments"] = json.loads(
        data.pop("assigned_secondary_departments_json")
    )
    events = (
        connection.execute(
            text(
                "SELECT timestamp,status,department,note,secondary_departments_json "
                "FROM complaint_events WHERE tracking_id=:id ORDER BY id"
            ),
            {"id": tracking_id},
        )
        .mappings()
        .all()
    )
    data["events"] = []
    for event in events:
        event_data = dict(event)
        event_data["secondary_departments"] = json.loads(
            event_data.pop("secondary_departments_json")
        )
        data["events"].append(event_data)
    return Complaint.model_validate(data)


def add_event(connection, tracking_id, status, note, department=None, secondary_departments=()):
    connection.execute(
        text(
            "INSERT INTO complaint_events(tracking_id,timestamp,status,department,note,"
            "secondary_departments_json) VALUES (:id,:at,:status,:department,:note,:secondary)"
        ),
        {
            "id": tracking_id,
            "at": now(),
            "status": status,
            "department": department,
            "note": note,
            "secondary": json.dumps(list(secondary_departments)),
        },
    )


def create_complaint(engine, *, key, fingerprint, original_text=None, audio=None, mime=None):
    timestamp = now()
    tracking_id = f"GRV-{timestamp[:4]}-{uuid4().hex}"
    try:
        with engine.begin() as db:
            db.execute(
                text("""INSERT INTO complaints(tracking_id,idempotency_key,fingerprint,
                input_type,original_text,original_audio,audio_mime,created_at,updated_at,status)
                VALUES(:id,:key,:fingerprint,:type,:original,:audio,:mime,:at,:at,'received')"""),
                {
                    "id": tracking_id,
                    "key": key,
                    "fingerprint": fingerprint,
                    "type": "voice" if audio is not None else "text",
                    "original": original_text,
                    "audio": audio,
                    "mime": mime,
                    "at": timestamp,
                },
            )
            add_event(
                db, tracking_id, "received", "Complaint received. Original evidence preserved."
            )
            return read_complaint(db, tracking_id), True
    except IntegrityError:
        with engine.connect() as db:
            existing = (
                db.execute(
                    text(
                        "SELECT tracking_id,fingerprint FROM complaints WHERE idempotency_key=:key"
                    ),
                    {"key": key},
                )
                .mappings()
                .first()
            )
            if existing is None:
                raise
            if existing["fingerprint"] != fingerprint:
                raise HTTPException(
                    409, "This submission key was already used for different content."
                ) from None
            return read_complaint(db, existing["tracking_id"]), False


def get_complaint(engine, tracking_id):
    with engine.connect() as db:
        return read_complaint(db, tracking_id)


def list_complaints(
    engine,
    *,
    status=None,
    search="",
    department=None,
    department_role=None,
    category=None,
    limit=25,
    offset=0,
):
    clauses = []
    params = {"limit": limit, "offset": offset}
    if category:
        clauses.append("json_extract(analysis_json, '$.category')=:category")
        params["category"] = category
    if department:
        # Once approved, assignments are authoritative; AI remains immutable evidence.
        primary = "COALESCE(assigned_department, json_extract(analysis_json, '$.primary_department'))=:department"
        secondary = """EXISTS (SELECT 1 FROM json_each(
            CASE WHEN assigned_department IS NOT NULL THEN assigned_secondary_departments_json
            ELSE json_extract(analysis_json, '$.secondary_departments') END
        ) WHERE value=:department)"""
        clauses.append(
            primary
            if department_role == "primary"
            else secondary
            if department_role == "secondary"
            else f"({primary} OR {secondary})"
        )
        params["department"] = department
    if status:
        clauses.append("status=:status")
        params["status"] = status
    if search:
        clauses.append(
            "(tracking_id LIKE :search OR original_text LIKE :search OR analysis_json LIKE :search)"
        )
        params["search"] = f"%{search}%"
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    with engine.connect() as db:
        total = db.execute(text("SELECT COUNT(*) FROM complaints" + where), params).scalar_one()
        ids = (
            db.execute(
                text(
                    "SELECT tracking_id FROM complaints"
                    + where
                    + " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
                ),
                params,
            )
            .scalars()
            .all()
        )
        return {
            "items": [read_complaint(db, id) for id in ids],
            "total": total,
            "limit": limit,
            "offset": offset,
        }


def save_analysis(engine, tracking_id, *, analysis, error, reason, elapsed_ms):
    status = "awaiting_review" if analysis else "analysis_failed"
    with engine.begin() as db:
        db.execute(
            text("""UPDATE complaints SET status=:status,analysis_json=:analysis,
            analysis_error=:error,requires_review=:review,review_reason=:reason,
            analysis_ms=:elapsed,updated_at=:at,version=version+1 WHERE tracking_id=:id AND status='received'"""),
            {
                "id": tracking_id,
                "status": status,
                "analysis": analysis.model_dump_json() if analysis else None,
                "error": error,
                "review": bool(reason) or analysis is None,
                "reason": reason,
                "elapsed": elapsed_ms,
                "at": now(),
            },
        )
        add_event(
            db,
            tracking_id,
            status,
            error or reason or "AI recommendation validated. Awaiting officer routing approval.",
        )
        return read_complaint(db, tracking_id)


def update_complaint(engine, tracking_id, decision):
    allowed = {
        "awaiting_review": "routed",
        "analysis_failed": "routed",
        "routed": "in_progress",
        "in_progress": "resolved",
    }
    with engine.begin() as db:
        record = read_complaint(db, tracking_id)
        if record.version != decision.version:
            raise HTTPException(
                409, "Another officer updated this complaint. Refresh before retrying."
            )
        if allowed.get(record.status) != decision.status:
            raise HTTPException(422, "Invalid status transition.")
        department = record.assigned_department
        secondary = record.assigned_secondary_departments
        if decision.status == "routed":
            if not decision.department:
                raise HTTPException(422, "Select a department before approving routing.")
            department = decision.department
            secondary = decision.secondary_departments
            if secondary is None:
                secondary = [
                    name
                    for name in (record.analysis.secondary_departments if record.analysis else [])
                    if name != department
                ]
        elif decision.department and decision.department != department:
            raise HTTPException(422, "Department cannot change after routing approval.")
        elif (
            decision.secondary_departments is not None
            and decision.secondary_departments != secondary
        ):
            raise HTTPException(422, "Secondary departments cannot change after routing approval.")
        if department in secondary:
            raise HTTPException(422, "Secondary departments cannot repeat the primary department.")
        result = db.execute(
            text("""UPDATE complaints SET status=:status,assigned_department=:department,
            assigned_secondary_departments_json=:secondary,
            requires_review=0,updated_at=:at,version=version+1 WHERE tracking_id=:id AND version=:version"""),
            {
                "id": tracking_id,
                "version": decision.version,
                "status": decision.status,
                "department": department,
                "secondary": json.dumps(secondary),
                "at": now(),
            },
        )
        if result.rowcount != 1:
            raise HTTPException(409, "This complaint was updated. Refresh before retrying.")
        add_event(db, tracking_id, decision.status, decision.note, department, secondary)
        return read_complaint(db, tracking_id)


def clarify_complaint(engine, tracking_id, clarification):
    with engine.begin() as db:
        record = read_complaint(db, tracking_id)
        if not record.analysis:
            raise HTTPException(422, "Complaint has no active analysis to clarify.")

        updated_analysis = record.analysis.model_copy(deep=True)
        updated_analysis.urgency = clarification.urgency
        if updated_analysis.smart_follow_up:
            updated_analysis.smart_follow_up.answered_option = clarification.selected_option
        if updated_analysis.officer_summary:
            updated_analysis.officer_summary.priority = clarification.urgency

        note = (
            f"Citizen Follow-Up Clarification: Confirmed scope as '{clarification.selected_option}'. "
            f"Urgency dynamically adjusted to {clarification.urgency}."
        )
        if clarification.note:
            note += f" Note: {clarification.note}"

        db.execute(
            text("""UPDATE complaints SET analysis_json=:analysis,
            updated_at=:at,version=version+1 WHERE tracking_id=:id"""),
            {
                "id": tracking_id,
                "analysis": updated_analysis.model_dump_json(),
                "at": now(),
            },
        )
        add_event(
            db,
            tracking_id,
            record.status,
            note,
            record.assigned_department,
            record.assigned_secondary_departments,
        )
        return read_complaint(db, tracking_id)


def get_audio(engine, tracking_id):
    with engine.connect() as db:
        row = db.execute(
            text("SELECT original_audio,audio_mime FROM complaints WHERE tracking_id=:id"),
            {"id": tracking_id},
        ).first()
        if row is None or row[0] is None:
            raise HTTPException(404, "Original audio not found.")
        return row[0], row[1]


def validate_complaint(engine, tracking_id: str, is_confirmed: bool):
    with engine.begin() as db:
        record = read_complaint(db, tracking_id)
        if not record.analysis:
            raise HTTPException(422, "Complaint has no active analysis to validate.")

        updated_analysis = record.analysis.model_copy(deep=True)
        if updated_analysis.citizen_validation:
            updated_analysis.citizen_validation.is_confirmed = is_confirmed
            updated_analysis.citizen_validation.confirmed_at = now()

        note = (
            "Citizen Validation Confirmed: Citizen officially verified AI grievance summary and recommended department."
            if is_confirmed
            else "Citizen Validation Flagged: Citizen indicated need for clarification or correction."
        )

        db.execute(
            text("""UPDATE complaints SET analysis_json=:analysis,
            updated_at=:at,version=version+1 WHERE tracking_id=:id"""),
            {
                "id": tracking_id,
                "analysis": updated_analysis.model_dump_json(),
                "at": now(),
            },
        )
        add_event(
            db,
            tracking_id,
            record.status,
            note,
            record.assigned_department,
            record.assigned_secondary_departments,
        )
        return read_complaint(db, tracking_id)


def complete_complaint_details(engine, tracking_id: str, field_name: str, value: str):
    with engine.begin() as db:
        record = read_complaint(db, tracking_id)
        if not record.analysis or not record.analysis.completeness:
            raise HTTPException(422, "Complaint has no active completeness analysis.")

        updated_analysis = record.analysis.model_copy(deep=True)
        found = False
        if updated_analysis.completeness:
            for item in updated_analysis.completeness.missing_fields:
                if item.field_name.lower() == field_name.lower():
                    item.is_missing = False
                    found = True
            present = sum(
                1 for item in updated_analysis.completeness.missing_fields if not item.is_missing
            )
            total = max(1, len(updated_analysis.completeness.missing_fields))
            updated_analysis.completeness.score = min(100, 20 + int((present / total) * 80))

        if not found:
            raise HTTPException(422, f"Unknown missing field '{field_name}'.")

        note = f"Citizen Added Missing Detail: '{field_name}' specified as '{value}'. Completeness raised to {updated_analysis.completeness.score}%."

        db.execute(
            text("""UPDATE complaints SET analysis_json=:analysis,
            updated_at=:at,version=version+1 WHERE tracking_id=:id"""),
            {
                "id": tracking_id,
                "analysis": updated_analysis.model_dump_json(),
                "at": now(),
            },
        )
        add_event(
            db,
            tracking_id,
            record.status,
            note,
            record.assigned_department,
            record.assigned_secondary_departments,
        )
        return read_complaint(db, tracking_id)


def ensure_dialect_table(db):
    db.execute(
        text("""CREATE TABLE IF NOT EXISTS community_dialects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE,
            meaning TEXT NOT NULL,
            category TEXT NOT NULL,
            region TEXT NOT NULL DEFAULT 'Tamil Regional Dialect',
            confirmed INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )""")
    )


def learn_dialect_word(
    engine,
    word: str,
    meaning: str,
    category: str,
    region: str = "Tamil Regional Dialect",
):
    with engine.begin() as db:
        ensure_dialect_table(db)
        db.execute(
            text("""INSERT INTO community_dialects (word, meaning, category, region, confirmed, created_at)
            VALUES (:word, :meaning, :category, :region, 1, :at)
            ON CONFLICT(word) DO UPDATE SET meaning=:meaning, category=:category, confirmed=1"""),
            {
                "word": word.strip().title(),
                "meaning": meaning.strip(),
                "category": category,
                "region": region,
                "at": now(),
            },
        )
    return list_learned_dialects(engine)


def list_learned_dialects(engine):
    with engine.begin() as db:
        ensure_dialect_table(db)
        rows = (
            db.execute(
                text(
                    "SELECT word, meaning, category, region, confirmed, created_at FROM community_dialects ORDER BY id DESC"
                )
            )
            .mappings()
            .all()
        )
        return [dict(r) for r in rows]
