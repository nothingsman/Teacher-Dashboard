import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Domain Type ---

export interface GradeRecord {
  studentId: string;
  activityId: string;
  score: number | null;
}

// --- Mock Store ---
// Keyed by activityId → studentId → score
// Populated from INITIAL_STUDENTS in GradebookModule.tsx

type ScoreMap = Record<string, Record<string, number | null>>;

const INITIAL_SCORES: ScoreMap = {
  'ACT-001': {
    'STU-00421': 19,
    'STU-00398': 15,
    'STU-00412': 11,
    'STU-00355': null,
    'STU-00467': 17,
    'STU-00480': 20,
    'STU-00391': 13,
    'STU-00403': 16,
  },
  'ACT-002': {
    'STU-00421': 46,
    'STU-00398': 38,
    'STU-00412': null,
    'STU-00355': 21,
    'STU-00467': 42,
    'STU-00480': 49,
    'STU-00391': 33,
    'STU-00403': 40,
  },
  'ACT-003': {
    'STU-00421': 28,
    'STU-00398': 22,
    'STU-00412': 17,
    'STU-00355': 9,
    'STU-00467': 25,
    'STU-00480': 30,
    'STU-00391': 19,
    'STU-00403': null,
  },
  'ACT-006': {
    'STU-00421': 88,
    'STU-00398': 71,
    'STU-00412': 54,
    'STU-00355': 38,
    'STU-00467': 79,
    'STU-00480': 95,
    'STU-00391': 61,
    'STU-00403': 68,
  },
  'ACT-007': {
    'STU-00421': 18,
    'STU-00398': null,
    'STU-00412': 12,
    'STU-00355': null,
    'STU-00467': 16,
    'STU-00480': 20,
    'STU-00391': 14,
    'STU-00403': 17,
  },
  'ACT-008': {
    'STU-00421': 37,
    'STU-00398': 30,
    'STU-00412': 22,
    'STU-00355': 14,
    'STU-00467': 33,
    'STU-00480': 39,
    'STU-00391': null,
    'STU-00403': 28,
  },
};

// Deep-clone the initial scores so mutations don't affect the original
let mockStore: ScoreMap = JSON.parse(JSON.stringify(INITIAL_SCORES));

// --- Service Functions ---

/**
 * Returns all grade records for the given activity as a GradeRecord[].
 * In mock mode, reads from the in-memory store.
 */
export async function getGrades(activityId: string): Promise<GradeRecord[]> {
  if (IS_MOCK) {
    const activityScores = mockStore[activityId] ?? {};
    return Object.entries(activityScores).map(([studentId, score]) => ({
      studentId,
      activityId,
      score,
    }));
  }
  return request<GradeRecord[]>('GET', `/api/grades/${activityId}`);
}

/**
 * Saves a grade for a student on a given activity.
 * Updates the in-memory store and returns the updated GradeRecord.
 */
export async function saveGrade(
  activityId: string,
  studentId: string,
  score: number | null
): Promise<GradeRecord> {
  if (IS_MOCK) {
    if (!mockStore[activityId]) {
      mockStore[activityId] = {};
    }
    mockStore[activityId][studentId] = score;
    return { studentId, activityId, score };
  }
  return request<GradeRecord>('PUT', `/api/grades/${activityId}/${studentId}`, { score });
}

/**
 * Resets the mock store to its initial state.
 * Useful for testing — not exposed in the barrel file.
 */
export function _resetMockStore(): void {
  mockStore = JSON.parse(JSON.stringify(INITIAL_SCORES));
}
