import { clearTokens } from "../authStore";

describe("dashboardOverviewService", () => {
  const TEST_BASE_URL = "http://test.example.com";
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = TEST_BASE_URL;
    if (!global.fetch) {
      global.fetch = jest.fn();
    }
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.restoreAllMocks();
    clearTokens();
    global.fetch = originalFetch;
  });

  it("maps the dashboard overview API payload into the UI model", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: jest.fn().mockResolvedValue({
        total_students: 42,
        average_performance: 74.2,
        tasks_due: 5,
        performance_distribution: { A: 6, B: 14, C: 16, F: 6 },
        parent_engagement: { high: 12, moderate: 18, low: 12 },
      }),
    });

    const { getDashboardOverview } = await import("../dashboardOverviewService");
    const result = await getDashboardOverview({
      sectionId: "section-123",
      subjectId: "subject-123",
      academicYearId: "year-123",
    });

    expect(result).toEqual({
      totalStudents: 42,
      averagePerformance: 74.2,
      tasksDue: 5,
      performanceDistribution: { A: 6, B: 14, C: 16, F: 6 },
      parentEngagement: { high: 12, moderate: 18, low: 12 },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://test.example.com/api/dashboard/overview/?section_id=section-123&subject_id=subject-123&academic_year_id=year-123",
      expect.any(Object),
    );
  });
});
