import type { Complaint } from "./types";

export function formalComplaint(complaint: Complaint): string | null {
  const analysis = complaint.analysis;
  if (!analysis) return null;
  const approved = !!complaint.assigned_department;
  const primary = complaint.assigned_department || analysis.primary_department;
  const secondary = approved
    ? complaint.assigned_secondary_departments || []
    : analysis.secondary_departments;
  return [
    `Subject: ${analysis.category} grievance`,
    `Reference: ${complaint.tracking_id}`,
    `Priority: ${analysis.urgency}`,
    `Routing: ${approved ? "Officer-approved" : "Recommended; awaiting officer approval"}`,
    `Primary department: ${primary}`,
    `Secondary departments: ${secondary.join(", ") || "None"}`,
    "",
    analysis.normalized_complaint,
  ].join("\n");
}
