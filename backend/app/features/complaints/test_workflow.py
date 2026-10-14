import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest
from app.features.civic_intelligence.gateway import (
    InferenceError,
    build_citizen_validation,
    build_complaint_completeness,
    build_department_explanation,
    build_emotional_urgency,
    build_faster_resolution,
    build_hallucination_guardrail,
    build_learned_dialect,
    build_resolution_predictor,
    build_routing_risk,
    build_smart_follow_up,
)
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
        smart_follow_up={
            "needed": True,
            "question": "Does the issue affect:",
            "category_context": "Geographic scope determines whether an individual valve inspection or municipal tanker is required.",
            "options": [
                {
                    "label": "Your house only",
                    "urgency_impact": "Medium",
                    "description": "Domestic connection issue",
                    "priority_weight": "Normal Priority",
                },
                {
                    "label": "Entire street",
                    "urgency_impact": "High",
                    "description": "Distribution line issue",
                    "priority_weight": "High Priority",
                },
                {
                    "label": "Entire village / neighborhood",
                    "urgency_impact": "Critical",
                    "description": "Widespread supply outage",
                    "priority_weight": "Emergency Priority",
                },
            ],
            "answered_option": None,
        },
        emotional_urgency={
            "detected": False,
            "distress_signals": [],
            "emotional_score": 0.2,
            "base_urgency": "High",
            "escalated_urgency": "High",
            "escalation_reason": "Standard complaint evaluation.",
        },
        completeness={
            "score": 75,
            "missing_fields": [
                {
                    "field_name": "Nearest Landmark",
                    "is_missing": True,
                    "prompt_question": "Is there a nearby landmark or asset number?",
                    "example_suggestion": "e.g. Near Murugan Temple",
                }
            ],
        },
        learned_dialect={
            "word": "Mosama",
            "suggested_meaning": "Severe physical deterioration",
            "category": "Roads",
            "confirmed": True,
            "region": "Tamil Regional Vernacular",
        },
        citizen_validation={
            "summary_statement": "The road is severely damaged. (Classified as Roads · Priority: High)",
            "is_confirmed": False,
            "confirmed_at": None,
        },
    )
    return Analysis.model_validate(data | changes)


class FakeGateway:
    def analyze(self, *, text=None, audio=None):
        category = "Water Supply" if text and "water" in text.lower() else "Roads"
        dept = "Water Supply" if category == "Water Supply" else "Public Works"
        transcript = text or "Road romba mosama."
        return prediction(
            transcript=transcript,
            category=category,
            primary_department=dept,
            smart_follow_up=build_smart_follow_up(category, transcript),
            emotional_urgency=build_emotional_urgency(transcript, "High", category),
            completeness=build_complaint_completeness(transcript),
            learned_dialect=build_learned_dialect(transcript, category, ["mosama"]),
            citizen_validation=build_citizen_validation(
                "The road is severely damaged.", category, "High"
            ),
            routing_risk=build_routing_risk(category, "High", 0.92, transcript),
            department_explanation=build_department_explanation(dept, category, transcript),
            resolution_predictor=build_resolution_predictor(category, "High", 75),
            faster_resolution=build_faster_resolution(category),
            hallucination_guardrail=build_hallucination_guardrail(0.92, category, ["road"]),
        )


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


def test_smart_follow_up_clarification_updates_urgency_and_event(client):
    record = submit(client, text="Water problem.").json()
    tracking_id = record["tracking_id"]
    assert record["analysis"]["smart_follow_up"] is not None
    assert record["analysis"]["smart_follow_up"]["needed"] is True

    # Submit clarification answering the smart follow-up question
    clarify_res = client.post(
        f"/api/complaints/{tracking_id}/clarify",
        json={
            "selected_option": "Entire village / neighborhood",
            "urgency": "Critical",
            "note": "Affecting 400 households across Ward 18",
        },
    )
    assert clarify_res.status_code == 200
    updated = clarify_res.json()
    assert updated["analysis"]["urgency"] == "Critical"
    assert (
        updated["analysis"]["smart_follow_up"]["answered_option"] == "Entire village / neighborhood"
    )
    assert updated["analysis"]["officer_summary"]["priority"] == "Critical"
    assert any("Citizen Follow-Up Clarification" in e["note"] for e in updated["events"])


