// src/services/teacherSectionsService.ts

import { request } from "./apiClient";
import { getTeacherId, setTeacherId } from "./authStore";
import { getUserProfile } from "./userProfileStore";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

export type TeacherSubject = {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
};

export type TeacherSection = {
  sectionId: string;
  sectionName: string;
  gradeId: string;
  gradeName: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  subjects: TeacherSubject[];
};

type TeacherSectionApi = {
  section_id: string;
  section_name: string;
  grade_id: string;
  grade_name: string;
  grade_level: number;
  academic_year_id: string;
  academic_year_name: string;
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    subject_code?: string;
  }>;
};

type SectionsResponseApi = {
  count: number;
  sections: TeacherSectionApi[];
};

type TeachersResponseApi = {
  count: number;
  results: Array<{
    id: string;
    user: string;
    user_name: string;
  }>;
};

const MOCK_SECTIONS: TeacherSection[] = [
  {
    sectionId: "mock-section-a",
    sectionName: "Sec A",
    gradeId: "mock-grade-7",
    gradeName: "Grade 7",
    gradeLevel: 7,
    academicYearId: "mock-year-2024",
    academicYearName: "2024/2025",
    subjects: [
      { subjectId: "mock-math", subjectName: "Mathematics", subjectCode: "MATH" },
      { subjectId: "mock-physics", subjectName: "Physics", subjectCode: "PHYS" },
      { subjectId: "mock-chem", subjectName: "Chemistry", subjectCode: "CHEM" },
    ],
  },
  {
    sectionId: "mock-section-b",
    sectionName: "Sec B",
    gradeId: "mock-grade-7",
    gradeName: "Grade 7",
    gradeLevel: 7,
    academicYearId: "mock-year-2024",
    academicYearName: "2024/2025",
    subjects: [
      { subjectId: "mock-math", subjectName: "Mathematics", subjectCode: "MATH" },
    ],
  },
];

function mapTeacherSection(api: TeacherSectionApi): TeacherSection {
  return {
    sectionId: api.section_id,
    sectionName: api.section_name,
    gradeId: api.grade_id,
    gradeName: api.grade_name,
    gradeLevel: api.grade_level,
    academicYearId: api.academic_year_id,
    academicYearName: api.academic_year_name,
    subjects: api.subjects.map((subject) => ({
      subjectId: subject.subject_id,
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
    })),
  };
}

export async function getTeacherSections(): Promise<TeacherSection[]> {
  if (IS_MOCK) {
    console.warn("⚠️ Using MOCK data for teacher sections. NEXT_PUBLIC_API_BASE_URL is not set.");
    return [...MOCK_SECTIONS];
  }
  
  let teacherId = getTeacherId();
  const userProfile = getUserProfile();

  // Fix for cached invalid teacher_id: user UUID and teacher UUID are different.
  // If they match, it means the old corrupted value is stuck in localStorage.
  if (teacherId && userProfile && teacherId === userProfile.id) {
    console.warn("⚠️ Found user UUID cached as teacher UUID. Clearing and refetching...");
    localStorage.removeItem("teacher_id");
    teacherId = null;
  }

  if (!teacherId) {
    if (userProfile && userProfile.id) {
      console.log(`📡 Fetching teacher ID for user: ${userProfile.id}`);
      try {
        const teachersData = await request<TeachersResponseApi>("GET", `/api/teachers/?user=${userProfile.id}`);
        if (teachersData.results && teachersData.results.length > 0) {
          teacherId = teachersData.results[0].id;
          setTeacherId(teacherId);
          console.log(`✅ Fetched and stored teacher ID: ${teacherId}`);
        }
      } catch (error) {
        console.error("❌ Error fetching teacher ID:", error);
      }
    }
  }

  if (!teacherId) {
    console.error("❌ Teacher ID not found and could not be fetched");
    console.warn("⚠️ Using mock data as fallback");
    return [...MOCK_SECTIONS];
  }
  
  const endpoint = `/api/teachers/${teacherId}/sections/`;
  console.log(`📡 Fetching teacher sections from: ${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`);
  
  try {
    const data = await request<SectionsResponseApi>("GET", endpoint);
    console.log("✅ Successfully fetched teacher sections:", data);
    return (data.sections || []).map(mapTeacherSection);
  } catch (error) {
    if (typeof window !== "undefined" && error && typeof error === "object" && "status" in error && error.status === 404) {
      console.warn("⚠️ Teacher sections returned 404. Invalid teacher_id cached. Retrying...");
      localStorage.removeItem("teacher_id");
      
      if (userProfile && userProfile.id) {
        try {
          const teachersData = await request<TeachersResponseApi>("GET", `/api/teachers/?user=${userProfile.id}`);
          if (teachersData.results && teachersData.results.length > 0) {
            const newTeacherId = teachersData.results[0].id;
            setTeacherId(newTeacherId);
            const newEndpoint = `/api/teachers/${newTeacherId}/sections/`;
            const newData = await request<SectionsResponseApi>("GET", newEndpoint);
            return (newData.sections || []).map(mapTeacherSection);
          }
        } catch (retryError) {
          console.error("❌ Error fetching teacher sections on retry:", retryError);
        }
      }
    }
    console.error("❌ Error fetching teacher sections:", error);
    console.warn("⚠️ Falling back to mock data");
    return [...MOCK_SECTIONS];
  }
}
