// src/services/homeworkService.ts

import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

export interface DailyEntry {
  id: string;
  date: string;           // "YYYY-MM-DD"
  section: string;
  subject: string;
  type: 'Homework' | 'Classwork';
  title: string;
  description: string;
  maxScore: number;
  scores: Record<string, number | null>;  // studentId → score or null
  parentVisible: boolean;
}

// --- Mock Data (copied from HomeworksModule.tsx) ---

const initialEntries: DailyEntry[] = [
  {
    id: "HW-001",
    date: "2025-06-02",
    section: "Grade 7A",
    subject: "Mathematics",
    type: "Homework",
    title: "Linear Equations Practice",
    description: "Complete exercises 3.1 to 3.5 from the textbook",
    maxScore: 10,
    scores: {
      "STU-00421": 9, "STU-00398": 7, "STU-00412": 5,
      "STU-00355": null, "STU-00467": 8, "STU-00480": 10,
      "STU-00391": 6, "STU-00403": 7
    },
    parentVisible: true
  },
  {
    id: "HW-002",
    date: "2025-06-02",
    section: "Grade 7A",
    subject: "Mathematics",
    type: "Classwork",
    title: "In-class Problem Solving",
    description: "Solving 5 word problems on linear equations",
    maxScore: 10,
    scores: {
      "STU-00421": 10, "STU-00398": 8, "STU-00412": 6,
      "STU-00355": 5, "STU-00467": 9, "STU-00480": 10,
      "STU-00391": 7, "STU-00403": 8
    },
    parentVisible: true
  },
  {
    id: "HW-003",
    date: "2025-06-01",
    section: "Grade 7A",
    subject: "Physics",
    type: "Homework",
    title: "Newton's Laws Questions",
    description: "Answer review questions at the end of Chapter 4",
    maxScore: 10,
    scores: {
      "STU-00421": 8, "STU-00398": null, "STU-00412": 4,
      "STU-00355": 3, "STU-00467": 7, "STU-00480": 9,
      "STU-00391": 5, "STU-00403": 6
    },
    parentVisible: true
  },
  {
    id: "HW-004",
    date: "2025-05-31",
    section: "Grade 7A",
    subject: "History",
    type: "Classwork",
    title: "WWI Causes Discussion",
    description: "In-class group discussion and notes",
    maxScore: 10,
    scores: {
      "STU-00421": 9, "STU-00398": 8, "STU-00412": 7,
      "STU-00355": null, "STU-00467": 8, "STU-00480": 10,
      "STU-00391": 6, "STU-00403": 7
    },
    parentVisible: false
  }
];

// In-memory store (mock mode only)
let mockStore: DailyEntry[] = [...initialEntries];

// --- ID Generator ---

function generateId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `HW-${num}`;
}

// --- Service Functions ---

/**
 * Returns entries filtered by section and optional date range.
 * Requirements: 6.1, 6.2
 */
export async function getEntries(
  section: string,
  dateRange?: { from: string; to: string }
): Promise<DailyEntry[]> {
  if (IS_MOCK) {
    return mockStore.filter(entry => {
      if (entry.section !== section) return false;
      if (dateRange) {
        if (entry.date < dateRange.from || entry.date > dateRange.to) return false;
      }
      return true;
    });
  }
  const params = new URLSearchParams({ section });
  if (dateRange) {
    params.set('from', dateRange.from);
    params.set('to', dateRange.to);
  }
  return request<DailyEntry[]>('GET', `/api/homework?${params.toString()}`);
  return request<DailyEntry>('POST', '/api/homework', entry);
  return request<DailyEntry>('PATCH', `/api/homework/${entryId}/scores`, { scores });
  return request<DailyEntry>('PATCH', `/api/homework/${entryId}/visibility`);
}

/**
 * Resets the mock store to the initial entries.
 * Useful for test isolation.
 */
export function _resetMockStore(): void {
  mockStore = [...initialEntries];
}
