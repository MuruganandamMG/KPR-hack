import shutil
from pathlib import Path

import imageio_ffmpeg
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env", env_file_encoding="utf-8-sig", extra="ignore"
    )
    database_path: str = "backend/data/acie.db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    review_threshold: float = Field(default=0.75, ge=0, le=1)
    frontend_dist: str = "frontend/dist"
    ffmpeg_path: str = "ffmpeg"

    @property
    def database_file(self) -> Path:
        path = Path(self.database_path)
        return (path if path.is_absolute() else PROJECT_ROOT / path).resolve()

    @property
    def frontend_directory(self) -> Path:
        path = Path(self.frontend_dist)
        return (path if path.is_absolute() else PROJECT_ROOT / path).resolve()

    @property
    def audio_decoder(self) -> str:
        if self.ffmpeg_path != "ffmpeg" or shutil.which("ffmpeg"):
            return self.ffmpeg_path
        return imageio_ffmpeg.get_ffmpeg_exe()
