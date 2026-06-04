import React from "react";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";

import StudentsModule from "../StudentsModule";

const triggerStudentInsightMock = jest.fn();
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
  triggerStudentInsight: (...args: unknown[]) =>
    triggerStudentInsightMock(...args),
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

describe("StudentsModule insight trigger", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    triggerStudentInsightMock.mockReset();
    getAttendanceSummaryMock.mockReset();
    getAssessmentResultsMock.mockReset();
    getParentLinksMock.mockReset();

    getAttendanceSummaryMock.mockResolvedValue(null);
    getAssessmentResultsMock.mockResolvedValue({ results: [] });
    getParentLinksMock.mockResolvedValue([]);
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

  it("shows the insight trigger button for a selected student and renders success feedback", async () => {
    triggerStudentInsightMock.mockResolvedValue({
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

    const triggerButton = Array.from(container?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.includes("Generate Insight"),
    );
    expect(triggerButton).toBeDefined();

    await act(async () => {
      triggerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(triggerStudentInsightMock).toHaveBeenCalled();
    expect(container?.textContent).toContain("Insight Status");
    expect(container?.textContent).toContain(
      "Insight generated and delivered through the parent notification flow.",
    );
  });

  it("renders the no-signal message returned by the backend", async () => {
    triggerStudentInsightMock.mockResolvedValue({
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

    const triggerButton = Array.from(container?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.includes("Generate Insight"),
    );

    await act(async () => {
      triggerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container?.textContent).toContain(
      "No current qualifying grade, attendance, homework, or message signal was found for this student.",
    );
  });
});
