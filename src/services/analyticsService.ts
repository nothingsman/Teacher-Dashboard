// Feature: backend-integration-refactor
// Service: analyticsService.ts
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5

import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

const SUBJECT_COLOR_MAP: Record<string, string> = {
  Mathematics: '#185FA5',
  Physics: '#E24B4A',
  History: '#1D9E75',
  English: '#BA7517',
  Chemistry: '#0891B2',
};

const MOCK_SECTION_ALIASES: Record<string, string> = {
  'mock-section-a': 'Grade 7 — Section A',
  'mock-section-b': 'Grade 7 — Section B',
  'mock-section-c': 'Grade 8 — Section A',
  'Sec A': 'Grade 7 — Section A',
  'Sec B': 'Grade 7 — Section B',
};

// ---------------------------------------------------------------------------
// Domain Types
// ---------------------------------------------------------------------------

export interface SectionAnalytics {
  students: number;
  sectionAvg: number;
  sectionAvgTrend: number[];
  topPerformersTrend: number[];
  atRiskTrend: number[];
  gradeDistribution: { A: number; B: number; C: number; F: number };
  attendance: { present: number; late: number; absent: number };
  chronicAbsentees: Array<{ name: string; initials: string; rate: number }>;
  subjectAvgs: Array<{ subject: string; avg: number; color: string }>;
  submissions: { submitted: number; late: number; missing: number };
  parentEngagement: { high: number; moderate: number; low: number };
  activityPerformance: Array<{
    title: string;
    type: string;
    avgPct: number;
    avgScore: string;
    grade: string;
    submitted: number;
    total: number;
  }>;
}

export interface StudentAnalytics {
  id: string;
  name: string;
  avatar: string;
  overallAvg: number;
  trend: number[];
  subjects: Record<string, number>;
  attendance: number;
  parentEngagement: number;
  submissions: { submitted: number; late: number; missing: number };
  recentGrades: number[];
  risk: string;
}

export interface SectionAnalyticsLookup {
  sectionId?: string;
  sectionName?: string;
}

type SectionAnalyticsApi = {
  section_id?: string;
  section_name?: string;
  students: number;
  section_avg: number;
  section_avg_trend: number[];
  top_performers_trend: number[];
  at_risk_trend: number[];
  grade_distribution: { A: number; B: number; C: number; F: number };
  attendance: { present: number; late: number; absent: number };
  chronic_absentees: Array<{ name: string; initials: string; rate: number }>;
  subject_averages: Array<{ subject: string; avg: number; color?: string }>;
  submissions: { submitted: number; late: number; missing: number };
  parent_engagement: { high: number; moderate: number; low: number };
  activity_performance: Array<{
    title: string;
    type: string;
    avg_pct: number;
    avg_score: string;
    grade: string;
    submitted: number;
    total: number;
  }>;
};

type StudentAnalyticsApi = {
  id: string;
  name: string;
  avatar: string;
  overall_avg: number;
  trend: number[];
  subjects: Record<string, number>;
  attendance: number;
  parent_engagement: number;
  submissions: { submitted: number; late: number; missing: number };
  recent_grades: number[];
  risk: string;
};

type StudentAnalyticsApiResponse =
  | StudentAnalyticsApi[]
  | {
      count?: number;
      results?: StudentAnalyticsApi[];
    };

// ---------------------------------------------------------------------------
// Mock data — copied from AnalyticsModule.tsx (SECTION_DATA)
// ---------------------------------------------------------------------------

