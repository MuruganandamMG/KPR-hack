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


class ConfidenceBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    understanding: float = Field(ge=0, le=1, allow_inf_nan=False)
    routing: float = Field(ge=0, le=1, allow_inf_nan=False)
    urgency: float = Field(ge=0, le=1, allow_inf_nan=False)
    overall: float = Field(ge=0, le=1, allow_inf_nan=False)


class OfficerSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    problem: Nonempty
    area: Nonempty
    duration: Nonempty
    priority: Urgency
    department: Department
    suggested_action: Nonempty


class SelfVerification(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    status: Literal["Verified", "Disputed", "Flagged for Review"]
    critique: Nonempty
    agreement: bool
    verification_confidence: float = Field(ge=0, le=1, allow_inf_nan=False)


class FollowUpOption(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    label: Nonempty
    urgency_impact: Urgency
    description: Nonempty
    priority_weight: Nonempty


class SmartFollowUp(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    needed: bool
    question: Nonempty
    category_context: Nonempty
    options: list[FollowUpOption] = Field(min_length=2, max_length=5)
    answered_option: str | None = None


class EmotionalUrgency(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    detected: bool
    distress_signals: list[Nonempty] = Field(default_factory=list, max_length=10)
    emotional_score: float = Field(ge=0, le=1, allow_inf_nan=False)
    base_urgency: Urgency
    escalated_urgency: Urgency
    escalation_reason: str = ""


class MissingInfoItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    field_name: Nonempty
    is_missing: bool
    prompt_question: Nonempty
    example_suggestion: Nonempty


class ComplaintCompleteness(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    score: int = Field(ge=0, le=100)
    missing_fields: list[MissingInfoItem] = Field(default_factory=list, max_length=10)


class LearnedDialectWord(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    word: Nonempty
    suggested_meaning: Nonempty
    category: Category
    confirmed: bool = False
    region: Nonempty = "Tamil Regional Vernacular"


class CitizenValidation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    summary_statement: Nonempty
    is_confirmed: bool = False
    confirmed_at: str | None = None


class RoutingRisk(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    level: Literal["Low", "Medium", "High", "Critical"]
    score: float = Field(ge=0, le=1, allow_inf_nan=False)
    risk_factors: list[Nonempty] = Field(default_factory=list, max_length=10)
    recommendation: Nonempty
    mitigation_notes: str = ""


class ExcludedDepartment(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    department: str
    exclusion_reason: str


class DepartmentExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    selected_department: Department
    why_selected: Nonempty
    excluded_departments: list[ExcludedDepartment] = Field(default_factory=list, max_length=10)
    jurisdiction_basis: Nonempty


class ResolutionPredictor(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    estimated_hours_min: int = Field(ge=1)
    estimated_hours_max: int = Field(ge=1)
    estimated_timeline_label: Nonempty
    sla_category: Nonempty
    completeness_time_saved: Nonempty
    bottleneck_warning: str | None = None


class FasterResolutionSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    item_name: Nonempty
    potential_time_saved: Nonempty
    impact_rationale: Nonempty
    example: Nonempty


class FasterResolution(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    suggestions: list[FasterResolutionSuggestion] = Field(min_length=1, max_length=5)
    overall_speedup_factor: Nonempty


class HallucinationGuardrail(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    is_safe_to_route: bool
    certainty_level: Literal[
        "High Certainty", "Moderate Certainty", "Low Certainty / Unsafe to Auto-Route"
    ]
    known_facts: list[Nonempty] = Field(default_factory=list, max_length=10)
    ambiguous_elements: list[Nonempty] = Field(default_factory=list, max_length=10)
    human_oversight_required: bool
    safeguard_reason: Nonempty


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
    confidence_breakdown: ConfidenceBreakdown | None = None
    officer_summary: OfficerSummary | None = None
    self_verification: SelfVerification | None = None
    smart_follow_up: SmartFollowUp | None = None
    emotional_urgency: EmotionalUrgency | None = None
    completeness: ComplaintCompleteness | None = None
    learned_dialect: LearnedDialectWord | None = None
    citizen_validation: CitizenValidation | None = None
    routing_risk: RoutingRisk | None = None
    department_explanation: DepartmentExplanation | None = None
    resolution_predictor: ResolutionPredictor | None = None
    faster_resolution: FasterResolution | None = None
    hallucination_guardrail: HallucinationGuardrail | None = None

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
    if analysis.self_verification and not analysis.self_verification.agreement:
        reasons.append("AI self-verification critic flagged or disputed this recommendation.")
    return " ".join(reasons)
