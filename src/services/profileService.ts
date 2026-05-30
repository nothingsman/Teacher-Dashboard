// src/services/profileService.ts

import { request, ApiError } from "./apiClient";
import {
  getTeacherId,
  getTeacherOrganization,
  getTeacherBranch,
  setTeacherOrganization,
  setTeacherBranch,
} from "./authStore";
import { getUserProfile } from "./userProfileStore";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

export interface TeacherProfile {
  teacherId?: string;
  name: string;
  initials: string;
  role: string;
  grade: string;
  section: string;
  email?: string;
  employeeId?: string;
  bio?: string;
  specialization?: string;
  joiningDate?: string;
  user?: string;
  organization?: string;
  branch?: string;
  qualifications: TeacherQualification[];
}

export interface TeacherQualification {
  id: string;
  degreeName?: string;
  institution?: string;
  fieldOfStudy?: string;
  completionDate?: string;
  certificateCopy?: string;
}

export interface TeacherProfileUpdate {
  employeeId?: string;
  bio?: string;
  specialization?: string;
  joiningDate?: string;
}

export interface TeacherOrgBranchInfo {
  organizationId?: string;
  branchId?: string;
}

type TeacherProfileApi = {
  id: string;
  user: string;
  user_name?: string;
  user_email?: string;
  employee_id?: string;
  bio?: string;
  specialization?: string;
  joining_date?: string;
  organization?: string;
  branch?: string;
  qualifications?: Array<{
    id: string;
    degree_name?: string;
    institution?: string;
    field_of_study?: string;
    completion_date?: string;
    certificate_copy?: string;
  }>;
};

// --- Mock data (matching hardcoded values in page.tsx) ---

const HARDCODED_PROFILE: TeacherProfile = {
  name: "Sara Kassa",
  initials: "SK",
  role: "Primary Teacher",
  grade: "Grade 7",
  section: "Sec A",
  email: "sara.kassa@school.com",
  employeeId: "EGA-7A-01",
  bio: "Focused on building strong learning habits and parent engagement.",
  specialization: "Primary Education",
  joiningDate: "2024-01-15",
  qualifications: [
    {
      id: "QUAL-001",
      degreeName: "B.Ed. in Primary Education",
      institution: "Addis Ababa University",
      fieldOfStudy: "Education",
      completionDate: "2022-06-15",
    },
  ],
};

function buildInitials(name?: string) {
  if (!name) return "T";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "T";
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function mapTeacherProfile(api: TeacherProfileApi): TeacherProfile {
  const name = api.user_name || "Teacher";
  return {
    teacherId: api.id,
    name,
    initials: buildInitials(name),
    role: api.specialization ? `Teacher • ${api.specialization}` : "Teacher",
    grade: "Grade 7",
    section: "Sec A",
    email: api.user_email,
    employeeId: api.employee_id,
    bio: api.bio,
    specialization: api.specialization,
    joiningDate: api.joining_date,
    user: api.user,
    organization: api.organization,
    branch: api.branch,
    qualifications:
      api.qualifications?.map((qualification) => ({
        id: qualification.id,
        degreeName: qualification.degree_name,
        institution: qualification.institution,
        fieldOfStudy: qualification.field_of_study,
        completionDate: qualification.completion_date,
        certificateCopy: qualification.certificate_copy,
      })) ?? [],
  };
}

export async function ensureTeacherOrgBranch(): Promise<TeacherOrgBranchInfo> {
  const cachedOrg = getTeacherOrganization();
  const cachedBranch = getTeacherBranch();

  if (cachedOrg && cachedBranch) {
    return { organizationId: cachedOrg, branchId: cachedBranch };
  }

  if (IS_MOCK) {
    return {
      organizationId: cachedOrg ?? undefined,
      branchId: cachedBranch ?? undefined,
    };
  }

  const teacherId = getTeacherId();
  if (!teacherId) {
    return {
      organizationId: cachedOrg ?? undefined,
      branchId: cachedBranch ?? undefined,
    };
  }

  try {
    const data = await request<TeacherProfileApi>(
      "GET",
      `/api/teachers/${teacherId}/`,
    );

    if (data.organization && !cachedOrg)
      setTeacherOrganization(data.organization);
    if (data.branch && !cachedBranch) setTeacherBranch(data.branch);

    return {
      organizationId: data.organization ?? cachedOrg ?? undefined,
      branchId: data.branch ?? cachedBranch ?? undefined,
    };
  } catch (error) {
    console.error("❌ Failed to resolve teacher organization/branch:", error);
    return {
      organizationId: cachedOrg ?? undefined,
      branchId: cachedBranch ?? undefined,
    };
  }
}

// --- Service functions ---

export async function getTeacherProfile(): Promise<TeacherProfile> {
  const userProfile = getUserProfile();
  console.log("📋 getUserProfile() returned:", userProfile);

  // Fall back to API call
  if (IS_MOCK) {
    console.log("⚠️ Using MOCK hardcoded profile");
    return { ...HARDCODED_PROFILE };
  }

  let teacherId = getTeacherId();

  if (teacherId && userProfile && teacherId === userProfile.id) {
    console.warn(
      "⚠️ Found user UUID cached as teacher UUID. Clearing and refetching...",
    );
    localStorage.removeItem("teacher_id");
    teacherId = null;
  }

  if (!teacherId) {
    if (userProfile && userProfile.id) {
      try {
        const teachersData = await request<{
          count: number;
          results: Array<{ id: string }>;
        }>("GET", `/api/teachers/?user=${userProfile.id}`);
        if (teachersData.results && teachersData.results.length > 0) {
          teacherId = teachersData.results[0].id;
          import("./authStore").then((m) => m.setTeacherId(teacherId!));
        }
      } catch (error) {
        console.error("❌ Error fetching teacher ID:", error);
      }
    }
  }

  if (!teacherId) {
    if (userProfile) {
      console.log(
        "⚠️ Teacher ID not found, but user profile exists. Returning partial profile.",
      );
      return {
        name: userProfile.name,
        initials: buildInitials(userProfile.name),
        role: userProfile.role === "TEACHER" ? "Teacher" : userProfile.role,
        grade: "Grade 7",
        section: "Sec A",
        email: userProfile.email,
        qualifications: [],
      };
    }
    throw new Error("Teacher account not found. Please sign in again.");
  }

  try {
    const data = await request<TeacherProfileApi>(
      "GET",
      `/api/teachers/${teacherId}/`,
    );
    const mapped = mapTeacherProfile(data);

    // If API didn't return name/email, fallback to user profile
    if (!data.user_name && userProfile) {
      mapped.name = userProfile.name;
      mapped.initials = buildInitials(userProfile.name);
    }
    if (!data.user_email && userProfile) {
      mapped.email = userProfile.email;
    }

    // Cache organization and branch for downstream requests
    if (data.organization) setTeacherOrganization(data.organization);
    if (data.branch) setTeacherBranch(data.branch);

    return mapped;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      console.warn("⚠️ Teacher profile returned 404. Clearing cache...");
      localStorage.removeItem("teacher_id");
    }

    if (userProfile) {
      console.warn(
        "⚠️ Failed to fetch teacher profile from API, returning partial profile from userProfile",
      );
      return {
        name: userProfile.name,
        initials: buildInitials(userProfile.name),
        role: userProfile.role === "TEACHER" ? "Teacher" : userProfile.role,
        grade: "Grade 7",
        section: "Sec A",
        email: userProfile.email,
        qualifications: [],
      };
    }

    console.warn(
      "⚠️ Failed to fetch teacher profile from API, using hardcoded profile",
    );
    return { ...HARDCODED_PROFILE };
  }
}

