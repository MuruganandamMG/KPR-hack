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


def get_audio(engine, tracking_id):
    with engine.connect() as db:
        row = db.execute(
            text("SELECT original_audio,audio_mime FROM complaints WHERE tracking_id=:id"),
            {"id": tracking_id},
        ).first()
        if row is None or row[0] is None:
            raise HTTPException(404, "Original audio not found.")
        return row[0], row[1]
