// src/services/assessmentResultsService.ts

import { request } from "./apiClient";
import {
  getCached,
  setCache,
  invalidateCache,
  buildCacheKey,
} from "./apiCache";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubmissionStatus =
  | "PENDING"
  | "SUBMITTED"
  | "LATE"
  | "MISSING"
  | "GRADED";

export interface AssessmentResult {
  id: string;
  organization?: string;
  assessment?: string;
  student?: string;
  graded_by?: string;
  obtained_marks?: string;
  submission_status: SubmissionStatus;
  feedback?: string;
  parent_confirmed?: boolean;
  parent_confirmed_by?: string;
  parent_confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
  submission_status_display?: string;
  student_name?: string;
  student_roll_no?: string;
  section_name?: string;
  subject_name?: string;
  assessment_title?: string;
  total_marks?: string;
  passing_marks?: string;
  percentage?: number;
  is_below_passing?: boolean;
  graded_by_name?: string;
}

export interface AssessmentResultListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: AssessmentResult[];
}

export interface BulkGradeItem {
  student: string;
  obtained_marks: number | null;
  submission_status: SubmissionStatus;
  feedback?: string;
}

export interface BulkGradePayload {
  assessment: string;
  organization?: string;
  results: BulkGradeItem[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

let mockResults: AssessmentResult[] = [
  {
    id: "RES-001",
    student: "STU-00421",
    assessment: "ASSESS-001",
    obtained_marks: "85",
    submission_status: "GRADED",
    student_name: "Liya Tadesse",
    student_roll_no: "R001",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: 85,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-002",
    student: "STU-00398",
    assessment: "ASSESS-001",
    obtained_marks: "62",
    submission_status: "GRADED",
    student_name: "Biruk Haile",
    student_roll_no: "R002",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: 62,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-003",
    student: "STU-00412",
    assessment: "ASSESS-001",
    obtained_marks: null,
    submission_status: "MISSING",
    student_name: "Selam Girma",
    student_roll_no: "R003",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: null,
    is_below_passing: false,
  },
  {
    id: "RES-004",
    student: "STU-00355",
    assessment: "ASSESS-001",
    obtained_marks: null,
    submission_status: "PENDING",
    student_name: "Dawit Bekele",
    student_roll_no: "R004",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: null,
    is_below_passing: false,
  },
  {
    id: "RES-005",
    student: "STU-00467",
    assessment: "ASSESS-001",
    obtained_marks: "78",
    submission_status: "GRADED",
    student_name: "Hana Mekonnen",
    student_roll_no: "R005",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: 78,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-006",
    student: "STU-00480",
    assessment: "ASSESS-001",
    obtained_marks: null,
    submission_status: "SUBMITTED",
    student_name: "Yonas Alemu",
    student_roll_no: "R006",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: null,
    is_below_passing: false,
  },
  {
    id: "RES-007",
    student: "STU-00391",
    assessment: "ASSESS-001",
    obtained_marks: "91",
    submission_status: "GRADED",
    student_name: "Marta Tesfaye",
    student_roll_no: "R007",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: 91,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-008",
    student: "STU-00403",
    assessment: "ASSESS-001",
    obtained_marks: "70",
    submission_status: "GRADED",
    student_name: "Abel Negash",
    student_roll_no: "R008",
    assessment_title: "Chapter 3 Mid-Term Exam",
    total_marks: "100",
    passing_marks: "50",
    percentage: 70,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-009",
    student: "STU-00421",
    assessment: "ASSESS-003",
    obtained_marks: "42",
    submission_status: "GRADED",
    student_name: "Liya Tadesse",
    student_roll_no: "R001",
    assessment_title: "Lab Report: Titration",
    total_marks: "50",
    passing_marks: "25",
    percentage: 84,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-010",
    student: "STU-00398",
    assessment: "ASSESS-003",
    obtained_marks: null,
    submission_status: "SUBMITTED",
    student_name: "Biruk Haile",
    student_roll_no: "R002",
    assessment_title: "Lab Report: Titration",
    total_marks: "50",
    passing_marks: "25",
    percentage: null,
    is_below_passing: false,
  },
  {
    id: "RES-011",
    student: "STU-00412",
    assessment: "ASSESS-003",
    obtained_marks: "30",
    submission_status: "GRADED",
    student_name: "Selam Girma",
    student_roll_no: "R003",
    assessment_title: "Lab Report: Titration",
    total_marks: "50",
    passing_marks: "25",
    percentage: 60,
    is_below_passing: false,
    graded_by_name: "Teacher",
  },
  {
    id: "RES-012",
    student: "STU-00355",
    assessment: "ASSESS-003",
    obtained_marks: null,
    submission_status: "MISSING",
    student_name: "Dawit Bekele",
    student_roll_no: "R004",
    assessment_title: "Lab Report: Titration",
    total_marks: "50",
    passing_marks: "25",
    percentage: null,
    is_below_passing: false,
  },
];

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getAssessmentResults(
  filters: {
    assessment?: string;
    student?: string;
    submission_status?: string;
    search?: string;
    page?: number;
  } = {},
): Promise<AssessmentResultListResponse> {
  if (IS_MOCK) {
    let filtered = [...mockResults];
    if (filters.assessment)
      filtered = filtered.filter((r) => r.assessment === filters.assessment);
    if (filters.student)
      filtered = filtered.filter((r) => r.student === filters.student);
    if (filters.submission_status)
      filtered = filtered.filter(
        (r) => r.submission_status === filters.submission_status,
      );
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.student_name?.toLowerCase().includes(q) ||
          r.student_roll_no?.toLowerCase().includes(q) ||
          r.assessment_title?.toLowerCase().includes(q),
      );
    }
    return { count: filtered.length, results: filtered };
  }

