from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Department = Literal[
    "Water Supply",
    "Public Works",
    "Sanitation",
    "Electricity",
    "Drainage",
    "General Administration",
]
Category = Literal["Water Supply", "Roads", "Sanitation", "Electricity", "Drainage", "Other"]
Urgency = Literal["Low", "Medium", "High", "Critical"]
Nonempty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
DEPARTMENTS = [
    "Water Supply",
    "Public Works",
    "Sanitation",
    "Electricity",
    "Drainage",
    "General Administration",
]
CATEGORY_DEPARTMENT = dict(
    zip(["Water Supply", "Roads", "Sanitation", "Electricity", "Drainage", "Other"], DEPARTMENTS)
)


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    phrase: Nonempty
    translation: Nonempty
    significance: Nonempty


class Analysis(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    transcript: Nonempty
    normalized_complaint: Nonempty = Field(
        description="Faithful formal English complaint for official staff, preserving all "
        "reported facts, issues, negations and uncertainty without invented details."
    )
    language: Nonempty
    dialect: str = Field(max_length=200)
    category: Category = Field(description="Category of the dominant actionable civic issue.")
    intent: Nonempty
    primary_department: Department = Field(
        description="One lead department responsible for the dominant issue, matching the category."
    )
    secondary_departments: list[Department] = Field(
        max_length=5,
        description="All distinct supporting departments whose work is necessary, supported by "
        "reported issues or resolution dependencies; no alternatives, duplicates or primary overlap.",
    )
    urgency: Urgency
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    keywords: list[Nonempty] = Field(min_length=1, max_length=20)
    detected_meaning: Nonempty
    explanation: Nonempty = Field(
        description="Observable evidence for category, urgency and primary responsibility, "
        "plus the specific necessary work of each secondary department."
    )
    evidence_highlights: list[EvidenceItem] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def unique_departments(self):
        if self.primary_department in self.secondary_departments:
            raise ValueError("Secondary departments cannot repeat the primary department")
        if len(set(self.secondary_departments)) != len(self.secondary_departments):
            raise ValueError("Secondary departments must be unique")
        return self


def review_reason(analysis: Analysis, threshold: float) -> str:
    reasons = []
    if analysis.confidence < threshold:
        reasons.append("Confidence is below the officer review threshold.")
    if analysis.category == "Other":
        reasons.append("The civic category is ambiguous.")
    if CATEGORY_DEPARTMENT[analysis.category] != analysis.primary_department:
        reasons.append("Category and department recommendation disagree.")
    return " ".join(reasons)
