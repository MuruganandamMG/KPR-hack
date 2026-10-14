import io
import subprocess
import tempfile
import wave
from pathlib import Path

from fastapi import HTTPException

MAX_AUDIO_BYTES = 10 * 1024 * 1024


def audio_mime(data: bytes) -> str:
    """Derive an allowlisted content type; never replay upload-supplied MIME."""
    if data.startswith(b"RIFF") and data[8:12] == b"WAVE":
        return "audio/wav"
    for prefix, mime in [
        (b"OggS", "audio/ogg"),
        (b"fLaC", "audio/flac"),
        (b"ID3", "audio/mpeg"),
        (b"\x1aE\xdf\xa3", "audio/webm"),
    ]:
        if data.startswith(prefix):
            return mime
    if data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg"
    if data[:2] in (b"\xff\xf1", b"\xff\xf9"):
        return "audio/aac"
    if data[4:8] == b"ftyp":
        return "audio/mp4"
    raise HTTPException(422, "Upload a valid WAV, MP3, OGG, FLAC, WebM, or M4A audio file.")


def normalize_audio(data: bytes, ffmpeg: str) -> bytes:
    if not data:
        raise HTTPException(422, "Record or upload a nonempty audio complaint.")
    audio_mime(data)
    with tempfile.TemporaryDirectory(prefix="acie-audio-") as directory:
        source, target = Path(directory) / "input", Path(directory) / "output.wav"
        source.write_bytes(data)
        try:
            subprocess.run(
                [
                    ffmpeg,
                    "-nostdin",
                    "-v",
                    "error",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-i",
                    str(source),
                    "-t",
                    "121",
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-acodec",
                    "pcm_s16le",
                    str(target),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                timeout=30,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except FileNotFoundError:
            raise HTTPException(
                503, "Voice processing requires FFmpeg on the server. Please submit text for now."
            ) from None
        except (subprocess.SubprocessError, OSError):
            raise HTTPException(
                422, "Audio could not be decoded. Try a different recording."
            ) from None
        converted = target.read_bytes()
    with wave.open(io.BytesIO(converted)) as wav:
        duration = wav.getnframes() / wav.getframerate()
    if duration <= 0 or duration > 120:
        raise HTTPException(422, "Audio must contain between 0 and 120 seconds of sound.")
    return converted
