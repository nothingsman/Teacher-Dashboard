// src/services/homeroomService.ts

import { request } from "./apiClient";
import { getTeacherId } from "./authStore";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

export interface HomeroomAssignment {
  id: string;
  organization?: string;
  branch?: string;
  academic_year?: string;
  section?: string;
  teacher?: string;
  teacher_name?: string;
  teacher_email?: string;
  teacher_phone?: string;
  teacher_employee_id?: string;
  section_name?: string;
  grade_name?: string;
  academic_year_name?: string;
  branch_name?: string;
  organization_name?: string;
}

interface HomeroomListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: HomeroomAssignment[];
}

const MOCK_HOMEROOM: HomeroomAssignment = {
  id: "mock-hr-1",
  organization: "mock-org",
  branch: "mock-branch",
  academic_year: "mock-year-2024",
  section: "mock-section-a",
  teacher: "mock-teacher-1",
  teacher_name: "Demo Teacher",
  teacher_email: "demo@school.edu",
  section_name: "Sec A",
  grade_name: "Grade 7",
};

/**
 * Check if the currently logged-in teacher is the homeroom teacher
 * for a given section.
 * GET /api/homeroom-assignments/by-section/?section=<sectionId>&academic_year=<academicYearId>
 * Returns true when a matching assignment is found.
 */
export async function checkHomeroomStatus(
  sectionId: string,
  academicYearId?: string,
): Promise<boolean> {
  console.log("[HomeroomService] checkHomeroomStatus called", { IS_MOCK, sectionId, academicYearId });

  if (IS_MOCK) {
    const result = MOCK_HOMEROOM.section === sectionId;
    console.log("[HomeroomService] mock mode, returning", result);
    return result;
  }

  const teacherId = getTeacherId();
  if (!teacherId) {
    console.log("[HomeroomService] no teacherId, returning false");
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.set("section", sectionId);
    if (academicYearId) params.set("academic_year", academicYearId);

    const url = `/api/homeroom-assignments/?${params.toString()}`;
    console.log("[HomeroomService] making request", { url, teacherId });

    const data = await request<HomeroomListResponse>("GET", url);

    const assignments = Array.isArray(data)
      ? data
      : (data as HomeroomListResponse).results ?? [data].filter(Boolean);

    const result = assignments.some((a) => a.teacher === teacherId);
    console.log("[HomeroomService] result", { assignments, teacherId, result });
    return result;
  } catch (err) {
    console.error("[HomeroomService] error", err);
    return false;
  }
}
