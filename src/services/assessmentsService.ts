// src/services/assessmentsService.ts

import { request } from "./apiClient";
import {
  getTeacherId,
  getTeacherOrganization,
  getTeacherBranch,
  setTeacherId,
} from "./authStore";
import { ensureTeacherOrgBranch } from "./profileService";
import { getUserProfile } from "./userProfileStore";
import { getCached, setCache, invalidateCache, buildCacheKey } from "./apiCache";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskType =
  | "ASSIGNMENT"
  | "EXAM"
  | "QUIZ"
  | "HOMEWORK"
  | "PROJECT"
  | "LAB";
export type TaskStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface Assessment {
  id: string;
  organizationId?: string;
  branchId?: string;
  teacherAssignmentId?: string;
  title: string;
  taskType: TaskType;
  description?: string;
  totalMarks?: string;
  passingMarks?: string;
  dueDate?: string;
  status: TaskStatus;
  createdAt?: string;
  updatedAt?: string;
  taskTypeDisplay?: string;
  statusDisplay?: string;
  sectionName?: string;
  gradeName?: string;
  subjectName?: string;
  subjectCode?: string;
  teacherName?: string;
  teacherEmployeeId?: string;
  academicYearName?: string;
  branchName?: string;
}

export interface AssessmentCreate {
  title: string;
  taskType: TaskType;
  description?: string;
  totalMarks?: string;
  passingMarks?: string;
  dueDate?: string;
  status: TaskStatus;
  teacherAssignmentId?: string;
  organizationId?: string;
  branchId?: string;
}

export interface AssessmentUpdate extends Partial<AssessmentCreate> {}

type TeacherAssignmentContext = {
  sectionId: string;
  subjectId: string;
  academicYearId: string;
};

type AssessmentFilters = {
  organizationId?: string;
  branchId?: string;
  teacherAssignmentId?: string;
  teacherId?: string;
  sectionId?: string;
  subjectId?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  search?: string;
};

type AssessmentApi = {
  id: string;
  organization?: string;
  branch?: string;
  teacher_assignment?: string;
  title: string;
  task_type: TaskType;
  description?: string;
  total_marks?: string;
  passing_marks?: string;
  due_date?: string;
  status: TaskStatus;
  created_at?: string;
  updated_at?: string;
  task_type_display?: string;
  status_display?: string;
  section_name?: string;
  grade_name?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_name?: string;
  teacher_employee_id?: string;
  academic_year_name?: string;
  branch_name?: string;
  result_count?: number;
};

type AssessmentListApi = {
  count: number;
  results: AssessmentApi[];
};

type AssessmentListResponse =
  | AssessmentListApi
  | AssessmentApi[]
  | AssessmentApi;

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "ASSESS-001",
    title: "Chapter 3 Mid-Term Exam",
    taskType: "EXAM",
    description:
      "Covers all topics from chapter 3 including algebra and geometry.",
    totalMarks: "100",
    passingMarks: "50",
    dueDate: "2026-06-10",
    status: "PUBLISHED",
  },
  {
    id: "ASSESS-002",
    title: "Homework: Quadratic Equations",
    taskType: "HOMEWORK",
    description: "Complete exercises 4.1 to 4.5 from the textbook.",
    totalMarks: "20",
    passingMarks: "10",
    dueDate: "2026-05-30",
    status: "DRAFT",
  },
  {
    id: "ASSESS-003",
    title: "Lab Report: Titration",
    taskType: "LAB",
    description:
      "Submit your lab report for the acid-base titration experiment.",
    totalMarks: "50",
    passingMarks: "25",
    dueDate: "2026-06-05",
    status: "PUBLISHED",
  },
];

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapAssessment(api: AssessmentApi): Assessment {
  return {
    id: api.id,
    organizationId: api.organization,
    branchId: api.branch,
    teacherAssignmentId: api.teacher_assignment,
    title: api.title,
    taskType: api.task_type,
    description: api.description,
    totalMarks: api.total_marks,
    passingMarks: api.passing_marks,
    dueDate: api.due_date,
    status: api.status,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    taskTypeDisplay: api.task_type_display,
    statusDisplay: api.status_display,
    sectionName: api.section_name,
    gradeName: api.grade_name,
    subjectName: api.subject_name,
    subjectCode: api.subject_code,
    teacherName: api.teacher_name,
    teacherEmployeeId: api.teacher_employee_id,
    academicYearName: api.academic_year_name,
    branchName: api.branch_name,
  };
}

function normalizeAssessmentList(
  data: AssessmentListResponse,
): AssessmentApi[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "results" in data) {
    return (data as AssessmentListApi).results ?? [];
  }
  if (data && typeof data === "object" && "id" in data) {
    return [data as AssessmentApi];
  }
  return [];
}

