# Design Document — Backend Integration Refactor

## Overview

This refactor introduces a dedicated service layer (`src/services/`) that sits between React components and all data sources. The goal is purely architectural: every data read and every mutation is routed through a typed async function in a service module. No UI, no props, no visual behaviour changes.

After the refactor, swapping mock data for real HTTP calls requires editing only the service modules — no component file is touched.

### Key Design Decisions

- **Mock-first, real-ready**: Each service module ships with a built-in Mock Adapter that returns the current hardcoded data. When `NEXT_PUBLIC_API_BASE_URL` is set, the same function signatures delegate to the shared `apiClient` for real HTTP calls.
- **Single barrel export**: `src/services/index.ts` re-exports every Domain_Type so components have one import location.
- **Preserve reactivity**: The `edugov_activities_updated` browser event and `useSharedActivities` hook are kept intact; the hook is refactored to call the Activities Service instead of touching localStorage directly.
- **No new dependencies**: The API client wraps the native `fetch` API. No Axios, SWR, or React Query is introduced.

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│  (ActivitiesModule, GradebookModule, page.tsx, …)           │
│  — call service functions / useSharedActivities hook        │
└────────────────────────┬────────────────────────────────────┘
                         │ async function calls
┌────────────────────────▼────────────────────────────────────┐
│                   src/services/                             │
│                                                             │
│  activitiesService.ts   studentsService.ts                  │
│  gradebookService.ts    analyticsService.ts                 │
│  homeworkService.ts     messagesService.ts                  │
│  scheduleService.ts     notificationsService.ts             │
│  profileService.ts                                          │
│                                                             │
│  Each module: Mock Adapter  ──►  in-memory / localStorage   │
│               Real Adapter  ──►  apiClient.ts               │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch (real mode only)
┌────────────────────────▼────────────────────────────────────┐
│                   apiClient.ts                              │
│  request<T>(method, path, body?) → Promise<T>               │
│  Mock mode: delegates back to service Mock Adapter          │
│  Real mode: fetch(NEXT_PUBLIC_API_BASE_URL + path, …)       │
└─────────────────────────────────────────────────────────────┘
```

### Mode Switching

```
NEXT_PUBLIC_API_BASE_URL not set  →  Mock mode (default)
NEXT_PUBLIC_API_BASE_URL = "https://api.example.com"  →  Real mode
```

The environment variable is read once at module load time. No runtime toggle is needed.

### Cross-Component Reactivity

The existing `edugov_activities_updated` browser event is preserved. The Activities Service dispatches this event after every mutation. The `useSharedActivities` hook subscribes to it, so `ActivitiesModule`, `GradebookModule`, and `AnalyticsModule` all stay in sync without a page reload.

```
ActivitiesModule
  └─ calls activitiesService.createActivity(…)
       └─ persists to localStorage
       └─ dispatches window.dispatchEvent('edugov_activities_updated')
            └─ useSharedActivities handler fires in all subscribers
                 └─ GradebookModule re-renders with new activity in task strip
```

---

## Components and Interfaces

### apiClient.ts

```typescript
// src/services/apiClient.ts

export class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T>
```

- In **mock mode** (`NEXT_PUBLIC_API_BASE_URL` unset): throws `new Error('Mock mode: use service Mock Adapter directly')`. Service modules never call `request` in mock mode — they return mock data directly.
- In **real mode**: calls `fetch(baseUrl + path, { method, headers, body })`, parses JSON, and throws `ApiError` on non-2xx responses or network failures.

### Service Module Pattern

Every service module follows this pattern:

```typescript
// src/services/exampleService.ts

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// In-memory store (mock mode only)
let mockStore: ExampleType[] = [...INITIAL_DATA];

export async function getItems(): Promise<ExampleType[]> {
  if (IS_MOCK) return [...mockStore];
  return request<ExampleType[]>('GET', '/items');
}

