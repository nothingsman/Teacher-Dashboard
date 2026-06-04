/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { request } from "./apiClient";
import { getCached, setCache, buildCacheKey } from "./apiCache";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Domain Type ---

/**
 * Unified Student interface — superset of all student-related fields
 * currently spread across StudentsModule, GradebookModule, HomeworksModule,
 * AnalyticsCharts, and page.tsx.
 */
export interface Student {
  // Core identity (StudentsModule, GradebookModule, HomeworksModule)
  id: string;
  name: string;
  grade: string;
  section: string;
  status: "Active" | "Pending" | "Withdrawn";
  parentLinked: boolean;
  enrolled: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;

  // Extra profile fields (from backend)
  rollNo?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  admissionDate?: string;
  academicYearName?: string;
  branchName?: string;
  organizationName?: string;
  gradeName?: string;
  sectionName?: string;
  gradeLevel?: number;

  // Avatar / initials (HomeworksModule, AnalyticsCharts)
  avatar?: string;

  // Analytics fields (AnalyticsCharts.tsx)
  overallAvg?: number;
  trend?: number[];
  subjects?: Record<string, number>;
  attendance?: number;
  parentEngagement?: number;
  submissions?: { submitted: number; late: number; missing: number };
  recentGrades?: number[];
  risk?: string;

  // Overview / attendance fields (page.tsx)
  performance?: number;
}

// --- Backend Student API Types ---

export interface StudentApi {
  id: string;
  organization: string;
  branch: string;
  first_name: string;
  last_name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  date_of_birth: string;
  roll_no: string;
  current_section: string;
  admission_date: string;
  photo: string;
  status: "ACTIVE" | "GRADUATED" | "INACTIVE" | "WITHDRAWN";
  created_at: string;
  updated_at: string;
  section_name: string;
  grade_id: string;
  grade_name: string;
  grade_level: number;
  academic_year_id: string;
  academic_year_name: string;
  branch_name: string;
  organization_name: string;
}

export interface StudentListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: StudentApi[];
}

export interface StudentInsightTriggerResponse {
  created: boolean;
  reused_existing?: boolean;
  insight_id?: string;
  category?: string;
  risk_band?: string;
  delivery_status?: string;
  reason_code?: string;
  message: string;
  source_event_type?: string;
  source_model?: string;
  source_id?: string;
}

// --- Mock Data ---

