import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../App";
import { OfficerDashboard } from "./OfficerDashboard";

const receipt = {
  tracking_id: "GRV-2026-test-flow",
  input_type: "text",
  original_text: "Synthetic road complaint",
  audio_mime: null,
  created_at: "2026-10-14T12:00:00Z",
  updated_at: "2026-10-14T12:00:00Z",
  status: "analysis_failed",
  analysis: null,
  analysis_error: "AI analysis unavailable. Saved for officer review.",
  requires_review: true,
  review_reason: "",
  assigned_department: null,
  version: 2,
  analysis_ms: 100,
  events: [],
};
afterEach(() => vi.unstubAllGlobals());

it("receipt tracking opens the real tracking view with the saved ID", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes("/meta")
              ? {
                  departments: ["Water Supply", "Public Works"],
                  ai_configured: true,
                  voice_available: true,
                  prototype: true,
                  review_threshold: 0.75,
                }
              : receipt,
          ),
          { status: 200 },
        ),
    ),
  );
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Road damage" }));
  await userEvent.click(
    screen.getAllByRole("button", { name: "Submit complaint" }).at(-1)!,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Track progress" }),
  );
  expect(await screen.findByLabelText("Tracking ID")).toHaveValue(
    "GRV-2026-test-flow",
  );
  expect(await screen.findByText("GRV-2026-test-flow")).toBeInTheDocument();
  expect(screen.getByText("Manual review needed")).toBeInTheDocument();
});

it("manual routing cannot silently accept a default department", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ items: [receipt], total: 1, limit: 25, offset: 0 }),
          { status: 200 },
        ),
    ),
  );
  render(<OfficerDashboard departments={["Water Supply", "Public Works"]} />);
  await userEvent.click(
    await screen.findByRole("button", { name: /GRV-2026-test-flow/ }),
  );
  expect(screen.getByLabelText("Assigned department")).toHaveValue("");
  await userEvent.type(
    screen.getByLabelText("Decision note"),
    "Reviewed the original road complaint.",
  );
  expect(
    screen.getByRole("button", { name: "Approve routing" }),
  ).toBeDisabled();
  await userEvent.selectOptions(
    screen.getByLabelText("Assigned department"),
    "Public Works",
  );
  expect(screen.getByRole("button", { name: "Approve routing" })).toBeEnabled();
});