async function resolveTeacherId(): Promise<string | null> {
  let teacherId = getTeacherId();
  const userProfile = getUserProfile();

  if (teacherId && userProfile && teacherId === userProfile.id) {
    console.warn(
      "⚠️ Found user UUID cached as teacher UUID. Clearing and refetching...",
    );
    localStorage.removeItem("teacher_id");
    teacherId = null;
  }

  if (!teacherId && userProfile?.id) {
    try {
      const teachersData = await request<
        { results?: Array<{ id: string }> } | Array<{ id: string }>
      >("GET", `/api/teachers/?user=${userProfile.id}`);
      const results = Array.isArray(teachersData)
        ? teachersData
        : (teachersData.results ?? []);
      if (results.length > 0) {
        teacherId = results[0].id;
        setTeacherId(teacherId);
      }
    } catch (error) {
      console.error("❌ Error fetching teacher ID:", error);
    }
  }

  return teacherId ?? null;
}

function buildPayload(data: AssessmentCreate): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: data.title,
    task_type: data.taskType,
    status: data.status,
  };
  if (data.description !== undefined) payload.description = data.description;
  if (data.totalMarks !== undefined) payload.total_marks = data.totalMarks;
  if (data.passingMarks !== undefined)
    payload.passing_marks = data.passingMarks;
  if (data.dueDate !== undefined) payload.due_date = data.dueDate;
  if (data.teacherAssignmentId !== undefined)
    payload.teacher_assignment = data.teacherAssignmentId;
  if (data.organizationId !== undefined)
    payload.organization = data.organizationId;
  if (data.branchId !== undefined) payload.branch = data.branchId;
  return payload;
}

