import io
import wave

import pytest
from app.features.complaints.audio import normalize_audio
from app.features.complaints.test_workflow import FakeGateway
from app.main import create_app
from app.shared.config import Settings
from fastapi import HTTPException
from fastapi.testclient import TestClient


def wav_bytes(seconds):
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\x00\x00" * (seconds * 16000))
    return output.getvalue()


def test_voice_submission_preserves_bytes_and_transcript(tmp_path):
    original = wav_bytes(1)
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "audio.db")), FakeGateway())
    ) as client:
        response = client.post(
            "/api/complaints/voice",
            files={"audio": ("recording.wav", original, "audio/wav")},
            headers={"Idempotency-Key": "voice-unique-key"},
        )
        assert response.status_code == 201
        record = response.json()
        assert record["input_type"] == "voice"
        assert record["analysis"]["transcript"] == "Road romba mosama."
        assert record["original_text"] is None
        audio = client.get(f"/api/complaints/{record['tracking_id']}/audio")
        assert audio.content == original
        assert audio.headers["content-type"] == "audio/wav"


def test_overlong_audio_is_not_silently_truncated():
    with pytest.raises(HTTPException) as exc:
        normalize_audio(wav_bytes(121), Settings().audio_decoder)
    assert exc.value.status_code == 422


def test_configured_missing_decoder_returns_useful_error():
    with pytest.raises(HTTPException) as exc:
        normalize_audio(wav_bytes(1), "missing-ffmpeg-executable")
    assert exc.value.status_code == 503


def test_uploaded_html_mime_cannot_control_original_audio_response(tmp_path):
    original = wav_bytes(1) + b"<script>alert(document.domain)</script>"
    with TestClient(
        create_app(Settings(database_path=str(tmp_path / "mime.db")), FakeGateway())
    ) as client:
        response = client.post(
            "/api/complaints/voice",
            files={"audio": ("recording.wav", original, "text/html")},
            headers={"Idempotency-Key": "html-mime-key"},
        )
        assert response.status_code == 201
        audio = client.get(f"/api/complaints/{response.json()['tracking_id']}/audio")
        assert audio.headers["content-type"] == "audio/wav"
        assert audio.content == original
