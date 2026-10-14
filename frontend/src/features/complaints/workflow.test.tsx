import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SubmitComplaint } from "./SubmitComplaint";
import { TrackComplaint } from "./TrackComplaint";
import { OfficerDashboard } from "./OfficerDashboard";
import { useRecorder } from "./useRecorder";
import { AnalysisPanel } from "./AnalysisPanel";
import { ComplaintDetail } from "./ComplaintDetail";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { DecisionTree } from "./DecisionTree";
import { EvidenceHighlight } from "./EvidenceHighlight";
import { ExplainabilityPanel } from "./ExplainabilityPanel";
import { OfficerSummaryCard } from "./OfficerSummaryCard";
import { SelfVerificationCard } from "./SelfVerificationCard";
import { SmartFollowUpCard } from "./SmartFollowUpCard";
import { ThinkingTimeline } from "./ThinkingTimeline";
import type { Complaint } from "./types";

const complaint = {
  tracking_id: "GRV-2026-example",
  input_type: "text",
  original_text: "Road romba mosama.",
  created_at: "2026-10-14T10:00:00Z",
  updated_at: "2026-10-14T10:00:00Z",
  status: "awaiting_review",
  version: 2,
  assigned_department: null,
  assigned_secondary_departments: [],
  requires_review: false,
  review_reason: "",
  analysis_error: null,
  analysis_ms: 300,
  audio_mime: null,
  analysis: {
    transcript: "Road romba mosama.",
    normalized_complaint: "The road is severely damaged.",
    language: "Tamil and English",
    dialect: "Colloquial Tamil",
    category: "Roads",
    intent: "Repair the road",
    primary_department: "Public Works",
    secondary_departments: [],
    urgency: "High",
    confidence: 0.92,
    keywords: ["road", "mosama"],
    detected_meaning: "A damaged road",
    explanation: "Road damage belongs to Public Works.",
    smart_follow_up: {
      needed: true,
      question: "Does the issue affect:",
      category_context:
        "Geographic scope determines whether an individual valve inspection or municipal tanker is required.",
      options: [
        {
          label: "Your house only",
          urgency_impact: "Medium" as const,
          description: "Domestic connection issue",
          priority_weight: "Normal Priority",
        },
        {
          label: "Entire street",
          urgency_impact: "High" as const,
          description: "Distribution line issue",
          priority_weight: "High Priority",
        },
        {
          label: "Entire village",
          urgency_impact: "Critical" as const,
          description: "Widespread supply outage",
          priority_weight: "Emergency Priority",
        },
      ],
      answered_option: null,
    },
  },
  events: [
    {
      timestamp: "2026-10-14T10:00:00Z",
      status: "awaiting_review",
      department: null,
      secondary_departments: [],
      note: "Awaiting officer review.",
    },
  ],
};
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

