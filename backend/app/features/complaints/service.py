import hashlib
import logging
from time import perf_counter

from app.features.civic_intelligence.gateway import InferenceError
from app.features.civic_intelligence.schemas import Analysis, review_reason

from .repository import create_complaint, save_analysis

logger = logging.getLogger(__name__)


def submit_complaint(
    engine, gateway, settings, *, key, text=None, original_audio=None, audio=None, mime=None
):
    fingerprint = hashlib.sha256(
        (b"voice:" + (mime or "").encode() + b":" + original_audio)
        if original_audio is not None
        else b"text:" + text.encode()
    ).hexdigest()
    record, created = create_complaint(
        engine,
        key=key,
        fingerprint=fingerprint,
        original_text=text,
        audio=original_audio,
        mime=mime,
    )
    if not created:
        return record
    start = perf_counter()
    analysis, error, reason = None, None, ""
    try:
        analysis = Analysis.model_validate(gateway.analyze(text=text, audio=audio))
        reason = review_reason(analysis, settings.review_threshold)
        if text is not None:
            # Model transcript never replaces the original citizen text.
            analysis = analysis.model_copy(update={"transcript": text})
    except InferenceError as exc:
        error = str(exc)
    except Exception:
        # Avoid logging citizen payloads or provider exceptions containing credentials.
        logger.error("Inference failed for complaint %s", record.tracking_id)
        error = "Analysis could not be validated. Your complaint is saved for officer review."
    return save_analysis(
        engine,
        record.tracking_id,
        analysis=analysis,
        error=error,
        reason=reason,
        elapsed_ms=round((perf_counter() - start) * 1000),
    )
