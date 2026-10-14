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
import { ComplaintDetail } from "./ComplaintDetail";
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
  },
  events: [
    {
      timestamp: "2026-10-14T10:00:00Z",
      status: "awaiting_review",
      department: null,
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
  expect(screen.getByLabelText("Your complaint")).toHaveValue(
    "Road romba mosama.",
  );
  expect(screen.getByLabelText("Your complaint")).toBeDisabled();
  const init = vi.mocked(fetch).mock.calls[0][1]!;
  expect(JSON.parse(init.body as string)).toEqual({
    text: "Road romba mosama.",
  });
  expect(
    (init.headers as Record<string, string>)["Idempotency-Key"],
  ).toBeTruthy();
});

it("sample chips fill the editor without submitting or inventing a result", async () => {
  render(<SubmitComplaint />);
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
    note: "Reviewed and approved road repair.",
  });
});