it("resolved manual complaints do not still promise a future officer review", () => {
  render(
    <ComplaintDetail
      complaint={
        {
          ...complaint,
          status: "resolved",
          analysis: null,
          analysis_error:
            "AI is not configured. Your complaint is saved for officer review.",
          assigned_department: "Public Works",
          requires_review: false,
        } as Complaint
      }
    />,
  );
  expect(screen.getByText("Resolved")).toBeInTheDocument();
  expect(
    screen.queryByText("An officer will review your original complaint."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(
      "AI is not configured. Your complaint is saved for officer review.",
    ),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Your original complaint was reviewed by an officer."),
  ).toBeInTheDocument();
});

it("keeps voice controls visible while microphone permission is pending", async () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => new Promise(() => {}) },
  });
  vi.stubGlobal(
    "MediaRecorder",
    class {
      static isTypeSupported() {
        return true;
      }
    },
  );
  try {
    render(<SubmitComplaint />);
    await userEvent.click(
      screen.getByRole("button", { name: "Use your voice" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Start recording" }),
    );
    expect(
      screen.getByRole("button", { name: "Type a complaint" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Upload audio")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Submit complaint" }),
    ).toBeDisabled();
  } finally {
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

it("stops a stream granted after the pending microphone request was cancelled", async () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  let grant!: (stream: MediaStream) => void;
  const streamPromise = new Promise<MediaStream>((resolve) => {
    grant = resolve;
  });
  const stop = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => streamPromise },
  });
  vi.stubGlobal(
    "MediaRecorder",
    class {
      static isTypeSupported() {
        return true;
      }
    },
  );
  try {
    const { result } = renderHook(() => useRecorder(vi.fn()));
    let start!: Promise<void>;
    act(() => {
      start = result.current.start();
    });
    expect(result.current.pending).toBe(true);
    act(() => result.current.stop());
    await act(async () => {
      grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
      await start;
    });
    expect(stop).toHaveBeenCalledOnce();
    expect(result.current.recording).toBe(false);
    expect(result.current.pending).toBe(false);
  } finally {
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

it("reuses the submission key after a network failure", async () => {
  vi.mocked(fetch)
    .mockRejectedValueOnce(new TypeError("network failed"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify(complaint), { status: 201 }),
    );
  render(<SubmitComplaint />);
  await userEvent.type(
    screen.getByLabelText("Your complaint"),
    "Road romba mosama.",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /submit complaint/i }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "server could not be reached",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /submit complaint/i }),
  );
  expect(await screen.findByText("GRV-2026-example")).toBeInTheDocument();
  const calls = vi.mocked(fetch).mock.calls;
  expect(
    (calls[0][1]!.headers as Record<string, string>)["Idempotency-Key"],
  ).toEqual(
    (calls[1][1]!.headers as Record<string, string>)["Idempotency-Key"],
  );
});

it("an old microphone rejection cannot stop a newer recording", async () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  let rejectOld!: (error: Error) => void;
  let grantNew!: (stream: MediaStream) => void;
  const old = new Promise<MediaStream>((_resolve, reject) => {
    rejectOld = reject;
  });
  const newer = new Promise<MediaStream>((resolve) => {
    grantNew = resolve;
  });
  const stopTrack = vi.fn();
  const getUserMedia = vi
    .fn()
    .mockReturnValueOnce(old)
    .mockReturnValueOnce(newer);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal(
    "MediaRecorder",
    class {
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      mimeType = "audio/webm";
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
      }
    },
  );
  try {
    const { result, unmount } = renderHook(() => useRecorder(vi.fn()));
    let startOld!: Promise<void>;
    let startNew!: Promise<void>;
    act(() => {
      startOld = result.current.start();
    });
    act(() => result.current.stop());
    act(() => {
      startNew = result.current.start();
    });
    await act(async () => {
      grantNew({
        getTracks: () => [{ stop: stopTrack }],
      } as unknown as MediaStream);
      await startNew;
    });
    expect(result.current.recording).toBe(true);
    await act(async () => {
      rejectOld(new Error("Old permission denied"));
      await startOld;
    });
    expect(stopTrack).not.toHaveBeenCalled();
    expect(result.current.recording).toBe(true);
    unmount();
    expect(stopTrack).toHaveBeenCalledOnce();
  } finally {
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

it("a failed recorder's late stop event cannot shut down its replacement", async () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  const firstStop = vi.fn(),
    replacementStop = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce({ getTracks: () => [{ stop: firstStop }] })
        .mockResolvedValueOnce({
          getTracks: () => [{ stop: replacementStop }],
        }),
    },
  });
  class Recorder {
    static instances: Recorder[] = [];
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    mimeType = "audio/webm";
    onstop = () => {};
    onerror = () => {};
    constructor() {
      Recorder.instances.push(this);
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
    }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  try {
    const { result, unmount } = renderHook(() => useRecorder(vi.fn()));
    await act(async () => {
      await result.current.start();
    });
    act(() => Recorder.instances[0].onerror());
    await act(async () => {
      await result.current.start();
    });
    expect(Recorder.instances).toHaveLength(2);
    expect(result.current.recording).toBe(true);
    act(() => Recorder.instances[0].onstop());
    expect(replacementStop).not.toHaveBeenCalled();
    expect(result.current.recording).toBe(true);
    unmount();
    expect(replacementStop).toHaveBeenCalledOnce();
  } finally {
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

it("submits unchanged text and displays tracking and understanding", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(complaint), { status: 201 }),
  );
  render(<SubmitComplaint />);
  await userEvent.type(
    screen.getByLabelText("Your complaint"),
    "Road romba mosama.",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /submit complaint/i }),
  );
  expect(await screen.findByText("GRV-2026-example")).toBeInTheDocument();
  expect(screen.getByText("The road is severely damaged.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Your complaint")).not.toBeInTheDocument();
  const init = vi.mocked(fetch).mock.calls[0][1]!;
  expect(JSON.parse(init.body as string)).toEqual({
    text: "Road romba mosama.",
  });
  expect(
    (init.headers as Record<string, string>)["Idempotency-Key"],
  ).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "New complaint" }));
  expect(screen.getByLabelText("Your complaint")).toHaveValue("");
  expect(
    screen.queryByRole("region", { name: "Analysis" }),
  ).not.toBeInTheDocument();
});