export const SECTION_DATA: Record<string, SectionAnalytics> = {
  "Grade 7 — Section A": {
    students: 42,
    sectionAvg: 74.2,
    sectionAvgTrend: [68, 70, 71, 73, 74, 74.2],
    topPerformersTrend: [85, 87, 88, 89, 90, 91],
    atRiskTrend: [48, 46, 45, 44, 43, 42],
    gradeDistribution: { A: 6, B: 14, C: 16, F: 6 },
    attendance: { present: 87, late: 7, absent: 6 },
    chronicAbsentees: [
      { name: "Dawit Bekele", initials: "DB", rate: 65 },
      { name: "Selam Girma", initials: "SG", rate: 79 }
    ],
    subjectAvgs: [
      { subject: "Mathematics", avg: 74, color: "#185FA5" },
      { subject: "Physics",     avg: 65, color: "#E24B4A" },
      { subject: "History",     avg: 81, color: "#1D9E75" },
      { subject: "English",     avg: 62, color: "#BA7517" }
    ],
    submissions: { submitted: 146, late: 12, missing: 7 },
    parentEngagement: { high: 3, moderate: 3, low: 2 },
    activityPerformance: [
      { title: "Chapter 3 HW",    type: "Homework",   avgPct: 72, avgScore: "28/42",  grade: "C", submitted: 40, total: 42 },
      { title: "Mid-Term Quiz",   type: "Quiz",        avgPct: 86, avgScore: "21/30",  grade: "B", submitted: 42, total: 42 },
      { title: "Mid-Term Exam",   type: "Exam",        avgPct: 71, avgScore: "40/100", grade: "C", submitted: 38, total: 42 },
      { title: "Newton Lab Rpt",  type: "Lab Report",  avgPct: 88, avgScore: "44/50",  grade: "B", submitted: 39, total: 42 },
      { title: "WWI Essay",       type: "Essay",       avgPct: 69, avgScore: "28/40",  grade: "C", submitted: 35, total: 42 }
    ]
  },
  "Grade 7 — Section B": {
    students: 38,
    sectionAvg: 70.1,
    sectionAvgTrend: [65, 67, 68, 69, 70, 70.1],
    topPerformersTrend: [82, 83, 84, 85, 86, 87],
    atRiskTrend: [52, 50, 49, 48, 47, 46],
    gradeDistribution: { A: 4, B: 11, C: 17, F: 6 },
    attendance: { present: 83, late: 9, absent: 8 },
    chronicAbsentees: [
      { name: "Abel Negash", initials: "AN", rate: 71 }
    ],
    subjectAvgs: [
      { subject: "Mathematics", avg: 70, color: "#185FA5" },
      { subject: "Physics",     avg: 62, color: "#E24B4A" },
      { subject: "History",     avg: 77, color: "#1D9E75" },
      { subject: "English",     avg: 71, color: "#BA7517" }
    ],
    submissions: { submitted: 128, late: 18, missing: 12 },
    parentEngagement: { high: 2, moderate: 4, low: 2 },
    activityPerformance: [
      { title: "Chapter 3 HW",  type: "Homework", avgPct: 68, avgScore: "24/42", grade: "C", submitted: 36, total: 38 },
      { title: "Mid-Term Quiz", type: "Quiz",      avgPct: 80, avgScore: "19/30", grade: "B", submitted: 38, total: 38 },
      { title: "Mid-Term Exam", type: "Exam",      avgPct: 67, avgScore: "38/100", grade: "C", submitted: 35, total: 38 }
    ]
  },
  "Grade 8 — Section A": {
    students: 40,
    sectionAvg: 78.5,
    sectionAvgTrend: [72, 74, 75, 77, 78, 78.5],
    topPerformersTrend: [90, 91, 91, 92, 93, 94],
    atRiskTrend: [44, 43, 42, 41, 40, 39],
    gradeDistribution: { A: 10, B: 18, C: 9, F: 3 },
    attendance: { present: 92, late: 5, absent: 3 },
    chronicAbsentees: [],
    subjectAvgs: [
      { subject: "Physics",     avg: 80, color: "#7C3AED" },
      { subject: "Chemistry",   avg: 77, color: "#0891B2" },
      { subject: "Mathematics", avg: 79, color: "#185FA5" }
    ],
    submissions: { submitted: 162, late: 8, missing: 3 },
    parentEngagement: { high: 6, moderate: 2, low: 1 },
    activityPerformance: [
      { title: "Newton Lab Rpt", type: "Lab Report", avgPct: 88, avgScore: "44/50", grade: "B", submitted: 40, total: 40 },
      { title: "Cell Division",  type: "Project",    avgPct: 76, avgScore: "38/50", grade: "B", submitted: 37, total: 40 }
    ]
  }
};

