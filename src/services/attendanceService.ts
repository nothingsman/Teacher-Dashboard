// src/services/attendanceService.ts

import { request } from "./apiClient";
import { ensureTeacherOrgBranch } from "./profileService";

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