let mockStore: Student[] = [
  {
    id: "STU-00421",
    name: "Liya Tadesse",
    grade: "Grade 8",
    section: "Grade 7A",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2022",
    parentName: "Alemayehu T.",
    parentPhone: "+251 92 344 5566",
    parentEmail: "alemayehu.t@gmail.com",
    avatar: "LT",
    overallAvg: 91,
    trend: [72, 78, 83, 88, 91, 94],
    subjects: { Mathematics: 94, Physics: 88, History: 91 },
    attendance: 97,
    parentEngagement: 85,
    submissions: { submitted: 18, late: 1, missing: 0 },
    recentGrades: [94, 91, 88, 96, 89],
    risk: "none",
    performance: 91.0,
  },
  {
    id: "STU-00398",
    name: "Biruk Haile",
    grade: "Grade 7",
    section: "Grade 7A",
    status: "Active",
    parentLinked: false,
    enrolled: "Jan 15, 2023",
    parentName: "Worku Haile",
    parentPhone: "+251 91 123 4567",
    parentEmail: "worku.h@gmail.com",
    avatar: "BH",
    overallAvg: 73,
    trend: [80, 77, 74, 70, 73, 71],
    subjects: { Mathematics: 69, Physics: 75, History: 78 },
    attendance: 88,
    parentEngagement: 40,
    submissions: { submitted: 15, late: 3, missing: 1 },
    recentGrades: [71, 68, 75, 70, 73],
    risk: "watch",
    performance: 73.0,
  },
  {
    id: "STU-00412",
    name: "Selam Girma",
    grade: "Grade 9",
    section: "Grade 7A",
    status: "Pending",
    parentLinked: true,
    enrolled: "Aug 20, 2024",
    parentName: "Girma Girma",
    parentPhone: "+251 91 765 4321",
    parentEmail: "girma.g@gmail.com",
    avatar: "SG",
    overallAvg: 55,
    trend: [61, 58, 54, 52, 55, 53],
    subjects: { Mathematics: 52, Physics: 58, History: 55 },
    attendance: 79,
    parentEngagement: 20,
    submissions: { submitted: 12, late: 4, missing: 3 },
    recentGrades: [53, 58, 51, 55, 52],
    risk: "critical",
    performance: 55.0,
  },
  {
    id: "STU-00355",
    name: "Dawit Bekele",
    grade: "Grade 6",
    section: "Grade 7A",
    status: "Withdrawn",
    parentLinked: false,
    enrolled: "Sep 1, 2021",
    parentName: "Meseret Bekele",
    parentPhone: "+251 91 987 6543",
    parentEmail: "meseret.b@gmail.com",
    avatar: "DB",
    overallAvg: 36,
    trend: [45, 41, 38, 35, 36, 33],
    subjects: { Mathematics: 32, Physics: 38, History: 40 },
    attendance: 65,
    parentEngagement: 10,
    submissions: { submitted: 8, late: 2, missing: 9 },
    recentGrades: [33, 38, 30, 36, 34],
    risk: "critical",
    performance: 36.0,
  },
  {
    id: "STU-00467",
    name: "Hana Mekonnen",
    grade: "Grade 8",
    section: "Grade 7A",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2022",
    parentName: "Tigist Mekonnen",
    parentPhone: "+251 91 432 1098",
    parentEmail: "tigist.m@gmail.com",
    avatar: "HM",
    overallAvg: 81,
    trend: [74, 76, 79, 81, 80, 83],
    subjects: { Mathematics: 83, Physics: 79, History: 81 },
    attendance: 93,
    parentEngagement: 70,
    submissions: { submitted: 17, late: 1, missing: 1 },
    recentGrades: [83, 80, 82, 85, 79],
    risk: "none",
    performance: 81.0,
  },
  {
    id: "STU-00480",
    name: "Yonas Alemu",
    grade: "Grade 10",
    section: "Grade 7A",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2021",
    parentName: "Shitaye Alemu",
    parentPhone: "+251 91 876 5432",
    parentEmail: "shitaye.a@gmail.com",
    avatar: "YA",
    overallAvg: 97,
    trend: [88, 91, 93, 95, 96, 97],
    subjects: { Mathematics: 98, Physics: 96, History: 97 },
    attendance: 99,
    parentEngagement: 95,
    submissions: { submitted: 19, late: 0, missing: 0 },
    recentGrades: [97, 98, 96, 99, 95],
    risk: "none",
    performance: 95.0,
  },
  {
    id: "STU-00391",
    name: "Marta Tesfaye",
    grade: "Grade 7",
    section: "Grade 7A",
    status: "Pending",
    parentLinked: false,
    enrolled: "Jan 10, 2024",
    parentName: "Tesfaye T.",
    parentPhone: "+251 91 567 8901",
    parentEmail: "tesfaye.t@gmail.com",
    avatar: "MT",
    overallAvg: 63,
    trend: [55, 58, 60, 63, 61, 65],
    subjects: { Mathematics: 61, Physics: 65, History: 63 },
    attendance: 85,
    parentEngagement: 55,
    submissions: { submitted: 14, late: 3, missing: 2 },
    recentGrades: [65, 62, 67, 60, 63],
    risk: "watch",
    performance: 61.0,
  },
  {
    id: "STU-00403",
    name: "Abel Negash",
    grade: "Grade 9",
    section: "Grade 7A",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2023",
    parentName: "Negash N.",
    parentPhone: "+251 91 234 5678",
    parentEmail: "negash.n@gmail.com",
    avatar: "AN",
    overallAvg: 70,
    trend: [65, 67, 68, 71, 70, 72],
    subjects: { Mathematics: 68, Physics: 72, History: 71 },
    attendance: 91,
    parentEngagement: 60,
    submissions: { submitted: 16, late: 2, missing: 1 },
    recentGrades: [72, 69, 71, 70, 73],
    risk: "watch",
    performance: 68.0,
  },
];

// --- Mappers ---

/**
 * Maps backend StudentApi to frontend Student interface
 */
