import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ComplaintDetail } from "./ComplaintDetail";
import { OfficerDashboard } from "./OfficerDashboard";
import { EvidenceHighlight } from "./EvidenceHighlight";
import type { Complaint } from "./types";

const record = {
  tracking_id: "GRV-2026-multi",
  input_type: "text",
  original_text: "Drain blocked, rubbish and broken road.",
  audio_mime: null,
  created_at: "2026-10-14T12:00:00Z",
  updated_at: "2026-10-14T12:00:00Z",
  status: "awaiting_review",
  assigned_department: null,
  assigned_secondary_departments: [],
  requires_review: false,
  review_reason: "",
  analysis_error: null,
  version: 2,
  analysis_ms: 100,
  events: [],
  analysis: {
    transcript: "Drain blocked, rubbish and broken road.",
    normalized_complaint:
      "The blocked drain is flooding the street. Waste removal and repair of the damaged road are required.",
    language: "English",
    dialect: "",
    category: "Drainage",
    intent: "Clear drain and restore the street",
    primary_department: "Drainage",
    secondary_departments: ["Sanitation", "Public Works"],
    urgency: "High",
    confidence: 0.91,
    keywords: ["blocked", "rubbish", "broken road"],
    detected_meaning: "Drain blockage with waste and road damage",
    explanation:
      "Drainage clears the blockage, Sanitation removes waste, and Public Works repairs the road.",
  },
} satisfies Complaint;

afterEach(() => vi.unstubAllGlobals());

it("shows every recommended department prominently without opening explanations", () => {
  render(<ComplaintDetail complaint={record} />);
  const routing = within(
    screen.getByRole("region", { name: "Department routing" }),
  );
  expect(routing.getByText("Primary department (recommended)")).toBeVisible();
  expect(routing.getByText("Drainage")).toBeVisible();
  expect(
    routing.getByText("Secondary departments (recommended)"),
  ).toBeVisible();
  expect(routing.getByText("Sanitation, Public Works")).toBeVisible();
});

it("copies a formal staff complaint with recommendations explicitly marked pending", async () => {
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<ComplaintDetail complaint={record} />);
  await user.click(
    screen.getByRole("button", { name: "Copy formal complaint" }),
  );
  expect(copy).toHaveBeenCalledOnce();
  const text = copy.mock.calls[0][0];
  expect(text).toContain(record.analysis.normalized_complaint);
  expect(text).toContain("Primary department: Drainage");
  expect(text).toContain("Secondary departments: Sanitation, Public Works");
  expect(text).toContain("awaiting officer approval");
  expect(text).toContain(record.tracking_id);
  expect(text).not.toContain(record.original_text);
});

it("copies approved assignments instead of stale AI recommendations", async () => {
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(
    <ComplaintDetail
      complaint={{
        ...record,
        status: "routed",
        assigned_department: "Sanitation",
        assigned_secondary_departments: ["Drainage"],
      }}
    />,
  );
  const routing = within(
    screen.getByRole("region", { name: "Department routing" }),
  );
  expect(routing.getByText("Primary department (assigned)")).toBeVisible();
  expect(routing.getByText("Sanitation")).toBeVisible();
  expect(routing.getByText("Drainage")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Copy formal complaint" }),
  );
  expect(copy.mock.calls[0][0]).toContain("Primary department: Sanitation");
  expect(copy.mock.calls[0][0]).toContain("Secondary departments: Drainage");
  expect(copy.mock.calls[0][0]).not.toContain("Public Works");
});

it("never offers fabricated formal text when analysis is unavailable", () => {
  render(
    <ComplaintDetail
      complaint={{ ...record, analysis: null, status: "analysis_failed" }}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Copy formal complaint" }),
  ).not.toBeInTheDocument();
});

it("does not fabricate phrase translations or urgency evidence from keyword labels", () => {
  render(<EvidenceHighlight complaint={record} />);
  expect(screen.queryByText("blocked (translated)")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Direct indicator for High urgency"),
  ).not.toBeInTheDocument();
  expect(screen.getByText(record.analysis.explanation)).toBeInTheDocument();
});

it("officers explicitly confirm supporting departments and cannot select the primary twice", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn(
    async (_url: string, options?: RequestInit) =>
      new Response(
        JSON.stringify(
          options?.method === "PATCH"
            ? {
                ...record,
                status: "routed",
                assigned_department: "Sanitation",
                assigned_secondary_departments: ["Public Works"],
              }
            : { items: [record], total: 1, limit: 25, offset: 0 },
        ),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  render(
    <OfficerDashboard
      departments={["Drainage", "Sanitation", "Public Works"]}
    />,
  );
  await user.click(
    await screen.findByRole("button", { name: /GRV-2026-multi/ }),
  );
  expect(screen.getByRole("checkbox", { name: "Sanitation" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Public Works" })).toBeChecked();
  await user.selectOptions(
    screen.getByLabelText("Assigned department"),
    "Sanitation",
  );
  expect(screen.getByRole("checkbox", { name: "Sanitation" })).toBeDisabled();
  expect(
    screen.getByRole("checkbox", { name: "Sanitation" }),
  ).not.toBeChecked();
  await user.type(
    screen.getByLabelText("Decision note"),
    "Reviewed the waste and road repair responsibilities.",
  );
  await user.click(screen.getByRole("button", { name: "Approve routing" }));
  expect(
    await screen.findByRole("button", { name: "Start work" }),
  ).toBeInTheDocument();
  const decision = fetch.mock.calls.find(
    (call) => call[1]?.method === "PATCH",
  )!;
  expect(JSON.parse(decision[1]!.body as string)).toEqual({
    version: 2,
    status: "routed",
    department: "Sanitation",
    secondary_departments: ["Public Works"],
    note: "Reviewed the waste and road repair responsibilities.",
  });
});

it("queue filters query the server by department, role and category", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn(
    async (_url: string) =>
      new Response(
        JSON.stringify({ items: [], total: 0, limit: 25, offset: 0 }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  render(<OfficerDashboard departments={["Drainage", "Sanitation"]} />);
  expect(screen.getByLabelText("Department role")).toBeDisabled();
  await user.selectOptions(
    screen.getByLabelText("Filter by department"),
    "Sanitation",
  );
  await user.selectOptions(
    screen.getByLabelText("Department role"),
    "secondary",
  );
  await user.selectOptions(screen.getByLabelText("Category"), "Drainage");
  await screen.findByText("No complaints match this view.");
  const query = new URL(
    fetch.mock.calls.at(-1)![0] as string,
    "http://localhost",
  ).searchParams;
  expect(query.get("department")).toBe("Sanitation");
  expect(query.get("department_role")).toBe("secondary");
  expect(query.get("category")).toBe("Drainage");
});

it("a failed department filter does not display complaints from the previous queue", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("department=")
        ? new Response(
            JSON.stringify({ detail: "Queue temporarily unavailable" }),
            { status: 503 },
          )
        : new Response(
            JSON.stringify({ items: [record], total: 1, limit: 25, offset: 0 }),
            { status: 200 },
          ),
    ),
  );
  render(<OfficerDashboard departments={["Drainage", "Sanitation"]} />);
  expect(
    await screen.findByRole("button", { name: /GRV-2026-multi/ }),
  ).toBeInTheDocument();
  await user.selectOptions(
    screen.getByLabelText("Filter by department"),
    "Sanitation",
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Queue temporarily unavailable",
  );
  expect(
    screen.queryByRole("button", { name: /GRV-2026-multi/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("No complaints match this view."),
  ).not.toBeInTheDocument();
});
