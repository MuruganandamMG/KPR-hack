import hashlib
import logging
from time import perf_counter

from app.features.civic_intelligence.gateway import InferenceError
from app.features.civic_intelligence.schemas import (
    Analysis,
    issue_analysis,
    review_reason,
    validate_issue_evidence,
)
from sqlalchemy.exc import SQLAlchemyError

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
        validate_issue_evidence(analysis, text if text is not None else analysis.transcript)
        if len(analysis.issues) == 1:
            focused = issue_analysis(analysis, analysis.issues[0])
            if all(
                getattr(analysis, field) == getattr(focused, field)
                for field in ("category", "primary_department", "urgency", "confidence")
            ):
                # Keep compatible single-issue enhancements; canonical issue fields own routing.
                analysis = analysis.model_copy(update=focused.model_dump(exclude_unset=True))
            else:
                analysis = focused.model_copy(update={"issues": analysis.issues})
        reason = review_reason(analysis, settings.review_threshold)
        if text is not None:
            # Model transcript never replaces the original citizen text.
            analysis = analysis.model_copy(update={"transcript": text})
    except InferenceError as exc:
        analysis = None
        error = str(exc)
    except Exception:
        analysis = None
        # Avoid logging citizen payloads or provider exceptions containing credentials.
        logger.error("Inference failed for complaint %s", record.tracking_id)
        error = "Analysis could not be validated. Your complaint is saved for officer review."
    elapsed_ms = round((perf_counter() - start) * 1000)
    try:
        return save_analysis(
            engine,
            record.tracking_id,
            analysis=analysis,
            error=error,
            reason=reason,
            threshold=settings.review_threshold,
            elapsed_ms=elapsed_ms,
        )
    except SQLAlchemyError:
        # The decomposition transaction rolled back; keep the accepted original actionable.
        logger.error("Analysis persistence failed for complaint %s", record.tracking_id)
        return save_analysis(
            engine,
            record.tracking_id,
            analysis=None,
            error="Issue tickets could not be saved. Your original complaint is saved for officer review.",
            reason="Issue ticket persistence failed; manual review is required.",
            elapsed_ms=elapsed_ms,
        )
