import { request } from "../../shared/request";
import type {
  Complaint,
  ComplaintPage,
  Decision,
  FollowUpClarification,
  Meta,
  Status,
} from "./types";

export const getMeta = (signal?: AbortSignal) =>
  request<Meta>("/meta", { signal });
export const submitText = (text: string, key: string) =>
  request<Complaint>("/complaints", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ text }),
  });
export const submitVoice = (audio: File, key: string) => {
  const body = new FormData();
  body.append("audio", audio);
  return request<Complaint>("/complaints/voice", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body,
  });
};
export const trackComplaint = (id: string, signal?: AbortSignal) =>
  request<Complaint>(`/complaints/${encodeURIComponent(id.trim())}`, {
    signal,
  });
export const listComplaints = (
  options: {
    status?: Status | "";
    search?: string;
    offset?: number;
    department?: string;
    department_role?: "" | "primary" | "secondary";
    category?: string;
  },
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({
    limit: "25",
    offset: String(options.offset || 0),
  });
  if (options.status) query.set("status", options.status);
  if (options.search) query.set("search", options.search);
  if (options.department) {
    query.set("department", options.department);
    if (options.department_role)
      query.set("department_role", options.department_role);
  }
  if (options.category) query.set("category", options.category);
  return request<ComplaintPage>(`/complaints?${query}`, { signal });
};
export const updateComplaint = (id: string, decision: Decision) =>
  request<Complaint>(`/complaints/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decision),
  });
export const clarifyComplaint = (
  id: string,
  clarification: FollowUpClarification,
) =>
  request<Complaint>(`/complaints/${encodeURIComponent(id)}/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clarification),
  });
export const audioUrl = (id: string) =>
  `/api/complaints/${encodeURIComponent(id)}/audio`;