def test_emotional_urgency_escalation_and_distress_detection(client):
    record = submit(
        client,
        text="Please help! My children haven't had drinking water for three days in Ward 18.",
        key="emotional-test-key",
    ).json()
    analysis = record["analysis"]
    assert analysis["emotional_urgency"] is not None
    assert analysis["emotional_urgency"]["detected"] is True
    assert len(analysis["emotional_urgency"]["distress_signals"]) >= 2
    assert analysis["emotional_urgency"]["escalated_urgency"] in ("High", "Critical")


def test_missing_information_completion_flow(client):
    record = submit(client, text="Water problem.", key="missing-info-key").json()
    tracking_id = record["tracking_id"]
    completeness = record["analysis"]["completeness"]
    assert completeness is not None
    initial_score = completeness["score"]

    # Fill in a missing field
    res = client.post(
        f"/api/complaints/{tracking_id}/complete",
        json={"field_name": "Street / Locality Name", "value": "Gandhi Street, Ward 12"},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["analysis"]["completeness"]["score"] >= initial_score
    assert any("Citizen Added Missing Detail" in e["note"] for e in updated["events"])


def test_citizen_validation_confirmation_flow(client):
    record = submit(client, key="validation-key").json()
    tracking_id = record["tracking_id"]
    assert record["analysis"]["citizen_validation"] is not None
    assert record["analysis"]["citizen_validation"]["is_confirmed"] is False

    # Confirm AI understanding
    res = client.post(f"/api/complaints/{tracking_id}/validate", json={"is_confirmed": True})
    assert res.status_code == 200
    updated = res.json()
    assert updated["analysis"]["citizen_validation"]["is_confirmed"] is True
    assert any("Citizen Validation Confirmed" in e["note"] for e in updated["events"])


def test_community_dialect_learning_registry(client):
    # Add a new local dialect word
    post_res = client.post(
        "/api/complaints/dialects/community",
        json={
            "word": "Sombu",
            "meaning": "Water pipe / domestic tap connection",
            "category": "Water Supply",
            "region": "Tamil Regional Dialect",
        },
    )
    assert post_res.status_code == 200
    dialects = post_res.json()
    assert any(d["word"] == "Sombu" for d in dialects)

    # Retrieve all dialects
    get_res = client.get("/api/complaints/dialects/community")
    assert get_res.status_code == 200
    assert any(d["word"] == "Sombu" for d in get_res.json())


def test_routing_risk_score_evaluation(client):
    record = submit(client, text="Live electrical wire spark on ground", key="risk-key").json()
    risk = record["analysis"]["routing_risk"]
    assert risk is not None
    assert risk["level"] in ["High", "Critical"]
    assert risk["score"] > 0.5
    assert len(risk["risk_factors"]) > 0


def test_department_differential_explanation(client):
    record = submit(client, text="Water supply pipe broken", key="dept-exp-key").json()
    dept_exp = record["analysis"]["department_explanation"]
    assert dept_exp is not None
    assert dept_exp["selected_department"] == "Water Supply"
    assert len(dept_exp["excluded_departments"]) >= 2
    assert "Section 24" in dept_exp["jurisdiction_basis"]


def test_resolution_predictor_and_speedup(client):
    record = submit(client, text="Road pothole near bus stand", key="res-pred-key").json()
    predictor = record["analysis"]["resolution_predictor"]
    faster = record["analysis"]["faster_resolution"]
    assert predictor is not None
    assert predictor["estimated_hours_min"] >= 1
    assert "Hours" in predictor["estimated_timeline_label"]
    assert faster is not None
    assert len(faster["suggestions"]) >= 1
    assert "faster" in faster["overall_speedup_factor"]


def test_hallucination_guardrail_safety_lock(client):
    record = submit(client, text="Normal complaint", key="guard-key").json()
    guard = record["analysis"]["hallucination_guardrail"]
    assert guard is not None
    assert guard["certainty_level"] == "High Certainty"
    assert guard["is_safe_to_route"] is True
    assert len(guard["known_facts"]) >= 1