// ---------------------------------------------------------------------------
// Mock data — copied from AnalyticsCharts.tsx (STUDENT_ANALYTICS)
// ---------------------------------------------------------------------------

const STUDENT_ANALYTICS_DATA: StudentAnalytics[] = [
  {
    id: "STU-00421", name: "Liya Tadesse", avatar: "LT",
    overallAvg: 91, trend: [72, 78, 83, 88, 91, 94],
    subjects: { Mathematics: 94, Physics: 88, History: 91 },
    attendance: 97, parentEngagement: 85,
    submissions: { submitted: 18, late: 1, missing: 0 },
    recentGrades: [94, 91, 88, 96, 89],
    risk: "none"
  },
  {
    id: "STU-00398", name: "Biruk Haile", avatar: "BH",
    overallAvg: 73, trend: [80, 77, 74, 70, 73, 71],
    subjects: { Mathematics: 69, Physics: 75, History: 78 },
    attendance: 88, parentEngagement: 40,
    submissions: { submitted: 15, late: 3, missing: 1 },
    recentGrades: [71, 68, 75, 70, 73],
    risk: "watch"
  },
  {
    id: "STU-00412", name: "Selam Girma", avatar: "SG",
    overallAvg: 55, trend: [61, 58, 54, 52, 55, 53],
    subjects: { Mathematics: 52, Physics: 58, History: 55 },
    attendance: 79, parentEngagement: 20,
    submissions: { submitted: 12, late: 4, missing: 3 },
    recentGrades: [53, 58, 51, 55, 52],
    risk: "critical"
  },
  {
    id: "STU-00355", name: "Dawit Bekele", avatar: "DB",
    overallAvg: 36, trend: [45, 41, 38, 35, 36, 33],
    subjects: { Mathematics: 32, Physics: 38, History: 40 },
    attendance: 65, parentEngagement: 10,
    submissions: { submitted: 8, late: 2, missing: 9 },
    recentGrades: [33, 38, 30, 36, 34],
    risk: "critical"
  },
  {
    id: "STU-00467", name: "Hana Mekonnen", avatar: "HM",
    overallAvg: 81, trend: [74, 76, 79, 81, 80, 83],
    subjects: { Mathematics: 83, Physics: 79, History: 81 },
    attendance: 93, parentEngagement: 70,
    submissions: { submitted: 17, late: 1, missing: 1 },
    recentGrades: [83, 80, 82, 85, 79],
    risk: "none"
  },
  {
    id: "STU-00480", name: "Yonas Alemu", avatar: "YA",
    overallAvg: 97, trend: [88, 91, 93, 95, 96, 97],
    subjects: { Mathematics: 98, Physics: 96, History: 97 },
    attendance: 99, parentEngagement: 95,
    submissions: { submitted: 19, late: 0, missing: 0 },
    recentGrades: [97, 98, 96, 99, 95],
    risk: "none"
  },
  {
    id: "STU-00391", name: "Marta Tesfaye", avatar: "MT",
    overallAvg: 63, trend: [55, 58, 60, 63, 61, 65],
    subjects: { Mathematics: 61, Physics: 65, History: 63 },
    attendance: 85, parentEngagement: 55,
    submissions: { submitted: 14, late: 3, missing: 2 },
    recentGrades: [65, 62, 67, 60, 63],
    risk: "watch"
  },
  {
    id: "STU-00403", name: "Abel Negash", avatar: "AN",
    overallAvg: 70, trend: [65, 67, 68, 71, 70, 72],
    subjects: { Mathematics: 68, Physics: 72, History: 71 },
    attendance: 91, parentEngagement: 60,
    submissions: { submitted: 16, late: 2, missing: 1 },
    recentGrades: [72, 69, 71, 70, 73],
    risk: "watch"
  }
];

