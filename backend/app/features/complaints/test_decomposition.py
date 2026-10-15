import pytest
from app.features.complaints.test_workflow import prediction, submit
from app.main import create_app
from app.shared.config import Settings
from fastapi.testclient import TestClient

ORIGINAL = "The road is damaged, streetlights are not working, and garbage has not been collected."


def issue(id, complaint, category, department, evidence, **changes):
    return (
        dict(
            issue_id=id,
            normalized_complaint=complaint,
            category=category,
            department=department,
            urgency="High",
            confidence=0.91,
            explanation=f"{department} is responsible for {complaint}",
            basis="explicit",
            evidence=[evidence],
            related_issue_ids=[],
            relationship_explanation=None,
        )
        | changes
    )


def issues():
    return [
        issue("road", "Repair damaged road.", "Roads", "Public Works", "road is damaged"),
        issue(
            "light",
            "Repair streetlights.",
            "Electricity",
            "Electricity",
            "streetlights are not working",
        ),
        issue(
            "waste",
            "Collect garbage.",
            "Sanitation",
            "Sanitation",
            "garbage has not been collected",
        ),
    ]


class Gateway:
    def __init__(self, data):
        self.data = data

    def analyze(self, **kwargs):
        return prediction(transcript=ORIGINAL).model_dump() | {"issues": self.data}


def test_linked_tickets_are_atomic_idempotent_and_independently_tracked(tmp_path):
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "test.db")), Gateway(issues()))
    ) as client:
        parent = submit(client, ORIGINAL).json()
        assert parent["status"] == "awaiting_review"
        assert len(parent["children"]) == 3
        assert submit(client, ORIGINAL).json()["children"] == parent["children"]
        assert client.get("/api/complaints").json()["total"] == 3
        for child, expected in zip(parent["children"], issues()):
            assert child["parent_tracking_id"] == parent["tracking_id"]
            assert child["issue"]["issue_id"] == expected["issue_id"]
            assert child["analysis"]["primary_department"] == expected["department"]
            assert child["analysis"]["normalized_complaint"] == expected["normalized_complaint"]
            assert child["original_text"] == ORIGINAL
            assert child["analysis"]["officer_summary"] is None
            assert (
                client.get("/api/complaints", params={"department": expected["department"]}).json()[
                    "total"
                ]
                == 1
            )
        assert (
            client.patch(
                f"/api/complaints/{parent['tracking_id']}",
                json={
                    "version": parent["version"],
                    "status": "routed",
                    "department": "Public Works",
                    "note": "Approve all",
                },
            ).status_code
            == 422
        )
        for child in parent["children"]:
            for status in ["routed", "in_progress", "resolved"]:
                response = client.patch(
                    f"/api/complaints/{child['tracking_id']}",
                    json={
                        "version": child["version"],
                        "status": status,
                        "department": child["analysis"]["primary_department"],
                        "note": "Reviewed issue progress",
                    },
                )
                assert response.status_code == 200, response.text
                child = response.json()
            tracked = client.get(f"/api/complaints/{parent['tracking_id']}").json()
            assert tracked["status"] == (
                "resolved"
                if all(c["status"] == "resolved" for c in tracked["children"])
                else "in_progress"
            )
        assert tracked["assigned_department"] is None
        assert len(tracked["events"]) >= 3


@pytest.mark.parametrize(
    "mutate",
    [
        lambda data: data + [data[0]],
        lambda data: [data[0] | {"department": "Electricity"}],
        lambda data: [data[0] | {"evidence": ["invented evidence"]}],
        lambda data: [data[0] | {"related_issue_ids": ["missing"]}],
        lambda data: [data[0] | {"confidence": 1.1}],
    ],
)
def test_invalid_decomposition_keeps_original_without_partial_children(tmp_path, mutate):
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "test.db")), Gateway(mutate(issues())))
    ) as client:
        parent = submit(client, ORIGINAL).json()
        assert parent["status"] == "analysis_failed"
        assert parent["children"] == []
        assert parent["original_text"] == ORIGINAL
        assert client.get("/api/complaints").json()["total"] == 1


def test_implicit_health_issue_retains_evidence_relationship_and_review(tmp_path):
    text = "No water supply, so children are using borewell water and getting sick."
    data = [
        issue("water", "Restore water supply.", "Water Supply", "Water Supply", "No water supply"),
        issue(
            "health",
            "Investigate reported illness among children.",
            "Public Health",
            "Health",
            "getting sick",
            basis="implicit",
            confidence=0.5,
            related_issue_ids=["water"],
            relationship_explanation="Illness is reported alongside reliance on borewell water; cause needs investigation.",
        ),
    ]
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "test.db")), Gateway(data))
    ) as client:
        parent = submit(client, text).json()
        health = parent["children"][1]
        assert health["requires_review"]
        assert "threshold" in health["review_reason"]
        assert health["issue"]["basis"] == "implicit"
        assert health["issue"]["related_issue_ids"] == ["water"]
        assert health["analysis"]["urgency"] == "High"


