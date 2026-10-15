import sqlite3
from pathlib import Path

import pytest
from app.features.complaints.test_workflow import client as client
from app.features.complaints.test_workflow import prediction, submit
from app.shared.config import Settings
from app.shared.database import create_database


def multi_complaint(client):
    class Gateway:
        def analyze(self, **kwargs):
            return prediction(
                category="Drainage",
                primary_department="Drainage",
                secondary_departments=["Sanitation", "Public Works"],
                normalized_complaint="The blocked drain is flooding the street with sewage. "
                "Waste must be removed and the damaged road repaired.",
                explanation="Drainage must clear the blocked drain; Sanitation must remove "
                "reported waste and Public Works must repair reported road damage.",
            )

    client.app.state.gateway = Gateway()
    return submit(client, "Drain blocked; sewage and rubbish on road; road damaged.").json()


def route(client, record, **changes):
    return client.patch(
        f"/api/complaints/{record['tracking_id']}",
        json={
            "version": record["version"],
            "status": "routed",
            "department": "Drainage",
            "note": "Reviewed the original and each department's responsibility.",
        }
        | changes,
    )


def test_supporting_assignments_survive_routing_tracking_and_progress(client):
    record = multi_complaint(client)
    result = route(client, record)
    assert result.status_code == 200
    record = result.json()
    assert record["assigned_secondary_departments"] == ["Sanitation", "Public Works"]
    assert record["events"][-1]["secondary_departments"] == ["Sanitation", "Public Works"]
    url = f"/api/complaints/{record['tracking_id']}"
    assert client.get(url).json() == record
    for status in ("in_progress", "resolved"):
        record = client.patch(
            url, json={"version": record["version"], "status": status, "note": "Work updated"}
        ).json()
        assert record["assigned_secondary_departments"] == ["Sanitation", "Public Works"]
        assert record["events"][-1]["secondary_departments"] == ["Sanitation", "Public Works"]
    assert record["original_text"] == "Drain blocked; sewage and rubbish on road; road damaged."


def test_officer_override_is_distinct_from_recommendation(client):
    original = multi_complaint(client)
    record = route(
        client, original, department="Sanitation", secondary_departments=["Drainage"]
    ).json()
    assert record["assigned_department"] == "Sanitation"
    assert record["assigned_secondary_departments"] == ["Drainage"]
    assert record["analysis"]["primary_department"] == "Drainage"
    assert record["analysis"]["secondary_departments"] == ["Sanitation", "Public Works"]
    assert record["events"][-1]["department"] == "Sanitation"
    assert record["events"][-1]["secondary_departments"] == ["Drainage"]


def test_explicit_empty_supporting_list_clears_recommendations(client):
    record = multi_complaint(client)
    assert (
        route(client, record, secondary_departments=[]).json()["assigned_secondary_departments"]
        == []
    )


@pytest.mark.parametrize(
    "secondary", [["Drainage"], ["Sanitation", "Sanitation"], ["Invented department"]]
)
def test_invalid_secondary_assignments_cannot_route(client, secondary):
    record = multi_complaint(client)
    assert route(client, record, secondary_departments=secondary).status_code == 422
    saved = client.get(f"/api/complaints/{record['tracking_id']}").json()
    assert saved["status"] == "awaiting_review"


def test_supporting_assignment_cannot_change_during_progress(client):
    record = route(client, multi_complaint(client)).json()
    assert (
        client.patch(
            f"/api/complaints/{record['tracking_id']}",
            json={
                "version": record["version"],
                "status": "in_progress",
                "secondary_departments": [],
                "note": "Changing supporting assignment",
            },
        ).status_code
        == 422
    )


def test_department_role_and_category_filters_follow_approved_routes(client):
    record = multi_complaint(client)
    assert client.get("/api/complaints?department=Sanitation").json()["total"] == 1
    assert (
        client.get("/api/complaints?department=Sanitation&department_role=primary").json()["total"]
        == 0
    )
    assert (
        client.get(
            "/api/complaints?department=Sanitation&department_role=secondary&category=Drainage"
        ).json()["total"]
        == 1
    )
    assert client.get("/api/complaints?category=Roads").json()["total"] == 0
    route(client, record, department="Sanitation", secondary_departments=["Drainage"])
    assert client.get("/api/complaints?department=Public%20Works").json()["total"] == 0
    assert (
        client.get("/api/complaints?department=Sanitation&department_role=primary").json()["total"]
        == 1
    )
    assert client.get(
        "/api/complaints?department=Drainage&department_role=secondary&limit=1&offset=1"
    ).json() == {"items": [], "total": 1, "limit": 1, "offset": 1}
    assert client.get("/api/complaints?department_role=primary").status_code == 422
    assert client.get("/api/complaints?department=Invented").status_code == 422
    assert client.get("/api/complaints?category=Invented").status_code == 422


def test_manual_multi_department_routing_works_without_ai(client):
    class FailedGateway:
        def analyze(self, **kwargs):
            raise RuntimeError("Unavailable")

    client.app.state.gateway = FailedGateway()
    record = submit(client).json()
    assert record["analysis"] is None
    record = route(
        client, record, department="Public Works", secondary_departments=["Drainage"]
    ).json()
    assert record["assigned_secondary_departments"] == ["Drainage"]
    assert client.get("/api/complaints?department=Drainage").json()["total"] == 1


def test_version_one_upgrade_preserves_approved_records_without_inventing_assignments(tmp_path):
    path = tmp_path / "legacy.db"
    migration = Path(__file__).parents[2] / "shared/migrations/001_complaints.sql"
    with sqlite3.connect(path) as db:
        db.executescript(migration.read_text() + "\nPRAGMA user_version=1;")
        db.execute(
            "INSERT INTO complaints(tracking_id,idempotency_key,fingerprint,input_type,"
            "original_text,created_at,updated_at,status,assigned_department) "
            "VALUES('legacy-id','legacy-key','hash','text','Original evidence','date','date',"
            "'routed','Public Works')"
        )
        db.execute(
            "INSERT INTO complaint_events(tracking_id,timestamp,status,department,note) "
            "VALUES('legacy-id','date','routed','Public Works','Original approval')"
        )
    engine = create_database(Settings(database_path=str(path)))
    engine.dispose()
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 3
        assert db.execute(
            "SELECT original_text,assigned_department,assigned_secondary_departments_json "
            "FROM complaints"
        ).fetchone() == ("Original evidence", "Public Works", "[]")
        assert db.execute(
            "SELECT note,secondary_departments_json FROM complaint_events"
        ).fetchone() == ("Original approval", "[]")
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE complaint_events SET note='changed'")
    # Reopening is idempotent.
    create_database(Settings(database_path=str(path))).dispose()
