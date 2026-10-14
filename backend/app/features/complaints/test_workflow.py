import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest
from app.features.civic_intelligence.gateway import InferenceError
from app.features.civic_intelligence.schemas import Analysis
from app.main import create_app
from app.shared.config import Settings
from fastapi.testclient import TestClient


def prediction(**changes):
    data = dict(
        transcript="Road romba mosama.",
        normalized_complaint="The road is severely damaged.",
        language="Tamil and English",
        dialect="Colloquial Tamil",
        category="Roads",
        intent="Repair damaged road",
        primary_department="Public Works",
        secondary_departments=[],
        urgency="High",
        confidence=0.92,
        keywords=["road", "mosama"],
        detected_meaning="A badly damaged road",
        explanation="Road damage is maintained by Public Works.",
        evidence_highlights=[
            {
                "phrase": "mosama",
                "translation": "severely damaged",
                "significance": "Hazardous road condition driving High urgency",
            },
            {
                "phrase": "Road",
                "translation": "Roadway infrastructure",
                "significance": "Public road asset belonging to Public Works",
            },
        ],
        confidence_breakdown={
            "understanding": 0.98,
            "routing": 0.97,
            "urgency": 0.95,
            "overall": 0.92,
        },
        officer_summary={
            "problem": "Severely damaged road surface with potholes",
            "area": "Ward 12 / Main arterial road",
            "duration": "3 Days",
            "priority": "High",
            "department": "Public Works",
            "suggested_action": "Dispatch road inspection team and schedule asphalt patch repair",
        },
        self_verification={
            "status": "Verified",
            "critique": "Complaint clearly details roadway deterioration, correctly matched to Public Works.",
            "agreement": True,
            "verification_confidence": 0.97,
        },
    )
    return Analysis.model_validate(data | changes)


class FakeGateway:
    def analyze(self, *, text=None, audio=None):
        return prediction(transcript=text or "Road romba mosama.")


@pytest.fixture
def client(tmp_path):
    settings = Settings(database_path=str(tmp_path / "test.db"), gemini_api_key="")
    with TestClient(create_app(settings, FakeGateway())) as test_client:
        yield test_client


def submit(client, text="Road romba mosama.", key="test-key"):
    return client.post("/api/complaints", json={"text": text}, headers={"Idempotency-Key": key})


def test_original_preserved_and_replay_is_idempotent(client):
    original = "  Road romba mosama.  "
    response = submit(client, original)
    assert response.status_code == 201
    record = response.json()
    assert record["original_text"] == original
    assert record["status"] == "awaiting_review"
    assert record["assigned_department"] is None
    assert record["analysis"]["normalized_complaint"] == "The road is severely damaged."
    assert submit(client, original).json()["tracking_id"] == record["tracking_id"]
    assert submit(client, "A different water complaint").status_code == 409
    assert client.get("/api/complaints").json()["total"] == 1


def test_provider_failure_keeps_tracking_and_original(client):
    class FailedGateway:
        def analyze(self, **kwargs):
            raise InferenceError("AI analysis is unavailable. Officer review is needed.")

    client.app.state.gateway = FailedGateway()
    record = submit(client).json()
    assert record["status"] == "analysis_failed"
    assert record["analysis"] is None
    assert record["original_text"] == "Road romba mosama."
    assert client.get(f"/api/complaints/{record['tracking_id']}").status_code == 200


@pytest.mark.parametrize("text", ["", "  ", "ab", "x" * 5001])
def test_rejects_invalid_text(client, text):
    assert submit(client, text).status_code == 422


@pytest.mark.parametrize(
    "changes",
    [
        {"primary_department": "Made-up department"},
        {"confidence": 1.1},
        {"explanation": ""},
        {"confidence": float("nan")},
        {"urgency": "Extreme"},
    ],
)
def test_invalid_ai_output_rejected(changes):
    with pytest.raises(ValueError):
        prediction(**changes)