export async function createItem(item: Omit<ExampleType, 'id'>): Promise<ExampleType> {
  if (IS_MOCK) {
    const created = { ...item, id: generateId() };
    mockStore = [...mockStore, created];
    return created;
  }
  return request<ExampleType>('POST', '/items', item);
}
```

### src/services/index.ts (Barrel File)

```typescript
// Domain Types
export type { Activity } from './activitiesService';
export type { Student, StudentSummary } from './studentsService';
export type { GradeRecord } from './gradebookService';
export type { SectionAnalytics, StudentAnalytics } from './analyticsService';
export type { DailyEntry } from './homeworkService';
export type { Thread, Message, Attachment, StudentSnapshot } from './messagesService';
export type { ClassSlot, CalendarEvent } from './scheduleService';
export type { Notification } from './notificationsService';
export type { TeacherProfile } from './profileService';

// ApiError
export { ApiError } from './apiClient';

// Service functions (re-exported for convenience)
export * from './activitiesService';
export * from './studentsService';
export * from './gradebookService';
export * from './analyticsService';
export * from './homeworkService';
export * from './messagesService';
export * from './scheduleService';
export * from './notificationsService';
export * from './profileService';
```

---

## Data Models

### Activity (from sharedStore.ts — unchanged shape)

```typescript
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
```

### Student (unified superset)

```typescript
export interface Student {
  // Core identity (all components)
  id: string;
  name: string;
  grade: string;
  section: string;
  status: 'Active' | 'Pending' | 'Withdrawn';
  parentLinked: boolean;
  enrolled: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  // Analytics fields (AnalyticsCharts.tsx)
  avatar?: string;
  overallAvg?: number;
  trend?: number[];
  subjects?: Record<string, number>;
  attendance?: number;
  parentEngagement?: number;
  submissions?: { submitted: number; late: number; missing: number };
  recentGrades?: number[];
  risk?: string;
  // Overview fields (page.tsx)
  performance?: number;
}
```

### GradeRecord

```typescript
export interface GradeRecord {
  studentId: string;
  activityId: string;
  score: number | null;
}
```

### SectionAnalytics

```typescript
export interface SectionAnalytics {
  students: number;
  sectionAvg: number;
  sectionAvgTrend: number[];
  topPerformersTrend: number[];
  atRiskTrend: number[];
  gradeDistribution: { A: number; B: number; C: number; F: number };
  attendance: { present: number; late: number; absent: number };
  chronicAbsentees: Array<{ name: string; initials: string; rate: number }>;
  subjectAvgs: Array<{ subject: string; avg: number; color: string }>;
  submissions: { submitted: number; late: number; missing: number };
  parentEngagement: { high: number; moderate: number; low: number };
  activityPerformance: Array<{
    title: string;
    type: string;
    avgPct: number;
    avgScore: string;
    grade: string;
    submitted: number;
    total: number;
  }>;
}
```

### StudentAnalytics (from AnalyticsCharts.tsx — unchanged shape)

```typescript
export interface StudentAnalytics {
  id: string;
  name: string;
  avatar: string;
  overallAvg: number;
  trend: number[];
  subjects: Record<string, number>;
  attendance: number;
  parentEngagement: number;
  submissions: { submitted: number; late: number; missing: number };
  recentGrades: number[];
  risk: string;
}
```

### DailyEntry (from HomeworksModule.tsx — unchanged shape)

```typescript
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
```

### Thread, Message, Attachment, StudentSnapshot (from MessagesModule.tsx — unchanged shapes)

```typescript
export interface Attachment {
  type: 'report' | 'homework' | 'voice';
  title: string;
  subtitle: string;
  value: string;
  duration?: string;
}

export interface Message {
  id: string;
  sender: 'teacher' | 'parent';
  text: string;
  time: string;
  readAt?: string | null;
  attachment?: Attachment | null;
}

export interface StudentSnapshot {
  overallAvg: number;
  attendance: number;
  parentEngagement: number;
  recentHomework: Array<{ title: string; score: number | null; max: number }>;
}

