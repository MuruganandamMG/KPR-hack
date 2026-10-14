export type Status =
  | "received"
  | "awaiting_review"
  | "analysis_failed"
  | "routed"
  | "in_progress"
  | "resolved";
export interface Analysis {
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
}
export interface Complaint {
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
  version: number;
  analysis_ms: number | null;
  events: {
    timestamp: string;
    status: Status;
    department: string | null;
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