it("sample chips fill the editor without submitting or inventing a result", async () => {
  render(<SubmitComplaint />);
  expect(
    screen.queryByRole("region", { name: "Analysis" }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Road damage" }));
  expect(screen.getByLabelText("Your complaint")).toHaveValue(
    "Road romba mosama. Enga theru la periya potholes irukku.",
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(
    screen.queryByText("Public Works", { exact: true }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Water supply" }));
  expect(screen.getByLabelText("Your complaint")).toHaveValue(
    "Enga area la moonu naala thanni varala. Please restore the water supply.",
  );
});

it("tracking opened from a receipt fetches the supplied ID automatically", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(complaint), { status: 200 }),
  );
  render(<TrackComplaint initialId="GRV-2026-example" />);
  expect(
    await screen.findByText("The road is severely damaged."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Tracking ID")).toHaveValue("GRV-2026-example");
});

it("the same audio file can be selected for a new complaint after a receipt", async () => {
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL() {
        return "blob:audio-test";
      }
      static revokeObjectURL() {}
    },
  );
  vi.mocked(fetch).mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          ...complaint,
          input_type: "voice",
          original_text: null,
        }),
        { status: 201 },
      ),
  );
  render(<SubmitComplaint />);
  await userEvent.click(screen.getByRole("button", { name: "Use your voice" }));
  const file = new File(["test audio"], "recording.wav", { type: "audio/wav" });
  await userEvent.upload(screen.getByLabelText("Upload audio"), file);
  await userEvent.click(
    screen.getByRole("button", { name: "Submit complaint" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "New complaint" }),
  );
  expect(
    screen.getByRole("button", { name: "Submit complaint" }),
  ).toBeDisabled();
  await userEvent.upload(screen.getByLabelText("Upload audio"), file);
  expect(
    screen.getByRole("button", { name: "Submit complaint" }),
  ).toBeEnabled();
});

it("shows tracking errors without a stale result", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: "Complaint not found." }), {
      status: 404,
    }),
  );
  render(<TrackComplaint />);
  await userEvent.type(
    screen.getByLabelText("Tracking ID"),
    "GRV-2026-missing",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /track complaint/i }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Complaint not found.",
  );
});