def test_voice_children_share_immutable_original_audio(tmp_path):
    from app.features.complaints.test_audio import wav_bytes

    original = wav_bytes(1)
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "voice.db")), Gateway(issues()))
    ) as client:
        response = client.post(
            "/api/complaints/voice",
            files={"audio": ("recording.wav", original, "audio/wav")},
            headers={"Idempotency-Key": "voice-multi-issue"},
        )
        parent = response.json()
        assert response.status_code == 201
        assert len(parent["children"]) == 3
        for child in parent["children"]:
            assert child["input_type"] == "voice"
            assert child["original_text"] is None
            assert child["analysis"]["transcript"] == ORIGINAL
            assert client.get(f"/api/complaints/{child['tracking_id']}/audio").content == original
        assert (
            client.post(
                "/api/complaints/voice",
                files={"audio": ("recording.wav", original, "audio/wav")},
                headers={"Idempotency-Key": "voice-multi-issue"},
            ).json()["children"]
            == parent["children"]
        )
        from sqlalchemy import text

        with client.app.state.engine.connect() as db:
            assert (
                db.execute(
                    text("SELECT COUNT(*) FROM complaints WHERE original_audio IS NOT NULL")
                ).scalar_one()
                == 1
            )
            from sqlalchemy.exc import IntegrityError

            with pytest.raises(IntegrityError):
                db.execute(
                    text("UPDATE complaints SET parent_tracking_id=NULL WHERE tracking_id=:id"),
                    {"id": parent["children"][0]["tracking_id"]},
                )


def test_child_write_failure_rolls_back_entire_decomposition(tmp_path):
    from sqlalchemy import text

    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "atomic.db")), Gateway(issues())),
        raise_server_exceptions=False,
    ) as client:
        with client.app.state.engine.begin() as db:
            db.execute(
                text("""CREATE TRIGGER fail_second_child BEFORE INSERT ON complaints
                WHEN json_extract(NEW.issue_json,'$.issue_id')='light'
                BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END;""")
            )
        response = submit(client, ORIGINAL)
        assert response.status_code == 201
        receipt = response.json()
        assert receipt["status"] == "analysis_failed"
        assert receipt["children"] == []
        assert "saved" in receipt["analysis_error"]
        assert submit(client, ORIGINAL).json() == receipt
        routed = client.patch(
            f"/api/complaints/{receipt['tracking_id']}",
            json={
                "version": receipt["version"],
                "status": "routed",
                "department": "Public Works",
                "note": "Storage failure reviewed; manually routed original complaint.",
            },
        )
        assert routed.status_code == 200
        with client.app.state.engine.connect() as db:
            assert db.execute(text("SELECT COUNT(*) FROM complaints")).scalar_one() == 1
            assert db.execute(text("SELECT status FROM complaints")).scalar_one() == "routed"
            assert db.execute(text("SELECT COUNT(*) FROM complaint_events")).scalar_one() == 3


def test_single_issue_stays_one_ticket_and_legacy_records_are_unchanged(tmp_path):
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "single.db")), Gateway(issues()[:1]))
    ) as client:
        record = submit(client, ORIGINAL).json()
        assert record["children"] == []
        assert record["issue"]["issue_id"] == "road"
        assert record["parent_tracking_id"] is None
        assert client.get("/api/complaints").json()["total"] == 1


def test_parent_reflects_low_confidence_child_and_implicit_issues_require_review(tmp_path):
    data = issues()
    data[1]["confidence"] = 0.4
    data[2]["basis"] = "implicit"
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "review.db")), Gateway(data))
    ) as client:
        parent = submit(client, ORIGINAL).json()
        assert parent["requires_review"] is True
        assert parent["children"][1]["requires_review"] is True
        assert parent["children"][2]["requires_review"] is True
        assert "Implicit" in parent["children"][2]["review_reason"]


def test_single_issue_fields_are_authoritative_over_submission_summary(tmp_path):
    data = [
        issue(
            "water",
            "Restore water supply.",
            "Water Supply",
            "Water Supply",
            "No water",
            confidence=0.1,
            urgency="Critical",
        )
    ]
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "single-routing.db")), Gateway(data))
    ) as client:
        record = submit(client, "No water").json()
        assert record["status"] == "awaiting_review"
        assert record["analysis"]["primary_department"] == "Water Supply"
        assert record["analysis"]["normalized_complaint"] == data[0]["normalized_complaint"]
        assert record["analysis"]["urgency"] == "Critical"
        assert record["analysis"]["confidence"] == 0.1
        assert record["requires_review"] is True
        assert (
            client.get("/api/complaints", params={"department": "Water Supply"}).json()["total"]
            == 1
        )
        assert record["analysis"]["officer_summary"] is None
