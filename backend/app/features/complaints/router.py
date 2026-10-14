from typing import Annotated

from fastapi import APIRouter, File, Header, Query, Request, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from .audio import MAX_AUDIO_BYTES, audio_mime, normalize_audio
from .repository import get_audio, get_complaint, list_complaints, update_complaint
from .schemas import Complaint, ComplaintPage, OfficerDecision, Status, TextSubmission
from .service import submit_complaint

router = APIRouter(prefix="/api/complaints", tags=["complaints"])
SubmissionKey = Annotated[
    str, Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
]


@router.post(
    "",
    response_model=Complaint,
    status_code=201,
    responses={409: {"description": "Idempotency key was reused with different content"}},
)
def submit_text(body: TextSubmission, request: Request, idempotency_key: SubmissionKey):
    state = request.app.state
    return submit_complaint(
        state.engine, state.gateway, state.settings, key=idempotency_key, text=body.text
    )


@router.post(
    "/voice",
    response_model=Complaint,
    status_code=201,
    responses={
        409: {"description": "Idempotency key conflict"},
        413: {"description": "Audio exceeds 10 MiB"},
        503: {"description": "Audio decoder unavailable"},
    },
)
async def submit_voice(
    request: Request, idempotency_key: SubmissionKey, audio: UploadFile = File(...)
):
    from fastapi import HTTPException

    try:
        data = await audio.read(MAX_AUDIO_BYTES + 1)
        if len(data) > MAX_AUDIO_BYTES:
            raise HTTPException(413, "Audio must be 10 MiB or smaller.")
        state = request.app.state
        converted = await run_in_threadpool(normalize_audio, data, state.settings.audio_decoder)
        return await run_in_threadpool(
            submit_complaint,
            state.engine,
            state.gateway,
            state.settings,
            key=idempotency_key,
            original_audio=data,
            audio=converted,
            mime=audio_mime(data),
        )
    finally:
        await audio.close()


@router.get("", response_model=ComplaintPage)
def queue(
    request: Request,
    status: Status | None = None,
    search: str = Query(default="", max_length=200),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return list_complaints(
        request.app.state.engine, status=status, search=search, limit=limit, offset=offset
    )


@router.get(
    "/{tracking_id}",
    response_model=Complaint,
    responses={404: {"description": "Unknown tracking ID"}},
)
def track(tracking_id: str, request: Request):
    return get_complaint(request.app.state.engine, tracking_id)


@router.patch(
    "/{tracking_id}",
    response_model=Complaint,
    responses={
        404: {"description": "Unknown tracking ID"},
        409: {"description": "Stale complaint version"},
    },
)
def officer_decision(tracking_id: str, body: OfficerDecision, request: Request):
    return update_complaint(request.app.state.engine, tracking_id, body)


@router.get(
    "/{tracking_id}/audio",
    response_class=Response,
    responses={
        200: {
            "description": "Immutable original audio bytes",
            "content": {
                mime: {"schema": {"type": "string", "format": "binary"}}
                for mime in [
                    "audio/wav",
                    "audio/mpeg",
                    "audio/ogg",
                    "audio/flac",
                    "audio/webm",
                    "audio/mp4",
                    "audio/aac",
                ]
            },
        },
        404: {"description": "Complaint or audio not found"},
    },
)
def original_audio(tracking_id: str, request: Request):
    data, _ = get_audio(request.app.state.engine, tracking_id)
    return Response(
        data,
        media_type=audio_mime(data),
        headers={"Content-Disposition": "inline", "X-Content-Type-Options": "nosniff"},
    )