@pytest.mark.parametrize(
    "changes",
    [
        {"confidence": 0.74},
        {"primary_department": "Water Supply"},
        {"category": "Other"},
    ],
)
def test_uncertain_or_inconsistent_analysis_requires_review(client, changes):
    class UncertainGateway:
        def analyze(self, **kwargs):
            return prediction(**changes)

    client.app.state.gateway = UncertainGateway()
    record = submit(client).json()
    assert record["requires_review"] is True
    assert record["review_reason"]
    assert record["assigned_department"] is None


def test_routing_status_and_stale_updates_are_auditable(client):
    record = submit(client).json()
    url = f"/api/complaints/{record['tracking_id']}"
    body = {
        "version": record["version"],
        "status": "routed",
        "department": "Public Works",
        "note": "Reviewed the original complaint and approved routing.",
    }
    routed = client.patch(url, json=body)
    assert routed.status_code == 200
    record = routed.json()
    assert record["assigned_department"] == "Public Works"
    assert record["original_text"] == "Road romba mosama."
    assert client.patch(url, json=body).status_code == 409
    assert (
        client.patch(
            url, json={"version": record["version"], "status": "resolved", "note": "Fixed"}
        ).status_code
        == 422
    )
    for status in ("in_progress", "resolved"):
        result = client.patch(
            url, json={"version": record["version"], "status": status, "note": "Work updated"}
        )
        assert result.status_code == 200
        record = result.json()
    assert [e["status"] for e in record["events"]] == [
        "received",
        "awaiting_review",
        "routed",
        "in_progress",
        "resolved",
    ]


def test_review_requires_note_and_unknown_id_is_not_found(client):
    record = submit(client).json()
    assert (
        client.patch(
            f"/api/complaints/{record['tracking_id']}",
            json={
                "version": record["version"],
                "status": "routed",
                "department": "Sanitation",
                "note": "",
            },
        ).status_code
        == 422
    )
    assert client.get("/api/complaints/GRV-2026-missing").status_code == 404


def test_original_is_immutable_in_database(client):
    record = submit(client).json()
    with sqlite3.connect(client.app.state.settings.database_path) as db:
        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "UPDATE complaints SET original_text='changed' WHERE tracking_id=?",
                (record["tracking_id"],),
            )


def test_duplicate_concurrent_submissions_create_one_record(client):
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda _: submit(client), range(4)))
    assert all(r.status_code == 201 for r in responses)
    assert len({r.json()["tracking_id"] for r in responses}) == 1
    assert client.get("/api/complaints").json()["total"] == 1


def test_queue_filter_and_pagination(client):
    assert submit(client, key="first-key").status_code == 201
    assert submit(client, key="second-key").status_code == 201
    response = client.get("/api/complaints?limit=1&offset=1&status=awaiting_review")
    assert response.json()["total"] == 2
    assert len(response.json()["items"]) == 1
    assert client.get("/api/complaints?status=resolved").json()["total"] == 0


def test_voice_rejects_non_audio_and_size_limit(client):
    assert (
        client.post(
            "/api/complaints/voice",
            files={"audio": ("bad.wav", b"not audio", "audio/wav")},
            headers={"Idempotency-Key": "audio-test"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/complaints/voice",
            files={"audio": ("large.wav", b"a" * (10 * 1024 * 1024 + 1), "audio/wav")},
            headers={"Idempotency-Key": "audio-large"},
        ).status_code
        == 413
    )


def test_simultaneous_officer_decisions_cannot_overwrite_each_other(client):
    record = submit(client).json()
    url = f"/api/complaints/{record['tracking_id']}"
    body = {
        "version": record["version"],
        "status": "routed",
        "department": "Public Works",
        "note": "Reviewed road repair routing.",
    }
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.patch(url, json=body), range(2)))
    assert sorted(r.status_code for r in responses) == [200, 409]
    record = client.get(url).json()
    assert len([event for event in record["events"] if event["status"] == "routed"]) == 1
