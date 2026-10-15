import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../App";
import { LanguageProvider } from "./index";
import { EvidenceHighlight } from "../complaints/EvidenceHighlight";
import type { Complaint } from "../complaints/types";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function mockServer() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("/meta")
              ? {
                  departments: ["Water Supply", "Public Works"],
                  ai_configured: true,
                  voice_available: true,
                  review_threshold: 0.75,
                  prototype: true,
                }
              : { items: [], total: 0, limit: 25, offset: 0 },
          ),
        ),
    ),
  );
}

it("changes the whole website language while preserving the complaint draft", async () => {
  mockServer();
  const user = userEvent.setup();
  render(<App />);
  await user.type(
    screen.getByLabelText("Your complaint"),
    "Road romba mosama.",
  );
  await user.selectOptions(screen.getByLabelText("Website language"), "ta");
  expect(document.documentElement.lang).toBe("ta");
  expect(screen.getByLabelText("உங்கள் புகார்")).toHaveValue(
    "Road romba mosama.",
  );
  const nav = screen.getByRole("navigation");
  expect(
    within(nav).getByRole("button", { name: "புகாரைச் சமர்ப்பிக்கவும்" }),
  ).toBeVisible();
  await user.click(
    within(nav).getByRole("button", { name: "புகாரைக் கண்காணிக்கவும்" }),
  );
  expect(screen.getByLabelText("கண்காணிப்பு எண்")).toBeVisible();
  await user.selectOptions(screen.getByLabelText("Website language"), "hi");
  expect(screen.getByLabelText("ट्रैकिंग आईडी")).toBeVisible();
  await user.click(
    within(nav).getByRole("button", { name: "अधिकारी कार्यक्षेत्र" }),
  );
  expect(screen.getByLabelText("विभाग के अनुसार फ़िल्टर करें")).toBeVisible();
  expect(localStorage.getItem("acie.website-language")).toBe("hi");
});

it("restores a saved language and falls back safely for unsupported values", async () => {
  mockServer();
  localStorage.setItem("acie.website-language", "ta");
  const first = render(<App />);
  expect(screen.getByLabelText("உங்கள் புகார்")).toBeVisible();
  first.unmount();
  localStorage.setItem("acie.website-language", "unsupported");
  render(<App />);
  expect(screen.getByLabelText("Your complaint")).toBeVisible();
  expect(
    screen.queryByLabelText("Translation language"),
  ).not.toBeInTheDocument();
});

it("keeps translated department labels separate from API enum values", async () => {
  mockServer();
  const user = userEvent.setup();
  render(<App />);
  await user.selectOptions(screen.getByLabelText("Website language"), "hi");
  await user.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: "अधिकारी कार्यक्षेत्र",
    }),
  );
  const department = screen.getByLabelText("विभाग के अनुसार फ़िल्टर करें");
  await within(department).findByRole("option", { name: "जल आपूर्ति" });
  await user.selectOptions(department, "Water Supply");
  expect(department).toHaveValue("Water Supply");
  await vi.waitFor(() => {
    const requests = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(
      requests.some((url) => url.includes("department=Water+Supply")),
    ).toBe(true);
  });
});

it("preserves original citizen evidence even when it matches an interface message", () => {
  localStorage.setItem("acie.website-language", "ta");
  const complaint: Complaint = {
    tracking_id: "GRV-original",
    input_type: "text",
    original_text: "Submit complaint",
    audio_mime: null,
    created_at: "2026-10-15T00:00:00Z",
    updated_at: "2026-10-15T00:00:00Z",
    status: "awaiting_review",
    analysis_error: null,
    requires_review: false,
    review_reason: "",
    assigned_department: null,
    assigned_secondary_departments: [],
    version: 2,
    analysis_ms: 100,
    events: [],
    analysis: {
      transcript: "Submit complaint",
      normalized_complaint: "Submit complaint",
      language: "English",
      dialect: "",
      category: "Other",
      intent: "Unknown",
      primary_department: "General Administration",
      secondary_departments: [],
      urgency: "Low",
      confidence: 0.3,
      keywords: ["complaint"],
      detected_meaning: "Unclear",
      explanation: "Officer review needed.",
    },
  };
  render(
    <LanguageProvider>
      <EvidenceHighlight complaint={complaint} />
    </LanguageProvider>,
  );
  expect(screen.getByText(/“Submit complaint”/)).toBeVisible();
});

it("uses a supported browser language on the first visit", () => {
  mockServer();
  vi.stubGlobal("navigator", { ...navigator, languages: ["ta-IN", "en-IN"] });
  render(<App />);
  expect(screen.getByLabelText("Website language")).toHaveValue("ta");
  expect(screen.getByLabelText("உங்கள் புகார்")).toBeVisible();
});

it.each(["ta", "hi", "te", "kn", "ml", "mr", "bn", "gu", "pa"])(
  "loads the %s interface without replacing the current screen",
  async (language) => {
    mockServer();
    const user = userEvent.setup();
    render(<App />);
    const editor = screen.getByRole("textbox");
    await user.type(editor, "Synthetic draft.");
    await user.selectOptions(
      screen.getByLabelText("Website language"),
      language,
    );
    await vi.waitFor(() =>
      expect(editor).not.toHaveAccessibleName("Your complaint"),
    );
    expect(editor).toHaveValue("Synthetic draft.");
    expect(document.documentElement.lang).toBe(language);
    await user.selectOptions(screen.getByLabelText("Website language"), "en");
    expect(screen.getByLabelText("Your complaint")).toBe(editor);
  },
);