it("approves routing with version and department then updates the queue", async () => {
  vi.mocked(fetch).mockImplementation(
    async (_url, init) =>
      new Response(
        JSON.stringify(
          init?.method === "PATCH"
            ? {
                ...complaint,
                status: "routed",
                version: 3,
                assigned_department: "Public Works",
              }
            : { items: [complaint], total: 1, limit: 25, offset: 0 },
        ),
        { status: 200 },
      ),
  );
  render(<OfficerDashboard departments={["Public Works", "Sanitation"]} />);
  await userEvent.click(
    await screen.findByRole("button", { name: /GRV-2026-example/i }),
  );
  await userEvent.type(
    screen.getByLabelText("Decision note"),
    "Reviewed and approved road repair.",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /approve routing/i }),
  );
  await waitFor(() =>
    expect(screen.getByText("Start work")).toBeInTheDocument(),
  );
  const patch = vi
    .mocked(fetch)
    .mock.calls.find(([, init]) => init?.method === "PATCH")!;
  expect(JSON.parse(patch[1]!.body as string)).toEqual({
    version: 2,
    status: "routed",
    department: "Public Works",
    secondary_departments: [],
    note: "Reviewed and approved road repair.",
  });
});

it("renders the AI decision tree visualization with all 6 reasoning steps", () => {
  render(<DecisionTree complaint={complaint as unknown as Complaint} />);
  expect(
    screen.getByRole("region", { name: "AI Decision Tree" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Explainable AI Reasoning Tree/i),
  ).toBeInTheDocument();
  expect(screen.getByText("Step 01 · Input Ingestion")).toBeInTheDocument();
  expect(screen.getByText("Text Submission")).toBeInTheDocument();
  expect(
    screen.getByText("Step 02 · Language Identification"),
  ).toBeInTheDocument();
  expect(screen.getByText("Tamil and English")).toBeInTheDocument();
  expect(
    screen.getByText("Step 03 · Dialect & Regional Nuance"),
  ).toBeInTheDocument();
  expect(screen.getByText("Colloquial Tamil")).toBeInTheDocument();
  expect(
    screen.getByText("Step 04 · Complaint Category & Intent"),
  ).toBeInTheDocument();
  expect(screen.getByText("Roads")).toBeInTheDocument();
  expect(screen.getByText("Repair the road")).toBeInTheDocument();
  expect(screen.getByText("Step 05 · Urgency Assessment")).toBeInTheDocument();
  expect(screen.getByText("High Priority")).toBeInTheDocument();
  expect(screen.getByText("Step 06 · Department Routing")).toBeInTheDocument();
  expect(screen.getByText("Public Works")).toBeInTheDocument();
  expect(screen.getByText(/92% Confidence/i)).toBeInTheDocument();
});

it("renders voice input details in decision tree and handles null analysis fallback", () => {
  const voiceComplaint = {
    ...complaint,
    input_type: "voice" as const,
    audio_mime: "audio/webm",
  };
  const { rerender } = render(
    <DecisionTree complaint={voiceComplaint as unknown as Complaint} />,
  );
  expect(screen.getByText("Voice Recording")).toBeInTheDocument();
  expect(screen.getByText("audio/webm")).toBeInTheDocument();

  const manualComplaint = {
    ...complaint,
    analysis: null,
    analysis_error: "AI analysis was unavailable.",
  };
  rerender(
    <DecisionTree complaint={manualComplaint as unknown as Complaint} />,
  );
  expect(screen.getByText("Decision Tree Unavailable")).toBeInTheDocument();
  expect(screen.getByText("AI analysis was unavailable.")).toBeInTheDocument();
});

it("renders evidence highlighting with phrase glossing and reasoning bridge", () => {
  const waterComplaint = {
    ...complaint,
    original_text: "Moonu naala thanni varala.",
    analysis: {
      ...complaint.analysis,
      transcript: "Moonu naala thanni varala.",
      language: "Tamil",
      dialect: "Madurai Tamil",
      category: "Water Supply",
      intent: "Restore drinking water supply",
      primary_department: "Water Supply",
      urgency: "High",
      keywords: ["thanni", "naala"],
      detected_meaning: "No water supply for 3 days",
      explanation:
        "Water outage lasting 3 days requires urgent restoration by Water Supply.",
      evidence_highlights: [
        {
          phrase: "Moonu naala",
          translation: "3 Days",
          significance:
            "Duration of essential service deprivation driving High urgency",
        },
        {
          phrase: "thanni",
          translation: "Water Supply",
          significance: "Civic resource assigned to Water Supply Department",
        },
      ],
    },
  };

  render(
    <EvidenceHighlight complaint={waterComplaint as unknown as Complaint} />,
  );
  expect(
    screen.getByRole("region", { name: "Evidence Highlighting" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Evidence Highlighting & Translation"),
  ).toBeInTheDocument();
  expect(screen.getByText(/Moonu naala thanni varala/i)).toBeInTheDocument();
  expect(screen.getByText("Moonu naala")).toBeInTheDocument();
  expect(screen.getByText("3 Days")).toBeInTheDocument();
  expect(screen.getByText("thanni")).toBeInTheDocument();
  expect(screen.getByText("Water Supply")).toBeInTheDocument();
  expect(
    screen.getByText(/Reasoning Bridge · Why Urgency is High/i),
  ).toBeInTheDocument();
});

it("renders multi-dimensional confidence meter with high-confidence auto-route status", () => {
  const highComplaint = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      confidence: 0.97,
      confidence_breakdown: {
        understanding: 0.98,
        routing: 0.97,
        urgency: 0.95,
        overall: 0.97,
      },
    },
  };

  render(<ConfidenceMeter complaint={highComplaint as unknown as Complaint} />);
  expect(
    screen.getByRole("region", { name: "AI Confidence Meter" }),
  ).toBeInTheDocument();
  expect(screen.getByText("AI Confidence Meter")).toBeInTheDocument();
  expect(screen.getByText("Understanding")).toBeInTheDocument();
  expect(screen.getByText("98%")).toBeInTheDocument();
  expect(screen.getByText("Routing")).toBeInTheDocument();
  expect(screen.getAllByText("97%").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Urgency")).toBeInTheDocument();
  expect(screen.getByText("95%")).toBeInTheDocument();
  expect(screen.getByText(/Auto-Route \/ Ready/i)).toBeInTheDocument();
  expect(screen.getByText(/High Confidence \(97%\)/i)).toBeInTheDocument();
});

it("renders review required when overall confidence is below threshold", () => {
  const lowComplaint = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      confidence: 0.45,
      confidence_breakdown: {
        understanding: 0.55,
        routing: 0.45,
        urgency: 0.4,
        overall: 0.45,
      },
    },
  };

  render(
    <ConfidenceMeter
      complaint={lowComplaint as unknown as Complaint}
      threshold={0.75}
    />,
  );
  expect(screen.getByText(/Review Required/i)).toBeInTheDocument();
  expect(
    screen.getByText(/Needs Officer Verification \(45%\)/i),
  ).toBeInTheDocument();
  expect(screen.getAllByText("45%").length).toBeGreaterThanOrEqual(1);
});

