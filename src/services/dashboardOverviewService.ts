import { request } from "./apiClient";
import { getSectionAnalytics, getStudentAnalytics } from "./analyticsService";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

export interface DashboardOverviewContext {
  sectionId?: string;
  sectionName?: string;
  subjectId?: string;
  subjectName?: string;
  academicYearId?: string;
}

export interface DashboardOverview {
  totalStudents: number;
  averagePerformance: number | null;
  tasksDue: number;
  performanceDistribution: { A: number; B: number; C: number; F: number };
  parentEngagement: { high: number; moderate: number; low: number };
}

type DashboardOverviewApi = {
  total_students: number;
  average_performance: number | null;
  tasks_due: number;
  performance_distribution: { A: number; B: number; C: number; F: number };
  parent_engagement: { high: number; moderate: number; low: number };
};

function buildQuery(context: DashboardOverviewContext): string {
  const params = new URLSearchParams();
  if (context.sectionId) params.set("section_id", context.sectionId);
  if (context.sectionName) params.set("section_name", context.sectionName);
  if (context.subjectId) params.set("subject_id", context.subjectId);
  if (context.subjectName) params.set("subject_name", context.subjectName);
  if (context.academicYearId) params.set("academic_year_id", context.academicYearId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function getGradeBand(score: number) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 50) return "C";
  return "F";
}

async function buildMockOverview(
  context: DashboardOverviewContext,
): Promise<DashboardOverview> {
  const [sectionAnalytics, students] = await Promise.all([
    getSectionAnalytics({
      sectionId: context.sectionId,
      sectionName: context.sectionName,
    }),
    getStudentAnalytics(),
  ]);

  const performanceDistribution = { A: 0, B: 0, C: 0, F: 0 };
  const parentEngagement = { high: 0, moderate: 0, low: 0 };

  students.forEach((student) => {
    performanceDistribution[getGradeBand(student.overallAvg)] += 1;
    if (student.parentEngagement >= 70) parentEngagement.high += 1;
    else if (student.parentEngagement >= 40) parentEngagement.moderate += 1;
    else parentEngagement.low += 1;
  });

  const averagePerformance = students.length
    ? students.reduce((sum, student) => sum + student.overallAvg, 0) / students.length
    : null;

  return {
    totalStudents: sectionAnalytics?.students ?? 0,
    averagePerformance,
    tasksDue: 0,
    performanceDistribution,
    parentEngagement,
  };
}

function mapDashboardOverview(response: DashboardOverviewApi): DashboardOverview {
  return {
    totalStudents: response.total_students,
    averagePerformance: response.average_performance,
    tasksDue: response.tasks_due,
    performanceDistribution: response.performance_distribution,
    parentEngagement: response.parent_engagement,
  };
}

export async function getDashboardOverview(
  context: DashboardOverviewContext,
): Promise<DashboardOverview> {
  if (IS_MOCK) {
    return buildMockOverview(context);
  }

  const query = buildQuery(context);
  const response = await request<DashboardOverviewApi>(
    "GET",
    `/api/dashboard/overview/${query}`,
  );
  return mapDashboardOverview(response);
}
