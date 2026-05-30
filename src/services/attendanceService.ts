// src/services/attendanceService.ts

import { request } from "./apiClient";
import { ensureTeacherOrgBranch } from "./profileService";
import { getStudentsBySectionId } from "./studentsService";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type AttendanceCreatePayload = {
  organization?: string;
  branch?: string;
  academic_year?: string;
  section: string;
  student: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remarks?: string;
  client_side_id?: string;
};

export type AttendanceRecord = AttendanceCreatePayload & {
  id: string;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type AttendanceListItem = AttendanceRecord & {
  student_name?: string;
  student_roll_no?: string;
  section_name?: string;
  grade_name?: string;
  academic_year_name?: string;
  branch_name?: string;
  recorded_by_name?: string;
  status_display?: string;
  needs_reason?: boolean;
};

export type AttendanceListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AttendanceListItem[];
};

export type AttendanceUpdatePayload = Partial<AttendanceCreatePayload>;
export type AttendanceBulkRecord = {
  student: string;
  status: AttendanceStatus;
  remarks?: string;
  client_side_id?: string;
};

export type AttendanceBulkSubmitArgs = {
  section: string;
  academic_year: string;
  date: string; // YYYY-MM-DD
  records: AttendanceBulkRecord[];
};

export type AttendanceBulkSubmitRequest = AttendanceBulkSubmitArgs & {
  organization: string;
  branch: string;
};
export type AttendanceBulkResponse = AttendanceListItem[] | AttendanceListResponse;

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function createAttendanceRecord(
  payload: Omit<AttendanceCreatePayload, "organization" | "branch">,
): Promise<AttendanceRecord | null> {
  if (IS_MOCK) {
    return {
      id: `ATT-${Date.now()}`,
      ...payload,
    } as AttendanceRecord;
  }

  const { organizationId, branchId } = await ensureTeacherOrgBranch();

  const body: AttendanceCreatePayload = {
    ...payload,
    organization: organizationId,
    branch: branchId,
  };

  return request<AttendanceRecord>("POST", "/api/attendance/", body);
}

export async function updateAttendanceRecord(
  id: string,
  payload: AttendanceUpdatePayload,
): Promise<AttendanceRecord | null> {
  if (IS_MOCK) {
    return {
      id,
      ...(payload as AttendanceCreatePayload),
    } as AttendanceRecord;
  }

  return request<AttendanceRecord>("PATCH", `/api/attendance/${id}/`, payload);
}

export async function getAttendanceBySectionDate(
  sectionId: string,
  date: string,
): Promise<AttendanceListItem[]> {
  if (IS_MOCK) {
    const students = await getStudentsBySectionId(sectionId);
    return students.map((student) => ({
      id: `ATT-${student.id}`,
      section: sectionId,
      student: student.id,
      date,
      status: "PRESENT",
      student_name: student.name,
      student_roll_no: student.rollNo,
      section_name: student.sectionName ?? student.section,
      grade_name: student.gradeName ?? student.grade,
      academic_year_name: student.academicYearName,
      branch_name: student.branchName,
    }));
  }

  const endpoint = `/api/attendance/by-section/?section=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`;
  const data = await request<AttendanceListResponse | AttendanceListItem[]>(
    "GET",
    endpoint,
  );

  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export async function bulkSubmitAttendance(
  args: AttendanceBulkSubmitArgs,
): Promise<AttendanceListItem[]> {
  if (IS_MOCK) {
    return args.records.map((record) => ({
      id: `ATT-${record.student}-${args.date}`,
      section: args.section,
      academic_year: args.academic_year,
      student: record.student,
      date: args.date,
      status: record.status,
      remarks: record.remarks,
      client_side_id: record.client_side_id,
      student_name: "Student",
    }));
  }

  const { organizationId, branchId } = await ensureTeacherOrgBranch();

  const sanitizedRecords: AttendanceBulkRecord[] = args.records.map((record) => ({
    ...record,
    client_side_id:
      record.client_side_id && isValidUuid(record.client_side_id)
        ? record.client_side_id
        : undefined,
  }));

  const requestBody: AttendanceBulkSubmitRequest = {
    organization: organizationId,
    branch: branchId,
    section: args.section,
    academic_year: args.academic_year,
    date: args.date,
    records: sanitizedRecords,
  };

  const data = await request<AttendanceBulkResponse>(
    "POST",
    "/api/attendance/bulk-submit/",
    requestBody,
  );

  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

// ─── Attendance Summary ────────────────────────────────────────────────────────

export interface AttendanceSummary {
  id: string;
  organization?: string;
  student?: string;
  student_name?: string;
  academic_year?: string;
  academic_year_name?: string;
  total_present: number;
  total_absent: number;
  total_late: number;
  total_excused: number;
  total_school_days: number;
  attendance_rate: number;
  last_updated?: string;
}

interface AttendanceSummaryListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: AttendanceSummary[];
}

/**
 * Fetch attendance summary for a student.
 * GET /api/attendance-summaries/?student=<studentId>&academic_year=<academicYearId>
 */
export async function getAttendanceSummary(
  studentId: string,
  academicYearId?: string,
): Promise<AttendanceSummary | null> {
  if (IS_MOCK) {
    return {
      id: "mock-summary",
      student: studentId,
      student_name: "Mock Student",
      total_present: 18,
      total_absent: 2,
      total_late: 1,
      total_excused: 0,
      total_school_days: 21,
      attendance_rate: 85.7,
    };
  }

  const params = new URLSearchParams();
  params.set("student", studentId);
  if (academicYearId) params.set("academic_year", academicYearId);

  try {
    const data = await request<AttendanceSummaryListResponse>(
      "GET",
      `/api/attendance-summaries/?${params.toString()}`,
    );
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}
