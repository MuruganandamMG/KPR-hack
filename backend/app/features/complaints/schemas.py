from typing import Literal

from app.features.civic_intelligence.schemas import Analysis, Department
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Status = Literal[
    "received", "awaiting_review", "analysis_failed", "routed", "in_progress", "resolved"
]


class TextSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=3, max_length=5000)

    @field_validator("text")
    @classmethod
    def nonblank(cls, value):
        if len(value.strip()) < 3:
            raise ValueError("Enter at least three nonblank characters")
        return value  # Keep original spacing and wording for auditability.


class OfficerDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    status: Literal["routed", "in_progress", "resolved"]
    department: Department | None = None
    secondary_departments: list[Department] | None = Field(default=None, max_length=5)
    note: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def validate_departments(self):
        secondary = self.secondary_departments or []
        if len(set(secondary)) != len(secondary):
            raise ValueError("Secondary departments must be unique")
        if self.department in secondary:
            raise ValueError("Secondary departments cannot repeat the primary department")
        return self

    @field_validator("note")
    @classmethod
    def nonblank(cls, value):
        if len(value.strip()) < 3:
            raise ValueError("Explain the officer decision")
        return value.strip()


class AuditEvent(BaseModel):
    timestamp: str
    status: Status
    department: Department | None
    secondary_departments: list[Department] = Field(default_factory=list)
    note: str


class Complaint(BaseModel):
    tracking_id: str
    input_type: Literal["text", "voice"]
    original_text: str | None
    audio_mime: str | None
    created_at: str
    updated_at: str
    status: Status
    analysis: Analysis | None
    analysis_error: str | None
    requires_review: bool
    review_reason: str
    assigned_department: Department | None
    assigned_secondary_departments: list[Department] = Field(default_factory=list)
    version: int
    analysis_ms: int | None
    events: list[AuditEvent]


class ComplaintPage(BaseModel):
    items: list[Complaint]
    total: int
    limit: int
    offset: int