it("renders the 6-point officer executive summary card and supports 1-click decision note pre-fill", async () => {
  const onSelectAction = vi.fn();
  const summaryComplaint = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      officer_summary: {
        problem: "Water Supply Outage",
        area: "Ward 18",
        duration: "3 Days",
        priority: "High" as const,
        department: "Water Supply",
        suggested_action: "Inspect pipeline and restore feeder valves.",
      },
    },
  };

  render(
    <OfficerSummaryCard
      complaint={summaryComplaint as unknown as Complaint}
      onSelectAction={onSelectAction}
    />,
  );

  expect(
    screen.getByRole("region", { name: "Officer Executive Summary" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Officer 10-Second Executive Summary"),
  ).toBeInTheDocument();
  expect(screen.getByText("Water Supply Outage")).toBeInTheDocument();
  expect(screen.getByText("Ward 18")).toBeInTheDocument();
  expect(screen.getByText("3 Days")).toBeInTheDocument();
  expect(screen.getByText("High Priority")).toBeInTheDocument();
  expect(screen.getByText("Water Supply")).toBeInTheDocument();
  expect(
    screen.getByText(/Inspect pipeline and restore feeder valves/i),
  ).toBeInTheDocument();

  const useButton = screen.getByRole("button", {
    name: /use as decision note/i,
  });
  await userEvent.click(useButton);
  expect(onSelectAction).toHaveBeenCalledWith(
    "Inspect pipeline and restore feeder valves.",
  );
});