async function resolveTeacherAssignment(
  enriched: AssessmentCreate,
  context?: TeacherAssignmentContext,
): Promise<void> {
  if (enriched.teacherAssignmentId || !context) return;

  const teacherId = getTeacherId();
  if (!teacherId || !enriched.organizationId) return;

  try {
    const assignmentsData = await request<{ results: { id: string }[] }>(
      "GET",
      `/api/teacher-assignments/?teacher=${teacherId}&section=${context.sectionId}&subject=${context.subjectId}`,
    );

    if (assignmentsData.results && assignmentsData.results.length > 0) {
      enriched.teacherAssignmentId = assignmentsData.results[0].id;
      return;
    }

    const newAssignment = await request<{ id: string }>(
      "POST",
      "/api/teacher-assignments/",
      {
        teacher: teacherId,
        organization: enriched.organizationId,
        subject: context.subjectId,
        section: context.sectionId,
        academic_year: context.academicYearId,
      },
    );
    enriched.teacherAssignmentId = newAssignment.id;
  } catch (error) {
    console.error("❌ Failed to resolve teacher assignment:", error);
    throw new Error(
      "Could not resolve teacher assignment for this section and subject.",
    );
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAssessmentsByTeacher(): Promise<Assessment[]> {
  if (IS_MOCK) return [...MOCK_ASSESSMENTS];

  const teacherId = await resolveTeacherId();
  if (!teacherId) {
    console.warn("⚠️ No teacher ID — returning empty assessments");
    return [];
  }

  try {
    const data = await request<AssessmentListResponse>(
      "GET",
      `/api/assessments/by-teacher/?teacher=${teacherId}`,
    );
    return normalizeAssessmentList(data).map(mapAssessment);
  } catch (err) {
    console.error("❌ Failed to fetch assessments:", err);
    return IS_MOCK ? [...MOCK_ASSESSMENTS] : [];
  }
}

export async function getAssessments(
  filters: AssessmentFilters = {},
): Promise<Assessment[]> {
  if (IS_MOCK) return [...MOCK_ASSESSMENTS];

  const params = new URLSearchParams();
  if (filters.organizationId)
    params.set("organization", filters.organizationId);
  if (filters.branchId) params.set("branch", filters.branchId);
  if (filters.teacherAssignmentId)
    params.set("teacher_assignment", filters.teacherAssignmentId);
  if (filters.teacherId) params.set("teacher", filters.teacherId);
  if (filters.sectionId) params.set("section", filters.sectionId);
  if (filters.subjectId) params.set("subject", filters.subjectId);
  if (filters.taskType) params.set("task_type", filters.taskType);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  const endpoint = query ? `/api/assessments/?${query}` : "/api/assessments/";

  const cacheKey = buildCacheKey("assessments", filters as Record<string, unknown>);
  const cached = getCached<Assessment[]>(cacheKey);
  if (cached) return cached;

  const data = await request<AssessmentListApi>("GET", endpoint);

  const result = normalizeAssessmentList(data).map(mapAssessment);
  setCache(cacheKey, result);
  return result;
}

export async function getAssessmentsForContext(
  context?: TeacherAssignmentContext,
): Promise<Assessment[]> {
  if (IS_MOCK) return [...MOCK_ASSESSMENTS];

  if (!context) return [];

  const teacherId = await resolveTeacherId();

  console.group("🔍 getAssessmentsForContext");
  console.log("Teacher ID:", teacherId);
  console.log("Section ID:", context.sectionId);
  console.log("Subject ID:", context.subjectId);
  console.groupEnd();

  if (!teacherId) return [];

  return getAssessments({
    teacherId,
    sectionId: context.sectionId,
    subjectId: context.subjectId,
  });
}

/**
 * Get homeworks (task_type=HOMEWORK) for a given context (section/subject)
 * Fetches all assessments and filters to HOMEWORK only client-side
 */
export async function getHomeworksForContext(
  context?: TeacherAssignmentContext,
): Promise<Assessment[]> {
  if (IS_MOCK) return MOCK_ASSESSMENTS.filter((a) => a.taskType === "HOMEWORK");

  if (!context) return [];

  const teacherId = await resolveTeacherId();

  console.group("📖 getHomeworksForContext");
  console.log("Teacher ID:", teacherId);
  console.log("Section ID:", context.sectionId);
  console.log("Subject ID:", context.subjectId);
  console.groupEnd();

  if (!teacherId) return [];

  // Fetch all assessments without taskType filter, then filter client-side
  const allAssessments = await getAssessments({
    teacherId,
    sectionId: context.sectionId,
    subjectId: context.subjectId,
  });

  // Filter to only HOMEWORK tasks client-side
  return allAssessments.filter((a) => a.taskType === "HOMEWORK");
}

export async function createAssessment(
  payload: AssessmentCreate,
  context?: TeacherAssignmentContext,
): Promise<Assessment> {
  if (IS_MOCK) {
    const newItem: Assessment = {
      ...payload,
      id: `ASSESS-${Date.now()}`,
      status: payload.status ?? "DRAFT",
    };
    MOCK_ASSESSMENTS.unshift(newItem);
    return newItem;
  }

  const enriched = { ...payload };

  // Set organization and branch from cache if not provided
  if (!enriched.organizationId) {
    const orgId = getTeacherOrganization();
    if (orgId) enriched.organizationId = orgId;
  }
  if (!enriched.branchId) {
    const branchId = getTeacherBranch();
    if (branchId) enriched.branchId = branchId;
  }

  // If still missing, resolve from teacher profile and cache for future use
  if (!enriched.organizationId || !enriched.branchId) {
    const resolved = await ensureTeacherOrgBranch();
    if (!enriched.organizationId && resolved.organizationId) {
      enriched.organizationId = resolved.organizationId;
    }
    if (!enriched.branchId && resolved.branchId) {
      enriched.branchId = resolved.branchId;
    }
  }

  if (!enriched.organizationId || !enriched.branchId) {
    throw new Error(
      "Organization and branch are required to create a task. Please refresh and try again.",
    );
  }

  await resolveTeacherAssignment(enriched, context);

  const data = await request<AssessmentApi>(
    "POST",
    "/api/assessments/",
    buildPayload(enriched),
  );
  invalidateCache("assessments");
  return mapAssessment(data);
}

export async function updateAssessment(
  id: string,
  payload: AssessmentUpdate,
  context?: TeacherAssignmentContext,
): Promise<Assessment> {
  if (IS_MOCK) {
    const idx = MOCK_ASSESSMENTS.findIndex((a) => a.id === id);
    if (idx !== -1) {
      MOCK_ASSESSMENTS[idx] = {
        ...MOCK_ASSESSMENTS[idx],
        ...payload,
        taskType: (payload.taskType ??
          MOCK_ASSESSMENTS[idx].taskType) as TaskType,
        status: (payload.status ?? MOCK_ASSESSMENTS[idx].status) as TaskStatus,
      };
      return { ...MOCK_ASSESSMENTS[idx] };
    }
    throw new Error("Assessment not found");
  }

  const enriched: AssessmentCreate = { ...(payload as AssessmentCreate) };

  if (!enriched.organizationId) {
    const orgId = getTeacherOrganization();
    if (orgId) enriched.organizationId = orgId;
  }
  if (!enriched.branchId) {
    const branchId = getTeacherBranch();
    if (branchId) enriched.branchId = branchId;
  }

  if (!enriched.organizationId || !enriched.branchId) {
    const resolved = await ensureTeacherOrgBranch();
    if (!enriched.organizationId && resolved.organizationId) {
      enriched.organizationId = resolved.organizationId;
    }
    if (!enriched.branchId && resolved.branchId) {
      enriched.branchId = resolved.branchId;
    }
  }

  if (!enriched.organizationId || !enriched.branchId) {
    throw new Error(
      "Organization and branch are required to edit a task. Please refresh and try again.",
    );
  }

  await resolveTeacherAssignment(enriched, context);

  const data = await request<AssessmentApi>(
    "PATCH",
    `/api/assessments/${id}/`,
    buildPayload(enriched),
  );
  invalidateCache("assessments");
  return mapAssessment(data);
}

export async function deleteAssessment(id: string): Promise<void> {
  if (IS_MOCK) {
    const idx = MOCK_ASSESSMENTS.findIndex((a) => a.id === id);
    if (idx !== -1) MOCK_ASSESSMENTS.splice(idx, 1);
    return;
  }
  await request<void>("DELETE", `/api/assessments/${id}/`);
  invalidateCache("assessments");
}
