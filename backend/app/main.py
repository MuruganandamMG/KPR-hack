import shutil
from contextlib import asynccontextmanager

from app.features.civic_intelligence.gateway import GeminiGateway
from app.features.civic_intelligence.schemas import DEPARTMENTS
from app.features.complaints.router import router
from app.shared.config import Settings
from app.shared.database import create_database
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


def create_app(settings: Settings | None = None, gateway=None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(application):
        application.state.engine = create_database(settings)
        try:
            yield
        finally:
            application.state.engine.dispose()

    application = FastAPI(title="ACIE Civic Intelligence API", version="1.0.0", lifespan=lifespan)
    application.state.settings = settings
    application.state.gateway = gateway or GeminiGateway(settings)
    application.include_router(router)

    @application.get("/api/health", tags=["system"])
    def health():
        return {"status": "ok"}

    @application.get("/api/meta", tags=["system"])
    def metadata():
        return {
            "departments": DEPARTMENTS,
            "review_threshold": settings.review_threshold,
            "ai_configured": bool(settings.gemini_api_key),
            "voice_available": bool(shutil.which(settings.audio_decoder)),
            "prototype": True,
        }

    frontend = settings.frontend_directory
    if frontend.is_dir():
        application.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")
    return application


app = create_app()