function mapStudentFromApi(api: StudentApi): Student {
  const initials =
    `${api.first_name.charAt(0)}${api.last_name.charAt(0)}`.toUpperCase();

  return {
    id: api.id,
    name: `${api.first_name} ${api.last_name}`,
    grade: api.grade_name || `Grade ${api.grade_level}`,
    section: api.section_name || api.current_section,
    status:
      api.status === "ACTIVE"
        ? "Active"
        : api.status === "WITHDRAWN"
          ? "Withdrawn"
          : "Pending",
    parentLinked: false, // TODO: Determine from backend parent relationship
    enrolled: new Date(api.admission_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    parentName: "", // TODO: Fetch from backend parent relationship
    parentPhone: "", // TODO: Fetch from backend parent relationship
    parentEmail: "", // TODO: Fetch from backend parent relationship
    avatar: initials,
    rollNo: api.roll_no,
    gender: api.gender,
    dateOfBirth: api.date_of_birth,
    admissionDate: api.admission_date,
    academicYearName: api.academic_year_name,
    branchName: api.branch_name,
    organizationName: api.organization_name,
    gradeName: api.grade_name,
    sectionName: api.section_name,
    gradeLevel: api.grade_level,
  };
}

// --- Service Functions ---

/**
 * Returns a shallow copy of all students in the store.
 */
export async function getStudents(): Promise<Student[]> {
  if (IS_MOCK) return [...mockStore];
  try {
    const response = await request<StudentListResponse | StudentApi[]>("GET", "/api/students/");
    const results = Array.isArray(response) ? response : (response as StudentListResponse).results || [];
    return results.map(mapStudentFromApi);
  } catch {
    return [...mockStore];
  }
}

/**
 * Returns students whose `section` field exactly matches the given section string.
 */
export async function getStudentsBySection(
  section: string,
): Promise<Student[]> {
  if (IS_MOCK) return mockStore.filter((s) => s.section === section);
  try {
    const response = await request<StudentListResponse | StudentApi[]>(
      "GET",
      `/api/students/?section=${encodeURIComponent(section)}`,
    );
    const results = Array.isArray(response) ? response : (response as StudentListResponse).results || [];
    return results.map(mapStudentFromApi);
  } catch {
    return mockStore.filter((s) => s.section === section);
  }
}

/**
 * Returns all students in a given section using the backend API.
 * GET /api/students/by-section/?section=<sectionId>
 */
export async function getStudentsBySectionId(
  sectionId: string,
  academicYear?: string,
): Promise<Student[]> {
  if (IS_MOCK) return [...mockStore];

  const cacheKey = buildCacheKey("students-by-section", {
    section: sectionId,
    academic_year: academicYear,
  });
  const cached = getCached<Student[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams();
    params.set("section", sectionId);
    if (academicYear) params.set("academic_year", academicYear);

    const query = params.toString();
    const endpoint = `/api/students/by-section/?${query}`;

    console.group("📚 Students Request");
    console.log("Endpoint:", endpoint);
    console.log("Query Params:", {
      section: sectionId,
      academicYear,
      status: "ACTIVE",
    });

    const response = await request<StudentListResponse | StudentApi[]>(
      "GET",
      endpoint,
    );

    const results = Array.isArray(response)
      ? response
      : (response as StudentListResponse).results || [];

    console.log("Response:", { count: results.length, results });
    console.groupEnd();

    const mapped = results.map(mapStudentFromApi);
    setCache(cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.error("❌ Failed to fetch students by section:", error);
    return IS_MOCK ? [...mockStore] : [];
  }
}

/**
 * Merges `changes` into the student with the given `id`.
 * Returns the updated student, or `null` if no student with that ID exists.
 */
export async function updateStudent(
  id: string,
  changes: Partial<Student>,
): Promise<Student | null> {
  if (IS_MOCK) {
    const index = mockStore.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const updated: Student = { ...mockStore[index], ...changes };
    mockStore = [
      ...mockStore.slice(0, index),
      updated,
      ...mockStore.slice(index + 1),
    ];
    return updated;
  }
  return request<Student>(
    "PATCH",
    `/api/students/${encodeURIComponent(id)}/`,
    changes,
  );
}

export async function triggerStudentInsight(
  studentId: string,
): Promise<StudentInsightTriggerResponse> {
  if (IS_MOCK) {
    return {
      created: true,
      reused_existing: false,
      insight_id: `insight-${studentId}`,
      category: "ACADEMICS",
      risk_band: "LOW",
      delivery_status: "DELIVERED",
      message:
        "Insight generated and delivered through the parent notification flow.",
      source_event_type: "ASSESSMENT_RESULT",
      source_model: "assessments.AssessmentResult",
      source_id: `mock-source-${studentId}`,
    };
  }

  return request<StudentInsightTriggerResponse>(
    "POST",
    `/api/students/${encodeURIComponent(studentId)}/trigger-insight/`,
  );
}
