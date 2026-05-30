// src/services/schoolService.ts

import { request } from "./apiClient";
import { getTeacherBranch } from "./authStore";
import { ensureTeacherOrgBranch } from "./profileService";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

export interface BranchSchool {
  id: string;
  organization: string;
  school: string;
  name: string;
  address?: string;
  city?: string;
  region?: string;
  contact_phone?: string;
  contact_email?: string;
  status: string;
}

export async function fetchSchoolName(): Promise<string | null> {
  if (IS_MOCK) {
    return "EduGov School";
  }

  // Ensure branch ID is resolved from the teacher profile first
  const orgInfo = await ensureTeacherOrgBranch();
  const branchId = orgInfo.branchId || getTeacherBranch();
  if (!branchId) return null;

  try {
    const data = await request<BranchSchool>(
      "GET",
      `/api/branches/${branchId}/school-name/`,
    );
    return data.name || null;
  } catch {
    return null;
  }
}
