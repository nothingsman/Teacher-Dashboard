// src/services/schoolService.ts

import { request } from "./apiClient";
import { getTeacherBranch } from "./authStore";
import { ensureTeacherOrgBranch } from "./profileService";

/** Matches the actual response from /api/branches/{id}/school-name/ */
interface BranchSchoolNameResponse {
  branch_id: string;
  branch_name: string;
  school_id: string;
  school_name: string;
}

/** Matches the actual response from /api/branches/{id}/ */
interface BranchDetailResponse {
  id: string;
  organization: string;
  school: string;
  name: string;
}

export async function fetchSchoolName(): Promise<string | null> {
  const orgInfo = await ensureTeacherOrgBranch();
  const branchId = orgInfo.branchId || getTeacherBranch();
  if (!branchId) return null;

  try {
    const data = await request<BranchSchoolNameResponse>(
      "GET",
      `/api/branches/${branchId}/school-name/`,
    );
    return data.school_name || null;
  } catch {
    return null;
  }
}

export async function fetchBranchName(): Promise<string | null> {
  const orgInfo = await ensureTeacherOrgBranch();
  const branchId = orgInfo.branchId || getTeacherBranch();
  if (!branchId) return null;

  try {
    const data = await request<BranchDetailResponse>(
      "GET",
      `/api/branches/${branchId}/`,
    );
    return data.name || null;
  } catch {
    return null;
  }
}
