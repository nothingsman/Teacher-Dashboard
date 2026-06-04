import React from "react";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";

import StudentsModule from "../StudentsModule";

const triggerStudentInsightDemoMock = jest.fn();
const getStudentBehaviourLogMock = jest.fn();
const createStudentBehaviourLogEntryMock = jest.fn();
const getAttendanceSummaryMock = jest.fn();
const getAssessmentResultsMock = jest.fn();
const getParentLinksMock = jest.fn();

jest.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

jest.mock("../../services/studentsService", () => ({
  getStudentsBySectionId: jest.fn(),
  getStudentBehaviourLog: (...args: unknown[]) =>
    getStudentBehaviourLogMock(...args),
  createStudentBehaviourLogEntry: (...args: unknown[]) =>
    createStudentBehaviourLogEntryMock(...args),
  triggerStudentInsightDemo: (...args: unknown[]) =>
    triggerStudentInsightDemoMock(...args),
}));

jest.mock("../../services/attendanceService", () => ({
  getAttendanceSummary: (...args: unknown[]) => getAttendanceSummaryMock(...args),
}));

jest.mock("../../services/assessmentResultsService", () => ({
  getAssessmentResults: (...args: unknown[]) => getAssessmentResultsMock(...args),
}));

jest.mock("../../services/parentLinksService", () => ({
  getParentLinks: (...args: unknown[]) => getParentLinksMock(...args),
}));

describe("StudentsModule demo trigger", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    triggerStudentInsightDemoMock.mockReset();
    getStudentBehaviourLogMock.mockReset();
    createStudentBehaviourLogEntryMock.mockReset();
    getAttendanceSummaryMock.mockReset();
    getAssessmentResultsMock.mockReset();
    getParentLinksMock.mockReset();

    getAttendanceSummaryMock.mockResolvedValue(null);
    getAssessmentResultsMock.mockResolvedValue({ results: [] });
    getParentLinksMock.mockResolvedValue([]);
    getStudentBehaviourLogMock.mockResolvedValue([
      {
        id: "behaviour-1",
        type: "incident",
        title: "Late assignment submission",
        description: "Submitted work after the deadline.",
        severity: "MEDIUM",
        teacherName: "Abebe T.",
        source: "Teacher Incident",
        occurredAt: "2026-05-12T08:00:00Z",
        createdAt: "2026-05-12T08:00:00Z",
      },
      {
        id: "behaviour-2",
        type: "remark",
        title: "Positive participation",
        description: "Actively participated and supported peers in class.",
        severity: "LOW",
        teacherName: "Sarah J.",
        source: "Teacher Remark",
        occurredAt: "2026-05-15T08:00:00Z",
        createdAt: "2026-05-15T08:00:00Z",
      },
    ]);
    createStudentBehaviourLogEntryMock.mockResolvedValue({
      id: "behaviour-3",
      type: "incident",
      title: "New incident",
      description: "Context",
      severity: "HIGH",
      teacherName: "Teacher",
      source: "Teacher Incident",
      occurredAt: "2026-06-01T08:00:00Z",
      createdAt: "2026-06-01T08:00:00Z",
    });
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
    root = null;
    container = null;
  });

  function renderComponent() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<StudentsModule />);
    });
  }

  it("shows the demo trigger button for a selected student and renders success feedback", async () => {
    triggerStudentInsightDemoMock.mockResolvedValue({
      created: true,
      reused_existing: false,
      category: "ACADEMICS",
      risk_band: "LOW",
      delivery_status: "DELIVERED",
      message:
        "Insight generated and delivered through the parent notification flow.",
    });

    renderComponent();

    const studentRow = Array.from(container?.querySelectorAll("tr") ?? []).find(
      (row) => row.textContent?.includes("Liya Tadesse"),
    );
    expect(studentRow).toBeDefined();

    act(() => {
      studentRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const demoButton = Array.from(container?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.includes("Run Insight Demo"),
    );
    expect(demoButton).toBeDefined();

    await act(async () => {
      demoButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(triggerStudentInsightDemoMock).toHaveBeenCalled();
    expect(container?.textContent).toContain("Insight Demo");
    expect(container?.textContent).toContain(
      "Insight generated and delivered through the parent notification flow.",
    );
  });

  it("loads behaviour log entries for the selected student", async () => {
    renderComponent();

    const studentRow = Array.from(container?.querySelectorAll("tr") ?? []).find(
      (row) => row.textContent?.includes("Liya Tadesse"),
    );

    act(() => {
      studentRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const behaviourTab = Array.from(container?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.includes("Behaviour"),
    );

    act(() => {
      behaviourTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getStudentBehaviourLogMock).toHaveBeenCalled();
    expect(container?.textContent).toContain("Late assignment submission");
    expect(container?.textContent).toContain("Positive participation");
  });

  it("renders the no-signal message returned by the backend", async () => {
    triggerStudentInsightDemoMock.mockResolvedValue({
      created: false,
      reason_code: "NO_QUALIFYING_SIGNAL",
      message:
        "No current qualifying grade, attendance, homework, or message signal was found for this student.",
    });

    renderComponent();

    const studentRow = Array.from(container?.querySelectorAll("tr") ?? []).find(
      (row) => row.textContent?.includes("Liya Tadesse"),
    );

    act(() => {
      studentRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const demoButton = Array.from(container?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.includes("Run Insight Demo"),
    );

    await act(async () => {
      demoButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container?.textContent).toContain(
      "No current qualifying grade, attendance, homework, or message signal was found for this student.",
    );
  });
});
