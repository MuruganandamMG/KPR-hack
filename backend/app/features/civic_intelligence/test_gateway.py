import json

import httpx
import pytest
from app.features.civic_intelligence.gateway import GeminiGateway, InferenceError
from app.features.complaints.test_decomposition import issue
from app.features.complaints.test_workflow import prediction
from app.shared.config import Settings


def test_malformed_output_retried_and_validated():
    calls = []

    def respond(request):
        body = json.loads(request.content)
        calls.append(body)
        output = (
            "not JSON"
            if len(calls) == 1
            else prediction(
                issues=[issue("road", "Repair damaged road.", "Roads", "Public Works", "Road")]
            ).model_dump_json()
        )
        return httpx.Response(
            200,
            json={
                "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": output}]}}]
            },
        )

    gateway = GeminiGateway(Settings(gemini_api_key="test-secret"), httpx.MockTransport(respond))
    result = gateway.analyze(text="Road romba mosama.")
    assert result.primary_department == "Public Works"
    assert len(calls) == 2
    assert calls[0]["contents"][0]["parts"][1] == {"text": "Road romba mosama."}
    assert calls[0]["generationConfig"]["responseMimeType"] == "application/json"


@pytest.mark.parametrize("status,expected_calls", [(503, 2), (429, 2), (401, 1)])
def test_provider_failure_is_bounded_and_does_not_leak_secrets(status, expected_calls):
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(status, json={"error": "test-secret"})

    gateway = GeminiGateway(Settings(gemini_api_key="test-secret"), httpx.MockTransport(respond))
    with pytest.raises(InferenceError) as exc:
        gateway.analyze(text="Water is leaking")
    assert "test-secret" not in str(exc.value)
    assert len(calls) == expected_calls


def test_audio_sent_as_inline_wav():
    def respond(request):
        body = json.loads(request.content)
        assert body["contents"][0]["parts"][1]["inlineData"] == {
            "mimeType": "audio/wav",
            "data": "d2F2",
        }
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {
                            "parts": [
                                {
                                    "text": prediction(
                                        issues=[
                                            issue(
                                                "road",
                                                "Repair damaged road.",
                                                "Roads",
                                                "Public Works",
                                                "Road",
                                            )
                                        ]
                                    ).model_dump_json()
                                }
                            ]
                        },
                    }
                ]
            },
        )

    gateway = GeminiGateway(Settings(gemini_api_key="test-secret"), httpx.MockTransport(respond))
    assert gateway.analyze(audio=b"wav").transcript == "Road romba mosama."


def test_missing_decomposition_is_rejected_for_new_inference():
    def respond(request):
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {"parts": [{"text": prediction().model_dump_json()}]},
                    }
                ]
            },
        )

    gateway = GeminiGateway(Settings(gemini_api_key="test-secret"), httpx.MockTransport(respond))
    with pytest.raises(InferenceError):
        gateway.analyze(text="Road romba mosama.")