export async function updateTeacherProfile(
  update: TeacherProfileUpdate,
): Promise<TeacherProfile> {
  if (IS_MOCK) {
    return {
      ...HARDCODED_PROFILE,
      ...update,
      role: update.specialization
        ? `Teacher • ${update.specialization}`
        : HARDCODED_PROFILE.role,
    };
  }

  const teacherId = getTeacherId();
  if (!teacherId) {
    throw new Error("Teacher account not found. Please sign in again.");
  }

  const payload: Record<string, string> = {};
  if (update.employeeId !== undefined) payload.employee_id = update.employeeId;
  if (update.bio !== undefined) payload.bio = update.bio;
  if (update.specialization !== undefined)
    payload.specialization = update.specialization;
  if (update.joiningDate !== undefined)
    payload.joining_date = update.joiningDate;

  try {
    console.log(`📝 Updating teacher profile with ID: ${teacherId}`, payload);
    const data = await request<TeacherProfileApi>(
      "PATCH",
      `/api/teachers/${teacherId}/`,
      payload,
    );
    console.log("✅ Teacher profile updated successfully");
    return mapTeacherProfile(data);
  } catch (error) {
    console.error("❌ Failed to update teacher profile:", error);

    // If 404, it means the teacher record doesn't exist
    if (error instanceof ApiError && error.status === 404) {
      throw new Error(
        "Teacher profile not found in the system. Please contact your administrator to create your teacher record.",
      );
    }

    throw error;
  }
}

export async function addTeacherQualification(
  qualification: Omit<TeacherQualification, "id">,
  teacherProfile: { teacherId: string; organizationId?: string },
): Promise<TeacherQualification> {
  const { teacherId, organizationId } = teacherProfile;

  if (IS_MOCK) {
    const newQual = { ...qualification, id: `QUAL-${Date.now()}` };
    HARDCODED_PROFILE.qualifications.push(newQual);
    return newQual;
  }

  const payload: Record<string, string> = { teacher: teacherId };
  if (organizationId) payload.organization = organizationId;
  if (qualification.degreeName) payload.degree_name = qualification.degreeName;
  if (qualification.institution)
    payload.institution = qualification.institution;
  if (qualification.fieldOfStudy)
    payload.field_of_study = qualification.fieldOfStudy;
  if (qualification.completionDate)
    payload.completion_date = qualification.completionDate;

  try {
    const data = await request<any>(
      "POST",
      "/api/teacher-qualifications/",
      payload,
    );
    return {
      id: data.id,
      degreeName: data.degree_name,
      institution: data.institution,
      fieldOfStudy: data.field_of_study,
      completionDate: data.completion_date,
      certificateCopy: data.certificate_copy,
    };
  } catch (error) {
    console.error("❌ Failed to add teacher qualification:", error);
    throw error;
  }
}