export interface Thread {
  id: string;
  parentName: string;
  parentInitials: string;
  parentPhone: string;
  parentEmail: string;
  parentAddress?: string;
  relation?: string;
  studentName: string;
  studentId: string;
  studentGrade: string;
  avatarColor: string;
  unread: boolean;
  lastTime: string;
  preview: string;
  studentSnapshot: StudentSnapshot;
  messages: Message[];
}
```

### ClassSlot, CalendarEvent (from ScheduleModule.tsx — unchanged shapes)

```typescript
export interface ClassSlot {
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  grade: string;
  section: string;
}

export interface CalendarEvent {
  date: string;
  title: string;
  holiday: boolean;
  type: 'academic' | 'break' | 'exam' | 'community';
  description: string;
}
```

### Notification

```typescript
export interface Notification {
  id: number;
  title: string;
  desc: string;
  time: string;
  urgent: boolean;
  read: boolean;
}
```

### TeacherProfile

```typescript
export interface TeacherProfile {
  name: string;
  initials: string;
  role: string;
  grade: string;
  section: string;
}
```

### ApiError

```typescript
export class ApiError extends Error {
  message: string;
  status: number;  // HTTP status code, or 0 for network/parse errors
}
```

---

## Component Refactoring Plan

### sharedStore.ts

The `useSharedActivities` hook is refactored to call `activitiesService` functions instead of reading/writing localStorage directly. The hook's public API (`activities`, `addActivity`, `updateActivity`, `deleteActivity`) is unchanged.

```typescript
// Before
const addActivity = (activity: Activity) => {
  const updated = [...loadActivities(), activity];
  saveActivities(updated);  // writes localStorage directly
  setActivities(updated);
};