// In-memory store for student analytics (mock mode)
let mockStudentStore: StudentAnalytics[] = [...STUDENT_ANALYTICS_DATA];

function resolveMockSectionName(lookup: SectionAnalyticsLookup): string | null {
  const candidates = [lookup.sectionName, lookup.sectionId];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (SECTION_DATA[candidate]) return candidate;
    if (MOCK_SECTION_ALIASES[candidate]) return MOCK_SECTION_ALIASES[candidate];
  }
  return null;
}

function mapSectionAnalytics(response: SectionAnalyticsApi): SectionAnalytics {
  return {
    students: response.students,
    sectionAvg: response.section_avg,
    sectionAvgTrend: response.section_avg_trend,
    topPerformersTrend: response.top_performers_trend,
    atRiskTrend: response.at_risk_trend,
    gradeDistribution: response.grade_distribution,
    attendance: response.attendance,
    chronicAbsentees: response.chronic_absentees,
    subjectAvgs: response.subject_averages.map((item) => ({
      subject: item.subject,
      avg: item.avg,
      color: item.color ?? SUBJECT_COLOR_MAP[item.subject] ?? '#64748B',
    })),
    submissions: response.submissions,
    parentEngagement: response.parent_engagement,
    activityPerformance: response.activity_performance.map((item) => ({
      title: item.title,
      type: item.type,
      avgPct: item.avg_pct,
      avgScore: item.avg_score,
      grade: item.grade,
      submitted: item.submitted,
      total: item.total,
    })),
  };
}

function mapStudentAnalytics(response: StudentAnalyticsApi): StudentAnalytics {
  return {
    id: response.id,
    name: response.name,
    avatar: response.avatar,
    overallAvg: response.overall_avg,
    trend: response.trend,
    subjects: response.subjects,
    attendance: response.attendance,
    parentEngagement: response.parent_engagement,
    submissions: response.submissions,
    recentGrades: response.recent_grades,
    risk: response.risk,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Returns the SectionAnalytics object for the given section name,
 * or null if the section is not found in the mock data.
 *
 * Requirements: 5.1, 5.2, 5.5
 */
export async function getSectionAnalytics(
  lookup: string | SectionAnalyticsLookup,
): Promise<SectionAnalytics | null> {
  const sectionLookup =
    typeof lookup === 'string' ? { sectionName: lookup } : lookup;
  const mockSectionName = resolveMockSectionName(sectionLookup);

  if (IS_MOCK) {
    return mockSectionName ? SECTION_DATA[mockSectionName] ?? null : null;
  }

  const sectionIdentifier = sectionLookup.sectionId ?? sectionLookup.sectionName;
  if (!sectionIdentifier) return mockSectionName ? SECTION_DATA[mockSectionName] ?? null : null;

  try {
    const response = await request<SectionAnalyticsApi>(
      'GET',
      `/api/analytics/sections/${encodeURIComponent(sectionIdentifier)}/`,
    );
    return mapSectionAnalytics(response);
  } catch {
    return mockSectionName ? SECTION_DATA[mockSectionName] ?? null : null;
  }
}

/**
 * Returns all student analytics records.
 *
 * Requirements: 5.1, 5.3, 5.4
 */
export async function getStudentAnalytics(): Promise<StudentAnalytics[]> {
  if (IS_MOCK) {
    return [...mockStudentStore];
  }
  try {
    const response = await request<StudentAnalyticsApiResponse>(
      'GET',
      '/api/analytics/students/',
    );
    const results = Array.isArray(response) ? response : (response.results ?? []);
    return results.map(mapStudentAnalytics);
  } catch {
    return [...mockStudentStore];
  }
}
