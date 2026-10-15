import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ComplaintDetail } from "./ComplaintDetail";
import { TrackComplaint } from "./TrackComplaint";
import type { Complaint } from "./types";

const parent = {
  tracking_id: "GRV-parent",
  parent_tracking_id: null,
  input_type: "text",
  original_text: "No water, and children are getting sick.",
  status: "in_progress",
  analysis: null,
  assigned_department: null,
  assigned_secondary_departments: [],
  requires_review: true,
  review_reason: "",
  analysis_error: null,
  audio_mime: null,
  version: 2,
  analysis_ms: 10,
  created_at: "2026-10-15T00:00:00Z",
  updated_at: "2026-10-15T00:00:00Z",
  events: [],
} as Complaint;
const children = [
  {
    ...parent,
    tracking_id: "GRV-water",
    parent_tracking_id: parent.tracking_id,
    status: "resolved",
    issue: {
      issue_id: "water",
      normalized_complaint: "Restore water supply.",
      category: "Water Supply",
      department: "Water Supply",
      urgency: "High",
      confidence: 0.9,
      explanation: "Supply restoration belongs to Water Supply.",
      basis: "explicit",
      evidence: ["No water"],
      related_issue_ids: [],
      relationship_explanation: null,
    },
    children: [],
  },
  {
    ...parent,
    tracking_id: "GRV-health",
    parent_tracking_id: parent.tracking_id,
    status: "awaiting_review",
    issue: {
      issue_id: "health",
      normalized_complaint: "Investigate reported illness.",
      category: "Public Health",
      department: "Health",
      urgency: "High",
      confidence: 0.5,
      explanation: "Health should investigate the reported illness.",
      basis: "implicit",
      evidence: ["children are getting sick"],
      related_issue_ids: ["water"],
      relationship_explanation:
        "Illness is reported during the supply interruption; cause needs investigation.",
    },
    children: [],
  },
] as Complaint[];
const receipt = { ...parent, children };
afterEach(() => vi.unstubAllGlobals());

it("shows separate issue progress, evidence and grounded implicit relationships on one receipt", async () => {
  const onTrack = vi.fn();
  render(<ComplaintDetail complaint={receipt} onTrack={onTrack} />);
  expect(screen.getByText("1 / 2 issues resolved")).toBeInTheDocument();
  const health = screen.getByRole("article", {
    name: "Investigate reported illness.",
  });
  expect(within(health).getByText("Awaiting review")).toBeInTheDocument();
  expect(within(health).getByText("Implicit issue")).toBeInTheDocument();
  expect(
    within(health).getByText("children are getting sick"),
  ).toBeInTheDocument();
  expect(
    within(health).getByText("Related issue: GRV-water"),
  ).toBeInTheDocument();
  await userEvent.click(
    within(health).getByRole("button", { name: "Track complaint" }),
  );
  expect(onTrack).toHaveBeenCalledWith("GRV-health");
  expect(
    screen.queryByText("Manual classification needed"),
  ).not.toBeInTheDocument();
});

it("tracks a child from the parent and navigates back to all linked issues", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(url.includes("GRV-health") ? children[1] : receipt),
          { status: 200 },
        ),
    ),
  );
  render(<TrackComplaint initialId="GRV-parent" />);
  const health = await screen.findByRole("article", {
    name: "Investigate reported illness.",
  });
  await userEvent.click(
    within(health).getByRole("button", { name: "Track complaint" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "View all linked issues" }),
  );
  expect(await screen.findByText("1 / 2 issues resolved")).toBeInTheDocument();
});