// After
const addActivity = async (activity: Activity) => {
  const created = await activitiesService.createActivity(activity);
  setActivities(await activitiesService.getActivities());
};
```

The `Activity` type import in `ActivitiesModule.tsx` moves from `'../sharedStore'` to `'../services'`.

### ActivitiesModule.tsx

- Remove `ROSTERS_BY_SECTION` hardcoded data → call `studentsService.getStudentsBySection(section)` in the grading panel.
- Keep `useSharedActivities` hook usage unchanged.
- Import `Activity` type from `'../services'`.

### GradebookModule.tsx

- Remove `INITIAL_STUDENTS` hardcoded array → initialise state from `gradebookService.getGrades(activityId)` and `studentsService.getStudents()` in a `useEffect`.
- Score saves call `gradebookService.saveGrade(activityId, studentId, score)`.
- Import `Activity` type from `'../services'`.

### AnalyticsModule.tsx

- Remove `SECTION_DATA` constant → call `analyticsService.getSectionAnalytics(sectionName)` when `selectedSection` changes.
- `useSharedActivities` call for the `activities` variable is kept (satisfies existing import).

### AnalyticsCharts.tsx

- Remove `STUDENT_ANALYTICS` constant → `PerformanceDistribution` and `ParentEngagementChart` accept a `students: StudentAnalytics[]` prop, or call `analyticsService.getStudentAnalytics()` in a `useEffect`.
- Export `PerformanceDistribution` and `ParentEngagementChart` remain unchanged.

### HomeworksModule.tsx

- Remove `initialEntries` and `STUDENTS_BY_SECTION` constants → initialise from `homeworkService.getEntries(section)` and `studentsService.getStudentsBySection(section)`.
- `createEntry`, `updateEntryScores`, `toggleParentVisibility` mutations call the corresponding service functions.

### MessagesModule.tsx

- `THREADS_DATA` is moved to `messagesService.ts` as the mock data source.
- `THREADS_DATA` is re-exported from `MessagesModule.tsx` for backward compatibility with `page.tsx`.
- `MessagesModule` props (`threads`, `onThreadsUpdate`) remain unchanged — `page.tsx` continues to own thread state and pass it down.

### ScheduleModule.tsx

- Remove `MASTER_TIMETABLE_DATA` and `YEARLY_CALENDAR_DATA` constants → `SchedulePDFModal` calls `scheduleService.getTimetable(grade, section)` and `scheduleService.getAcademicCalendar()`.
- Named exports `OverviewScheduleWidget` and `SchedulePDFModal` remain unchanged.

### page.tsx

- Remove `STUDENTS` hardcoded array → initialise from `studentsService.getStudents()`.
- Remove `notifications` hardcoded array → initialise from `notificationsService.getNotifications()`.
- `markAllNotificationsRead` calls `notificationsService.markAllNotificationsRead()`.
- Teacher profile (`SK`, `Sara Kassa`) comes from `profileService.getTeacherProfile()`.
- `THREADS_DATA` import moves to `messagesService` (or stays via re-export from `MessagesModule`).
- Import `Thread` type from `'../services'`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Activity round-trip

*For any* valid `Activity` object, calling `createActivity(activity)` followed by `getActivities()` should return a list that includes an object deeply equal to the created activity.

**Validates: Requirements 2.4, 2.6**

---

### Property 2: ApiError shape on HTTP failure

*For any* HTTP error status code (4xx or 5xx), when a service function encounters that error in real mode, it should throw an `ApiError` whose `status` field equals the HTTP status code and whose `message` field is a non-empty string.

**Validates: Requirements 1.6**

---

### Property 3: Grade save round-trip

*For any* `activityId`, `studentId`, and `score` (number or null), calling `saveGrade(activityId, studentId, score)` followed by `getGrades(activityId)` should return a record where the score for `studentId` equals the saved value.

**Validates: Requirements 4.3, 4.5**

---

### Property 4: Student update merge

*For any* student ID and any partial changes object, calling `updateStudent(id, changes)` should return a student where every field present in `changes` matches the corresponding value in `changes`, and every field absent from `changes` retains its original value.

**Validates: Requirements 3.4**

---

### Property 5: Section filter correctness

*For any* section string, every `Student` returned by `getStudentsBySection(section)` should have `student.section === section`, and no student from a different section should appear in the result.

**Validates: Requirements 3.5**

---

### Property 6: Homework entry round-trip

*For any* valid `DailyEntry` (without an ID), calling `createEntry(entry)` followed by `getEntries(entry.section)` should return a list that includes the created entry with all original fields preserved.

**Validates: Requirements 6.3, 6.6**

---

### Property 7: Homework section filter

*For any* section string, every `DailyEntry` returned by `getEntries(section)` should have `entry.section === section`.

**Validates: Requirements 6.2**

---

### Property 8: Message send round-trip

*For any* `threadId` and message text, calling `sendMessage(threadId, text)` followed by `getThreads()` should return the thread where the last message has the sent text.

**Validates: Requirements 7.3, 7.6**

---

### Property 9: Mark thread read

*For any* thread ID, calling `markThreadRead(threadId)` followed by `getThreads()` should return the thread with `unread === false`.

**Validates: Requirements 7.4**

---

### Property 10: Timetable slot filter

*For any* grade and section string, every `ClassSlot` returned by `getTimetable(grade, section)` should have `slot.grade === grade` and `slot.section === section`.

**Validates: Requirements 8.2**

---

### Property 11: Mark all notifications read

*For any* initial set of notifications (including unread ones), calling `markAllNotificationsRead()` followed by `getNotifications()` should return a list where every notification has `read === true`.

**Validates: Requirements 9.3**

---

### Property 12: Activity mutation dispatches reactivity event

*For any* activity mutation (create, update, or delete), the `edugov_activities_updated` browser event should be dispatched exactly once after the mutation completes.

**Validates: Requirements 12.1**

---

### Property 13: Section analytics lookup

*For any* section name that exists in the mock data, `getSectionAnalytics(sectionName)` should return a non-null object whose key fields (e.g. `students`, `sectionAvg`, `gradeDistribution`) match the corresponding values in the mock data for that section.

**Validates: Requirements 5.2**

---

## Error Handling

### ApiError

All service functions in real mode wrap `fetch` calls in try/catch:

```typescript
try {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new ApiError(await res.text() || res.statusText, res.status);
  }
  return await res.json() as T;
} catch (err) {
  if (err instanceof ApiError) throw err;
  // Network timeout, JSON parse failure, etc.
  throw new ApiError((err as Error).message || 'Network error', 0);
}
```

### Mock Mode Errors

In mock mode, service functions do not throw unless explicitly testing error paths. Invalid inputs (e.g. `updateStudent` with a non-existent ID) return `null` or the unchanged store, matching the current component behaviour.

### Component Error Handling

Components initialise data in `useEffect` with a try/catch. On error, they fall back to an empty array / null state, preserving the existing "no data" UI states. No new error boundary components are introduced.

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const data = await someService.getData();
      if (!cancelled) setState(data);
    } catch {
      // keep existing empty state — no visual change
    }
  })();
  return () => { cancelled = true; };
}, []);
```

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples and edge cases for each service module:

- `getActivities()` returns the default activity list in mock mode
- `createActivity` with a minimal valid object returns an activity with a generated ID
- `updateStudent` with an empty changes object returns the original student unchanged
- `getSectionAnalytics` with an unknown section name returns `null`
- `ApiError` is thrown with `status: 0` on network failure (simulated with a mock `fetch`)

### Property-Based Tests

Property-based testing is appropriate for this feature because the service layer consists of pure data-transformation functions with clear input/output contracts, and the input space (arbitrary activity objects, student IDs, score values, section strings) is large enough that randomised inputs reveal edge cases that hand-written examples miss.

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript-native, no additional runtime dependencies beyond devDependencies)

**Configuration**: Each property test runs a minimum of 100 iterations.

**Tag format**: `// Feature: backend-integration-refactor, Property {N}: {property_text}`

Each correctness property above maps to exactly one property-based test:

| Property | Test file | Generator |
|---|---|---|
| 1 — Activity round-trip | `activitiesService.test.ts` | `fc.record({ id: fc.string(), title: fc.string(), … })` |
| 2 — ApiError shape | `apiClient.test.ts` | `fc.integer({ min: 400, max: 599 })` |
| 3 — Grade save round-trip | `gradebookService.test.ts` | `fc.tuple(fc.string(), fc.string(), fc.option(fc.float()))` |
| 4 — Student update merge | `studentsService.test.ts` | `fc.record(…)` for student + `fc.record(…)` for partial changes |
| 5 — Section filter | `studentsService.test.ts` | `fc.constantFrom('Grade 7A', 'Grade 7B', …)` |
| 6 — Homework entry round-trip | `homeworkService.test.ts` | `fc.record({ section: fc.string(), … })` |
| 7 — Homework section filter | `homeworkService.test.ts` | `fc.constantFrom(SECTIONS)` |
| 8 — Message send round-trip | `messagesService.test.ts` | `fc.tuple(fc.constantFrom(threadIds), fc.string())` |
| 9 — Mark thread read | `messagesService.test.ts` | `fc.constantFrom(threadIds)` |
| 10 — Timetable slot filter | `scheduleService.test.ts` | `fc.tuple(fc.constantFrom(GRADES), fc.constantFrom(SECTIONS))` |
| 11 — Mark all notifications read | `notificationsService.test.ts` | `fc.array(fc.record({ id: fc.nat(), read: fc.boolean(), … }))` |
| 12 — Mutation dispatches event | `activitiesService.test.ts` | `fc.oneof(createArb, updateArb, deleteArb)` |
| 13 — Section analytics lookup | `analyticsService.test.ts` | `fc.constantFrom(Object.keys(SECTION_DATA))` |

### Integration Tests

- Verify `useSharedActivities` hook re-renders subscribers when `edugov_activities_updated` fires (1–2 examples using React Testing Library)
- Verify `GradebookModule` task strip updates when a new activity is created via `ActivitiesModule` (1 example)

### Test Setup

```bash
# Install fast-check as a dev dependency
npm install --save-dev fast-check @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom ts-jest
```

Tests live in `src/services/__tests__/` and `src/components/__tests__/`.
