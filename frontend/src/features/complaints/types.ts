export type Status =
  | "received"
  | "awaiting_review"
  | "analysis_failed"
  | "routed"
  | "in_progress"
  | "resolved";
export interface EvidenceItem {
  phrase: string;
  translation: string;
  significance: string;
}
export interface ConfidenceBreakdown {
  understanding: number;
  routing: number;
  urgency: number;
  overall: number;
}
export interface OfficerSummary {
  problem: string;
  area: string;
  duration: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  department: string;
  suggested_action: string;
}
export interface SelfVerification {
  status: "Verified" | "Disputed" | "Flagged for Review";
  critique: string;
  agreement: boolean;
  verification_confidence: number;
}
export interface FollowUpOption {
  label: string;
  urgency_impact: "Low" | "Medium" | "High" | "Critical";
  description: string;
  priority_weight: string;
}
export interface SmartFollowUp {
  needed: boolean;
  question: string;
  category_context: string;
  options: FollowUpOption[];
  answered_option?: string | null;
}
export interface FollowUpClarification {
  selected_option: string;
  urgency: "Low" | "Medium" | "High" | "Critical";
  note?: string;
}
export interface EmotionalUrgency {
  detected: boolean;
  distress_signals: string[];
  emotional_score: number;
  base_urgency: "Low" | "Medium" | "High" | "Critical";
  escalated_urgency: "Low" | "Medium" | "High" | "Critical";
  escalation_reason: string;
}

export interface MissingInfoItem {
  field_name: string;
  is_missing: boolean;
  prompt_question: string;
  example_suggestion: string;
}

export interface ComplaintCompleteness {
  score: number;
  missing_fields: MissingInfoItem[];
}

export interface LearnedDialectWord {
  word: string;
  suggested_meaning: string;
  category: string;
  confirmed: boolean;
  region: string;
}

export interface CitizenValidation {
  summary_statement: string;
  is_confirmed: boolean;
  confirmed_at?: string | null;
}

export interface RoutingRisk {
  level: "Low" | "Medium" | "High" | "Critical";
  score: number;
  risk_factors: string[];
  recommendation: string;
  mitigation_notes: string;
}

export interface ExcludedDepartment {
  department: string;
  exclusion_reason: string;
}

export interface DepartmentExplanation {
  selected_department: string;
  why_selected: string;
  excluded_departments: ExcludedDepartment[];
  jurisdiction_basis: string;
}

export interface ResolutionPredictor {
  estimated_hours_min: number;
  estimated_hours_max: number;
  estimated_timeline_label: string;
  sla_category: string;
  completeness_time_saved: string;
  bottleneck_warning?: string | null;
}

export interface FasterResolutionSuggestion {
  item_name: string;
  potential_time_saved: string;
  impact_rationale: string;
  example: string;
}

export interface FasterResolution {
  suggestions: FasterResolutionSuggestion[];
  overall_speedup_factor: string;
}

export interface HallucinationGuardrail {
  is_safe_to_route: boolean;
  certainty_level:
    | "High Certainty"
    | "Moderate Certainty"
    | "Low Certainty / Unsafe to Auto-Route";
  known_facts: string[];
  ambiguous_elements: string[];
  human_oversight_required: boolean;
  safeguard_reason: string;
}

export interface CivicIssue {
  issue_id: string;
  normalized_complaint: string;
  category: string;
  department: string;
  urgency: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  explanation: string;
  basis: "explicit" | "implicit";
  evidence: string[];
  related_issue_ids: string[];
  relationship_explanation: string | null;
}

export interface Analysis {
  issues?: CivicIssue[];
  transcript: string;
  normalized_complaint: string;
  language: string;
  dialect: string;
  category: string;
  intent: string;
  primary_department: string;
  secondary_departments: string[];
  urgency: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  keywords: string[];
  detected_meaning: string;
  explanation: string;
  evidence_highlights?: EvidenceItem[];
  confidence_breakdown?: ConfidenceBreakdown;
  officer_summary?: OfficerSummary;
  self_verification?: SelfVerification;
  smart_follow_up?: SmartFollowUp | null;
  emotional_urgency?: EmotionalUrgency | null;
  completeness?: ComplaintCompleteness | null;
  learned_dialect?: LearnedDialectWord | null;
  citizen_validation?: CitizenValidation | null;
  routing_risk?: RoutingRisk | null;
  department_explanation?: DepartmentExplanation | null;
  resolution_predictor?: ResolutionPredictor | null;
  faster_resolution?: FasterResolution | null;
  hallucination_guardrail?: HallucinationGuardrail | null;
}
export interface Complaint {
  parent_tracking_id?: string | null;
  issue?: CivicIssue | null;
  children?: Complaint[];
  tracking_id: string;
  input_type: "text" | "voice";
  original_text: string | null;
  audio_mime: string | null;
  created_at: string;
  updated_at: string;
  status: Status;
  analysis: Analysis | null;
  analysis_error: string | null;
  requires_review: boolean;
  review_reason: string;
  assigned_department: string | null;
  assigned_secondary_departments: string[];
  version: number;
  analysis_ms: number | null;
  events: {
    timestamp: string;
    status: Status;
    department: string | null;
    secondary_departments: string[];
    note: string;
  }[];
}
export interface ComplaintPage {
  items: Complaint[];
  total: number;
  limit: number;
  offset: number;
}
export interface Meta {
  departments: string[];
  ai_configured: boolean;
  voice_available: boolean;
  review_threshold: number;
  prototype: boolean;
}
export interface Decision {
  version: number;
  status: "routed" | "in_progress" | "resolved";
  department?: string;
  secondary_departments?: string[];
  note: string;
}
export const statusLabels: Record<Status, string> = {
  received: "Analyzing",
  awaiting_review: "Awaiting review",
  analysis_failed: "Manual review needed",
  routed: "Routed",
  in_progress: "In progress",
  resolved: "Resolved",
};
export const categories = [
  "Water Supply",
  "Roads",
  "Sanitation",
  "Electricity",
  "Drainage",
  "Other",
  "Public Health",
] as const;
