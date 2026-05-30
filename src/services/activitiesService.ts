// src/services/activitiesService.ts

import { request } from './apiClient';

// ---------------------------------------------------------------------------
// Domain type
// ---------------------------------------------------------------------------

export type Activity = {
  id: string;
  title: string;
  shortTitle: string;
  subject: string;
  type: string;
  maxScore: number;
  sections: string[];
  status: string;
  description?: string;
  dueDate?: string;
  submitted?: number;
  total?: number;
  graded?: number;
  sectionDetails?: Array<{
    name: string;
    submitted: number;
    total: number;
    students: Array<{ name: string; initials: string; status: string }>;
  }>;
  grades?: Record<string, { result: string; feedback: string }>;
};

// ---------------------------------------------------------------------------
// Mock data (copied from sharedStore.ts)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'edugov_activities';
const STORAGE_VERSION_KEY = 'edugov_activities_version';
const CURRENT_VERSION = '2';

const defaultActivities: Activity[] = [
  {
    id: "ACT-001",
    title: "Chapter 3 Summary — Algebra",
    shortTitle: "Ch.3 HW",
    subject: "Mathematics",
    type: "Homework",
    maxScore: 20,
    sections: ["Grade 7A", "Grade 7B"],
    status: "Active",
    description: "Write a one-page summary covering linear equations.",
    dueDate: "Today, 5:00 PM",
    submitted: 28,
    total: 42,
    graded: 0,
    sectionDetails: [
      {
        name: "Grade 7A", submitted: 18, total: 21, students: [
          { name: "Liya Tadesse", initials: "LT", status: "Submitted" },
          { name: "Biruk Haile", initials: "BH", status: "Pending" },
          { name: "Selam Girma", initials: "SG", status: "Submitted" },
          { name: "Hana Mekonnen", initials: "HM", status: "Submitted" }
        ]
      },
      {
        name: "Grade 7B", submitted: 10, total: 21, students: [
          { name: "Dawit Bekele", initials: "DB", status: "Pending" },
          { name: "Marta Tesfaye", initials: "MT", status: "Submitted" },
          { name: "Abel Negash", initials: "AN", status: "Submitted" }
        ]
      }
    ]
  },
  {
    id: "ACT-002",
    title: "Newton's Laws Lab Report",
    shortTitle: "Lab Rpt",
    subject: "Physics",
    type: "Lab Report",
    maxScore: 50,
    sections: ["Grade 8B"],
    status: "Active",
    description: "Submit the lab report from last Thursday's experiment.",
    dueDate: "Tomorrow, 12:00 PM",
    submitted: 15,
    total: 38,
    graded: 0,
    sectionDetails: [
      {
        name: "Grade 8B", submitted: 15, total: 38, students: [
          { name: "Demo Student 1", initials: "D1", status: "Submitted" },
          { name: "Demo Student 2", initials: "D2", status: "Pending" }
        ]
      }
    ]
  },
  {
    id: "ACT-003",
    title: "Mid-Term Practice Quiz",
    shortTitle: "Quiz 1",
    subject: "Mathematics",
    type: "Quiz",
    maxScore: 30,
    sections: ["Grade 7A"],
    status: "Active",
    description: "20-question practice quiz for the upcoming mid-term.",
    dueDate: "Jun 2, 2025",
    submitted: 20,
    total: 21,
    graded: 20,
    sectionDetails: [
      {
        name: "Grade 7A", submitted: 20, total: 21, students: [
          { name: "Liya Tadesse", initials: "LT", status: "Graded" },
          { name: "Yonas Alemu", initials: "YA", status: "Graded" }
        ]
      }
    ]
  },
  {
    id: "ACT-004",
    title: "Essay: Causes of WWI",
    shortTitle: "WWI Essay",
    subject: "History",
    type: "Essay",
    maxScore: 40,
    sections: ["Grade 9A", "Grade 9B"],
    status: "Closed",
    description: "",
    dueDate: "",
    submitted: 0,
    total: 0,
    graded: 0,
    sectionDetails: []
  },
  {
    id: "ACT-005",
    title: "Cell Division Diagram",
    shortTitle: "Cell Div",
    subject: "Biology",
    type: "Project",
    maxScore: 50,
    sections: ["Grade 10A"],
    status: "Draft",
    description: "",
    dueDate: "",
    submitted: 0,
    total: 0,
    graded: 0,
    sectionDetails: []
  },
  {
    id: "ACT-006",
    title: "Mid-Term Exam",
    shortTitle: "Mid-Term",
    subject: "Mathematics",
    type: "Exam",
    maxScore: 100,
    sections: ["Grade 7A", "Grade 7B"],
    status: "Active",
    description: "",
    dueDate: "",
    submitted: 0,
    total: 0,
    graded: 0,
    sectionDetails: []
  },
  {
    id: "ACT-007",
    title: "Newton's Laws Homework",
    shortTitle: "Newton HW",
    subject: "Physics",
    type: "Homework",
    maxScore: 20,
    sections: ["Grade 8B"],
    status: "Active",
    description: "",
    dueDate: "",
    submitted: 0,
    total: 0,
    graded: 0,
    sectionDetails: []
  },
  {
    id: "ACT-008",
    title: "WWI Essay",
    shortTitle: "WWI Essay",
    subject: "History",
    type: "Essay",
    maxScore: 40,
    sections: ["Grade 9A", "Grade 9B"],
    status: "Closed",
    description: "",
    dueDate: "",
    submitted: 0,
    total: 0,
    graded: 0,
    sectionDetails: []
  }
];

// ---------------------------------------------------------------------------
// Mode flag
// ---------------------------------------------------------------------------

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// ---------------------------------------------------------------------------
// Mock Adapter — localStorage persistence (mirrors sharedStore.ts logic)
// ---------------------------------------------------------------------------

function loadActivities(): Activity[] {
  if (typeof window === 'undefined') return [...defaultActivities];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...defaultActivities];
    const parsed: Activity[] = JSON.parse(stored);
    const hasValidSections = parsed.every(
      (a) => Array.isArray(a.sections) && a.sections.length > 0
    );
    if (!hasValidSections) {
      localStorage.removeItem(STORAGE_KEY);
      return [...defaultActivities];
    }
    return parsed;
  } catch {
    return [...defaultActivities];
  }
}

function persistActivities(activities: Activity[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch {
    // Ignore storage errors
  }
}

function dispatchUpdatedEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('edugov_activities_updated'));
  }
}

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

/**
 * Returns all activities.
 *
 * Mock mode: reads from localStorage (falling back to defaultActivities).
 * Real mode: GET /activities
 */
export async function getActivities(): Promise<Activity[]> {
  if (IS_MOCK) {
    return loadActivities();
  }
  return request<Activity[]>('GET', '/api/activities');
  return request<Activity>('POST', '/api/activities', activity);
  return request<Activity>('PATCH', `/api/activities/${id}`, changes);
  return request<void>('DELETE', `/api/activities/${id}`);
}