  const params = new URLSearchParams();
  if (filters.assessment) params.set("assessment", filters.assessment);
  if (filters.student) params.set("student", filters.student);
  if (filters.submission_status)
    params.set("submission_status", filters.submission_status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));

  const query = params.toString();
  const endpoint = query
    ? `/api/assessment-results/?${query}`
    : "/api/assessment-results/";

  return request<AssessmentResultListResponse>("GET", endpoint);
}

export async function getResultsByAssessment(
  assessmentId: string,
): Promise<AssessmentResult[]> {
  if (IS_MOCK) {
    return mockResults.filter((r) => r.assessment === assessmentId);
  }

  const cacheKey = buildCacheKey("assessment-results-by-assessment", {
    assessment: assessmentId,
  });
  const cached = getCached<AssessmentResult[]>(cacheKey);
  if (cached) return cached;

  const data = await request<AssessmentResultListResponse>(
    "GET",
    `/api/assessment-results/by-assessment/?assessment=${assessmentId}`,
  );
  const results = data.results ?? (data as unknown as AssessmentResult[]);
  setCache(cacheKey, results);
  return results;
}

export async function bulkGrade(
  payload: BulkGradePayload,
): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    for (const item of payload.results) {
      const existing = mockResults.find(
        (r) =>
          r.student === item.student && r.assessment === payload.assessment,
      );
      if (existing) {
        existing.obtained_marks =
          item.obtained_marks !== null
            ? String(item.obtained_marks)
            : undefined;
        existing.submission_status = item.submission_status;
        if (item.feedback !== undefined) existing.feedback = item.feedback;
      } else {
        const totalMarks = "100";
        mockResults.push({
          id: `RES-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          student: item.student,
          assessment: payload.assessment,
          obtained_marks:
            item.obtained_marks !== null ? String(item.obtained_marks) : undefined,
          submission_status: item.submission_status,
          feedback: item.feedback,
          total_marks: totalMarks,
        });
      }
    }
    return { success: true };
  }

  invalidateCache("assessment-results-by-assessment");
  return request<{ success: boolean }>(
    "POST",
    "/api/assessment-results/bulk-grade/",
    payload,
  );
}