it("renders dual-AI self verification with consensus audit result", () => {
  const verifiedComplaint = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      self_verification: {
        status: "Verified" as const,
        critique:
          "Critic pass audited raw statement and confirmed Public Works allocation.",
        agreement: true,
        verification_confidence: 0.97,
      },
    },
  };

  render(
    <SelfVerificationCard
      complaint={verifiedComplaint as unknown as Complaint}
    />,
  );
  expect(
    screen.getByRole("region", { name: "AI Self Verification" }),
  ).toBeInTheDocument();
  expect(screen.getByText("AI Self-Verification Pass")).toBeInTheDocument();
  expect(screen.getByText("Verified (Correct)")).toBeInTheDocument();
  expect(screen.getByText(/1st AI · Primary Generator/i)).toBeInTheDocument();
  expect(screen.getByText(/2nd AI · Critic Review/i)).toBeInTheDocument();
  expect(screen.getByText("Consensus Reached (Agreed)")).toBeInTheDocument();
  expect(
    screen.getByText(/Critic pass audited raw statement/i),
  ).toBeInTheDocument();
});

it("renders disputed / flagged state when self-verification detects conflict", () => {
  const disputedComplaint = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      self_verification: {
        status: "Flagged for Review" as const,
        critique:
          "Critic model identified conflicting electrical and drainage concerns.",
        agreement: false,
        verification_confidence: 0.62,
      },
    },
  };

  render(
    <SelfVerificationCard
      complaint={disputedComplaint as unknown as Complaint}
    />,
  );
  expect(screen.getByText("Disputed / Review Needed")).toBeInTheDocument();
  expect(
    screen.getByText(/Critic model identified conflicting/i),
  ).toBeInTheDocument();
});

it("renders ThinkingTimeline with text steps and advances dynamically", async () => {
  vi.useFakeTimers();
  try {
    render(<ThinkingTimeline mode="text" stepIntervalMs={100} />);
    expect(
      screen.getByText("AI Cognitive Reasoning Pipeline"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ingesting Citizen Text...")).toBeInTheDocument();
    expect(screen.getByText("Normalizing Vocabulary...")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 10")).toBeInTheDocument();

    // Advance 1 step
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Step 2 of 10")).toBeInTheDocument();

    // Advance to end
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Step 10 of 10")).toBeInTheDocument();
    expect(screen.getByText("Finalizing Analysis...")).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it("renders ThinkingTimeline with voice steps", () => {
  render(<ThinkingTimeline mode="voice" />);
  expect(screen.getByText("Receiving Voice Stream...")).toBeInTheDocument();
  expect(screen.getByText("Converting Speech to Text...")).toBeInTheDocument();
  expect(screen.getByText("Finding Complaint & Intent...")).toBeInTheDocument();
});

it("renders ThinkingTimeline in AnalysisPanel when pending is true", () => {
  render(<AnalysisPanel complaint={null} pending={true} mode="voice" />);
  expect(screen.getByLabelText("AI Thinking Timeline")).toBeInTheDocument();
  expect(screen.getByText("Receiving Voice Stream...")).toBeInTheDocument();
});

it("renders SmartFollowUpCard with question, options and permits priority clarification", async () => {
  const user = userEvent.setup();
  const mockUpdated = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      urgency: "Critical" as const,
      smart_follow_up: {
        ...complaint.analysis.smart_follow_up!,
        answered_option: "Entire village",
      },
    },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUpdated,
    }),
  );

  const onUpdate = vi.fn();
  render(
    <SmartFollowUpCard
      complaint={complaint as unknown as Complaint}
      onComplaintUpdated={onUpdate}
    />,
  );

  expect(
    screen.getByText("AI Smart Follow-up Clarification"),
  ).toBeInTheDocument();
  expect(screen.getByText("Does the issue affect:")).toBeInTheDocument();
  expect(screen.getByText("Your house only")).toBeInTheDocument();
  expect(screen.getByText("Entire street")).toBeInTheDocument();
  expect(screen.getByText("Entire village")).toBeInTheDocument();

  // Select Entire village option
  const villageOption = screen.getByDisplayValue("Entire village");
  await user.click(villageOption);

  // Click confirm button
  const confirmBtn = screen.getByRole("button", {
    name: /Confirm & Update Priority/i,
  });
  await user.click(confirmBtn);

  await waitFor(() => {
    expect(onUpdate).toHaveBeenCalledWith(mockUpdated);
  });
});

it("renders answered state when smart follow-up has already been clarified", () => {
  const answeredComplaint = {
    ...complaint,
    analysis: {
      ...complaint.analysis,
      urgency: "Critical" as const,
      smart_follow_up: {
        ...complaint.analysis.smart_follow_up!,
        answered_option: "Entire village",
      },
    },
  };

  render(
    <SmartFollowUpCard complaint={answeredComplaint as unknown as Complaint} />,
  );

  expect(
    screen.getByText("AI Smart Clarification Confirmed"),
  ).toBeInTheDocument();
  expect(screen.getByText("Entire village")).toBeInTheDocument();
  expect(screen.getByText("Critical Priority")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Change Answer/i }),
  ).toBeInTheDocument();
});

