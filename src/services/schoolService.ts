// src/services/schoolService.ts

import { request } from "./apiClient";
import { getTeacherBranch } from "./authStore";
import { ensureTeacherOrgBranch } from "./profileService";

/** Matches the actual response from /api/branches/{id}/school-name/ */
interface BranchSchoolNameResponse {
  branch_id: string;
  branch_name: string;
  school_id: string;
  logo: string;
  school_name: string;
}

export interface SchoolInfo {
  schoolName: string;
  branchName: string;
  logoUrl: string | null;
}

/** Matches the actual response from /api/branches/{id}/ */
interface BranchDetailResponse {
  id: string;
  organization: string;
  school: string;
  name: string;
}

async function resolveMediaUrl(mediaId: string): Promise<string | null> {
  try {
    const res = await request<{ data: { download_url: string } }>(
      "GET",
      `/api/media/${mediaId}/url`,
    );
    return res.data?.download_url ?? null;
  } catch {
    return null;
  }
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

export async function fetchSchoolInfo(): Promise<SchoolInfo | null> {
  const orgInfo = await ensureTeacherOrgBranch();
  const branchId = orgInfo.branchId || getTeacherBranch();
  if (!branchId) return null;

  try {
    const data = await request<BranchSchoolNameResponse>(
      "GET",
      `/api/branches/${branchId}/school-name/`,
    );

    const logoUrl = data.logo ? await resolveMediaUrl(data.logo) : null;

    let branchName: string | null = null;
    try {
      const branchData = await request<BranchDetailResponse>(
        "GET",
        `/api/branches/${branchId}/`,
      );
      branchName = branchData.name || null;
    } catch {
      branchName = null;
    }

    return {
      schoolName: data.school_name || "School",
      branchName: branchName || "",
      logoUrl,
    };
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