it("renders ExplainabilityPanel with all 7 criteria matching routing rationale", () => {
  render(<ExplainabilityPanel complaint={complaint as unknown as Complaint} />);

  expect(screen.getByText("Why was this routed?")).toBeInTheDocument();
  expect(screen.getByText("7 of 7 Criteria Verified")).toBeInTheDocument();
  expect(screen.getByText("✔ Detected Tamil and English")).toBeInTheDocument();
  expect(screen.getByText("✔ Recognized dialect phrase")).toBeInTheDocument();
  expect(screen.getByText("✔ Complaint mapped to Roads")).toBeInTheDocument();
  expect(screen.getByText("✔ Essential Service")).toBeInTheDocument();
  expect(screen.getByText("✔ Duration detected")).toBeInTheDocument();
  expect(screen.getByText("✔ High Priority")).toBeInTheDocument();
  expect(
    screen.getByText("✔ Routed to Public Works Department"),
  ).toBeInTheDocument();
});

it("renders ExplainabilityPanel with Water Department specific routing as per user specification", () => {
  const waterComplaint = {
    ...complaint,
    assigned_department: "Water Supply",
    analysis: {
      ...complaint.analysis,
      language: "Tamil",
      dialect: "Madurai Tamil",
      category: "Water Supply",
      intent: "Restore drinking water supply",
      primary_department: "Water Supply",
      urgency: "High" as const,
      officer_summary: {
        problem: "Water Supply",
        area: "Ward 18",
        duration: "3 Days",
        priority: "High" as const,
        department: "Water Supply",
        suggested_action: "Inspect pipeline and restore water flow",
      },
    },
  };

  render(
    <ExplainabilityPanel complaint={waterComplaint as unknown as Complaint} />,
  );

  expect(screen.getByText("✔ Detected Tamil")).toBeInTheDocument();
  expect(screen.getByText("✔ Recognized dialect phrase")).toBeInTheDocument();
  expect(
    screen.getByText("✔ Complaint mapped to Water Supply"),
  ).toBeInTheDocument();
  expect(screen.getByText("✔ Essential Service")).toBeInTheDocument();
  expect(screen.getByText("✔ Duration detected")).toBeInTheDocument();
  expect(screen.getByText("✔ High Priority")).toBeInTheDocument();
  expect(
    screen.getByText("✔ Routed to Water Supply Department"),
  ).toBeInTheDocument();
});
