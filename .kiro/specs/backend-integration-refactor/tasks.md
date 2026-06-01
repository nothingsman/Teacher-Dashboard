# Implementation Plan: Backend Integration Refactor

## Overview

Introduce a `src/services/` layer that abstracts every data read and mutation behind typed async functions. All mock data moves from components into service modules. Components are refactored to initialise state from service calls. No UI or visual behaviour changes.

The implementation follows this order:
1. API client + shared infrastructure
2. Service modules (one per domain)
3. Component refactoring (one per module)
4. `sharedStore.ts` refactor
5. Barrel file and cleanup

---

## Tasks

- [x] 1. Create the `src/services/` directory and implement `apiClient.ts`
  - Create `src/services/apiClient.ts` with the `ApiError` class (`message: string`, `status: number`)
  - Implement `request<T>(method, path, body?)` that reads `process.env.NEXT_PUBLIC_API_BASE_URL`
  - In mock mode (env var unset): throw `new Error('Mock mode: use service Mock Adapter directly')`
  - In real mode: call `fetch(baseUrl + path, …)`, parse JSON, throw `ApiError` on non-2xx or network failure
  - Wrap all fetch errors so non-HTTP failures produce `ApiError` with `status: 0`
  - _Requirements: 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 2. Implement `activitiesService.ts`
  - [x] 2.1 Create `src/services/activitiesService.ts`
    - Copy the `Activity` type from `sharedStore.ts` and export it
    - Copy `defaultActivities` array and `STORAGE_KEY` / `STORAGE_VERSION_KEY` / `CURRENT_VERSION` constants from `sharedStore.ts` as the mock data source
    - Implement `getActivities()`: in mock mode return `[...mockStore]` (loaded from localStorage with the same `loadActivities` logic); in real mode call `request<Activity[]>('GET', '/activities')`
    - Implement `createActivity(activity: Activity)`: in mock mode persist to localStorage and dispatch `edugov_activities_updated`; in real mode call `request`
    - Implement `updateActivity(id, changes)`: in mock mode merge and persist; in real mode call `request`
    - Implement `deleteActivity(id)`: in mock mode filter and persist; in real mode call `request`
    - Every mock mutation must dispatch `window.dispatchEvent(new Event('edugov_activities_updated'))` exactly once
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1_

  - [x] 2.2 Write property test for Activity round-trip (Property 1)
    - **Property 1: Activity round-trip**
    - **Validates: Requirements 2.4, 2.6**
    - File: `src/services/__tests__/activitiesService.test.ts`
    - Use `fc.record({ id: fc.string(), title: fc.string(), shortTitle: fc.string(), subject: fc.string(), type: fc.string(), maxScore: fc.nat(), sections: fc.array(fc.string(), { minLength: 1 }), status: fc.string() })` to generate arbitrary activities
    - Assert `getActivities()` after `createActivity(activity)` includes an object deeply equal to the created activity

  - [x] 2.3 Write property test for mutation dispatches reactivity event (Property 12)
    - **Property 12: Activity mutation dispatches reactivity event**
    - **Validates: Requirements 12.1**
    - File: `src/services/__tests__/activitiesService.test.ts`
    - Use `fc.oneof` over create/update/delete arbitraries
    - Spy on `window.dispatchEvent`; assert it is called exactly once with `'edugov_activities_updated'` per mutation

- [x] 3. Implement `studentsService.ts`
  - [x] 3.1 Create `src/services/studentsService.ts`
    - Define and export the unified `Student` interface (superset of all student fields from `StudentsModule`, `GradebookModule`, `HomeworksModule`, `AnalyticsCharts`, and `page.tsx`)
    - Populate `mockStore` with the combined roster (8 students from `StudentsModule.tsx` / `GradebookModule.tsx`, enriched with analytics fields from `AnalyticsCharts.tsx` and performance fields from `page.tsx`)
    - Implement `getStudents()`: return `[...mockStore]`
    - Implement `getStudentsBySection(section: string)`: return students filtered by `student.section === section`
    - Implement `updateStudent(id, changes)`: merge `changes` into the matching student, return the updated student; return `null` if not found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Write property test for Student update merge (Property 4)
    - **Property 4: Student update merge**
    - **Validates: Requirements 3.4**
    - File: `src/services/__tests__/studentsService.test.ts`
    - Generate a random student and a random partial changes object; assert every field in `changes` matches the returned student and every absent field is unchanged

  - [x] 3.3 Write property test for Section filter correctness (Property 5)
    - **Property 5: Section filter correctness**
    - **Validates: Requirements 3.5**
    - File: `src/services/__tests__/studentsService.test.ts`
    - Use `fc.constantFrom('Grade 7A', 'Grade 7B', 'Grade 8A', 'Grade 8B', 'Grade 9A', 'Grade 10A')`
    - Assert every returned student has `student.section === section` and no student from another section appears

- [x] 4. Implement `gradebookService.ts`
  - [x] 4.1 Create `src/services/gradebookService.ts`
    - Define and export `GradeRecord` interface (`studentId`, `activityId`, `score: number | null`)
    - Populate `mockStore` with the score map from `INITIAL_STUDENTS` in `GradebookModule.tsx` (keyed by `activityId → studentId → score`)
    - Implement `getGrades(activityId: string)`: return the score map for that activity as `GradeRecord[]`
    - Implement `saveGrade(activityId, studentId, score)`: update the in-memory store and return the updated `GradeRecord`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Write property test for Grade save round-trip (Property 3)
    - **Property 3: Grade save round-trip**
    - **Validates: Requirements 4.3, 4.5**
    - File: `src/services/__tests__/gradebookService.test.ts`
    - Use `fc.tuple(fc.constantFrom('ACT-001', …), fc.constantFrom('STU-00421', …), fc.option(fc.float({ min: 0, max: 100 })))`
    - Assert `getGrades(activityId)` after `saveGrade(…)` returns the saved score for that student

- [x] 5. Implement `analyticsService.ts`
  - [x] 5.1 Create `src/services/analyticsService.ts`
    - Define and export `SectionAnalytics` and `StudentAnalytics` interfaces (matching shapes in `AnalyticsModule.tsx` and `AnalyticsCharts.tsx`)
    - Copy `SECTION_DATA` from `AnalyticsModule.tsx` as the mock data source
    - Copy `STUDENT_ANALYTICS` from `AnalyticsCharts.tsx` as the mock data source
    - Implement `getSectionAnalytics(sectionName: string)`: return the matching section object or `null` if not found
    - Implement `getStudentAnalytics()`: return `[...mockStudentStore]`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Write property test for Section analytics lookup (Property 13)
    - **Property 13: Section analytics lookup**
    - **Validates: Requirements 5.2**
    - File: `src/services/__tests__/analyticsService.test.ts`
    - Use `fc.constantFrom(...Object.keys(SECTION_DATA))`
    - Assert the returned object is non-null and its `students`, `sectionAvg`, and `gradeDistribution` fields match the mock data

- [x] 6. Implement `homeworkService.ts`
  - [x] 6.1 Create `src/services/homeworkService.ts`
    - Define and export `DailyEntry` interface (matching shape in `HomeworksModule.tsx`)
    - Copy `initialEntries` from `HomeworksModule.tsx` as the mock data source
    - Implement `getEntries(section: string, dateRange?: { from: string; to: string })`: return entries filtered by `entry.section === section` and optional date range
    - Implement `createEntry(entry: Omit<DailyEntry, 'id'>)`: generate an ID, add to store, return the created entry
    - Implement `updateEntryScores(entryId: string, scores: Record<string, number | null>)`: merge scores into the entry, return the updated entry
    - Implement `toggleParentVisibility(entryId: string)`: flip `parentVisible`, return the updated entry
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Write property test for Homework entry round-trip (Property 6)
    - **Property 6: Homework entry round-trip**
    - **Validates: Requirements 6.3, 6.6**
    - File: `src/services/__tests__/homeworkService.test.ts`
    - Generate a valid `DailyEntry` (without `id`) using `fc.record`; assert `getEntries(entry.section)` after `createEntry(entry)` includes the created entry with all original fields preserved

  - [x] 6.3 Write property test for Homework section filter (Property 7)
    - **Property 7: Homework section filter**
    - **Validates: Requirements 6.2**
    - File: `src/services/__tests__/homeworkService.test.ts`
    - Use `fc.constantFrom('Grade 7A', 'Grade 7B', …)`
    - Assert every returned entry has `entry.section === section`

- [x] 7. Implement `messagesService.ts`
  - [x] 7.1 Create `src/services/messagesService.ts`
    - Define and export `Thread`, `Message`, `Attachment`, and `StudentSnapshot` interfaces (identical to those currently exported from `MessagesModule.tsx`)
    - Move `THREADS_DATA` array from `MessagesModule.tsx` into this file as the mock data source; export `THREADS_DATA` from this file
    - Implement `getThreads()`: return `[...mockStore]`
    - Implement `sendMessage(threadId, message: Omit<Message, 'id'>)`: append message with generated ID to the thread, return the updated thread
    - Implement `markThreadRead(threadId)`: set `unread: false` on the matching thread
    - Implement `markAllRead()`: set `unread: false` on all threads
    - Implement `updateParentInfo(threadId, changes: Partial<Thread>)`: merge changes into the thread, return the updated thread
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.2 Write property test for Message send round-trip (Property 8)
    - **Property 8: Message send round-trip**
    - **Validates: Requirements 7.3, 7.6**
    - File: `src/services/__tests__/messagesService.test.ts`
    - Use `fc.tuple(fc.constantFrom('THR-001', 'THR-002', …), fc.string({ minLength: 1 }))`
    - Assert `getThreads()` after `sendMessage(threadId, …)` returns the thread where the last message contains the sent text

  - [x] 7.3 Write property test for Mark thread read (Property 9)
    - **Property 9: Mark thread read**
    - **Validates: Requirements 7.4**
    - File: `src/services/__tests__/messagesService.test.ts`
    - Use `fc.constantFrom('THR-001', 'THR-002', …)`
    - Assert `getThreads()` after `markThreadRead(threadId)` returns the thread with `unread === false`

- [x] 8. Implement `scheduleService.ts`
  - [x] 8.1 Create `src/services/scheduleService.ts`
    - Define and export `ClassSlot` and `CalendarEvent` interfaces (identical to those in `ScheduleModule.tsx`)
    - Copy `MASTER_TIMETABLE_DATA` (and the `getFullTimetable()` expansion logic) from `ScheduleModule.tsx` as the mock data source
    - Copy `YEARLY_CALENDAR_DATA` from `ScheduleModule.tsx` as the mock data source
    - Implement `getTimetable(grade: string, section: string)`: return all `ClassSlot` entries where `slot.grade === grade && slot.section === section`, across all days
    - Implement `getAcademicCalendar()`: return `[...YEARLY_CALENDAR_DATA]`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 8.2 Write property test for Timetable slot filter (Property 10)
    - **Property 10: Timetable slot filter**
    - **Validates: Requirements 8.2**
    - File: `src/services/__tests__/scheduleService.test.ts`
    - Use `fc.tuple(fc.constantFrom('Grade 6', 'Grade 7', …), fc.constantFrom('Sec A', 'Sec B', 'Sec C'))`
    - Assert every returned `ClassSlot` has `slot.grade === grade && slot.section === section`

- [x] 9. Implement `notificationsService.ts`
  - [x] 9.1 Create `src/services/notificationsService.ts`
    - Define and export `Notification` interface (`id`, `title`, `desc`, `time`, `urgent`, `read`)
    - Copy the notifications array from `page.tsx` as the mock data source
    - Implement `getNotifications()`: return `[...mockStore]`
    - Implement `markAllNotificationsRead()`: set `read: true` on all notifications, return the updated list
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.2 Write property test for Mark all notifications read (Property 11)
    - **Property 11: Mark all notifications read**
    - **Validates: Requirements 9.3**
    - File: `src/services/__tests__/notificationsService.test.ts`
    - Use `fc.array(fc.record({ id: fc.nat(), title: fc.string(), desc: fc.string(), time: fc.string(), urgent: fc.boolean(), read: fc.boolean() }), { minLength: 1 })`
    - Seed the mock store with the generated array; assert every notification has `read === true` after `markAllNotificationsRead()`

- [x] 10. Implement `profileService.ts`
  - Create `src/services/profileService.ts`
  - Define and export `TeacherProfile` interface (`name`, `initials`, `role`, `grade`, `section`)
  - Implement `getTeacherProfile()`: return the hardcoded profile (`Sara Kassa`, `SK`, `Primary Teacher`, `Grade 7`, `Sec A`) matching the values in `page.tsx`
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 11. Create the barrel file `src/services/index.ts`
  - Re-export all Domain_Types: `Activity`, `Student`, `GradeRecord`, `SectionAnalytics`, `StudentAnalytics`, `DailyEntry`, `Thread`, `Message`, `Attachment`, `StudentSnapshot`, `ClassSlot`, `CalendarEvent`, `Notification`, `TeacherProfile`
  - Re-export `ApiError` from `./apiClient`
  - Re-export all service functions via `export * from './activitiesService'` etc. for each service module
  - _Requirements: 1.5_

- [x] 12. Checkpoint — Ensure all service modules and barrel file compile
  - Run `npx tsc --noEmit` and confirm zero type errors across all new files in `src/services/`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Refactor `sharedStore.ts` to delegate to `activitiesService`
  - Remove the `loadActivities`, `saveActivities`, `STORAGE_KEY`, `STORAGE_VERSION_KEY`, `CURRENT_VERSION`, and `defaultActivities` definitions from `sharedStore.ts` (they now live in `activitiesService.ts`)
  - Refactor `useSharedActivities` to call `activitiesService.getActivities()` in `useEffect` instead of `loadActivities()`
  - Refactor `addActivity`, `updateActivity`, `deleteActivity` to call the corresponding `activitiesService` functions
  - Keep the hook's public API (`activities`, `addActivity`, `updateActivity`, `deleteActivity`) identical
  - Keep the `edugov_activities_updated` event subscription in the hook (the service now dispatches it)
  - Export the `Activity` type from `sharedStore.ts` as a re-export from `'./services'` for backward compatibility
  - _Requirements: 2.3, 12.1, 12.2, 13.1_

- [x] 14. Refactor `ActivitiesModule.tsx`
  - [x] 14.1 Remove `ROSTERS_BY_SECTION` hardcoded constant
    - Replace the `ROSTERS_BY_SECTION` lookup in the grading panel with a call to `studentsService.getStudentsBySection(section)` inside a `useEffect` that runs when `selectedGradingSection` changes
    - Store the result in local state (`studentsToGrade`)
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 14.2 Update type imports in `ActivitiesModule.tsx`
    - Change `import type { Activity } from '../sharedStore'` to `import type { Activity } from '../services'`
    - _Requirements: 11.6_

- [x] 15. Refactor `GradebookModule.tsx`
  - [x] 15.1 Remove `INITIAL_STUDENTS` hardcoded array and replace with service calls
    - Add a `useEffect` that calls `studentsService.getStudents()` to initialise the `students` state
    - Add a `useEffect` that calls `gradebookService.getGrades(selectedActivityId)` when `selectedActivityId` changes, and merges the returned scores into the `students` state
    - Replace the inline `handleScoreChange` persistence with a call to `gradebookService.saveGrade(activityId, studentId, score)` on blur / Enter
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 15.2 Update type imports in `GradebookModule.tsx`
    - Change `import type { Activity } from '../sharedStore'` (if present) to `import type { Activity } from '../services'`
    - _Requirements: 11.6_

- [x] 16. Refactor `AnalyticsModule.tsx`
  - Remove `SECTION_DATA` constant and `SECTIONS` array derived from it
  - Add a `useEffect` that calls `analyticsService.getSectionAnalytics(selectedSection)` when `selectedSection` changes; store the result in `currentSectionData` state (initialised to the default section)
  - Handle the `null` return (unknown section) by keeping the previous state
  - Keep the `useSharedActivities()` call unchanged
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 17. Refactor `AnalyticsCharts.tsx`
  - [x] 17.1 Remove `STUDENT_ANALYTICS` constant
    - Add a `students: StudentAnalytics[]` prop to both `PerformanceDistribution` and `ParentEngagementChart` components, defaulting to `[]`
    - Replace all references to `STUDENT_ANALYTICS` inside those components with the `students` prop
    - _Requirements: 11.1, 11.4, 13.4_

  - [x] 17.2 Update callers of `PerformanceDistribution` and `ParentEngagementChart` in `page.tsx`
    - In `page.tsx`, add a `useEffect` that calls `analyticsService.getStudentAnalytics()` and stores the result in state
    - Pass the state value as the `students` prop to both chart components
    - _Requirements: 11.2, 11.4_

- [x] 18. Refactor `HomeworksModule.tsx`
  - [x] 18.1 Remove `initialEntries` and `STUDENTS_BY_SECTION` constants
    - Add a `useEffect` that calls `homeworkService.getEntries(selectedSection)` when `selectedSection` changes; initialise `entries` state from the result
    - Add a `useEffect` that calls `studentsService.getStudentsBySection(selectedSection)` when `selectedSection` changes; store the result in a `sectionStudents` state used in the grading panel
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 18.2 Replace in-component mutations with service calls
    - Replace `setEntries(prev => ...)` in `handleToggleParentVisible` with `homeworkService.toggleParentVisibility(id)` then refresh state
    - Replace `setEntries(prev => ...)` in `handleSaveScores` with `homeworkService.updateEntryScores(entryId, editScores)` then refresh state
    - Replace `setEntries(prev => [...prev, entry])` in `handleCreateEntry` with `homeworkService.createEntry(newEntry)` then refresh state
    - _Requirements: 11.3_

- [x] 19. Refactor `MessagesModule.tsx`
  - Add a re-export of `THREADS_DATA` from `'../services/messagesService'` so `page.tsx` import continues to work: `export { THREADS_DATA } from '../services/messagesService'`
  - The `Thread` type re-export: `export type { Thread } from '../services/messagesService'`
  - Remove the `THREADS_DATA` array definition from this file (it now lives in `messagesService.ts`)
  - The component props (`threads`, `onThreadsUpdate`) remain unchanged — `page.tsx` continues to own thread state
  - _Requirements: 11.1, 13.1, 13.2_

- [x] 20. Refactor `ScheduleModule.tsx`
  - [x] 20.1 Remove `MASTER_TIMETABLE_DATA`, `getFullTimetable()`, and `YEARLY_CALENDAR_DATA` from `ScheduleModule.tsx`
    - In `SchedulePDFModal`, replace the `useMemo` that filters `MASTER_TIMETABLE` with a `useEffect` that calls `scheduleService.getTimetable(selectedGrade, selectedSection)` when grade/section change; store the result in state
    - Replace the `YEARLY_CALENDAR_DATA` reference with a `useEffect` that calls `scheduleService.getAcademicCalendar()` on mount; store the result in state
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 20.2 Verify named exports are unchanged
    - Confirm `OverviewScheduleWidget` and `SchedulePDFModal` are still exported from `ScheduleModule.tsx`
    - _Requirements: 13.3_

- [x] 21. Refactor `page.tsx`
  - [x] 21.1 Replace hardcoded `STUDENTS` with service call
    - Remove the `React.useMemo(() => [...])` `STUDENTS` constant
    - Add a `useEffect` that calls `studentsService.getStudents()` on mount; store the result in `students` state (replacing the `useMemo`)
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 21.2 Replace hardcoded `notifications` with service call
    - Remove the hardcoded notifications array from `useState` initialiser
    - Add a `useEffect` that calls `notificationsService.getNotifications()` on mount; store the result in `notifications` state
    - Replace `setNotifications(prev => prev.map(n => ({ ...n, read: true })))` in `handleMarkAllNotificationsRead` with `notificationsService.markAllNotificationsRead()` then refresh state
    - _Requirements: 11.1, 11.3, 11.4_

  - [x] 21.3 Replace hardcoded teacher profile with service call
    - Add a `useEffect` that calls `profileService.getTeacherProfile()` on mount; store the result in `teacherProfile` state
    - Replace the hardcoded `SK` / `Sara Kassa` / `Primary Teacher` strings in the sidebar footer with values from `teacherProfile`
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 21.4 Update `THREADS_DATA` and `Thread` imports in `page.tsx`
    - The `THREADS_DATA` import from `'../components/MessagesModule'` continues to work via the re-export added in task 19
    - Change `import type { Thread } from '../components/MessagesModule'` to `import type { Thread } from '../services'`
    - _Requirements: 11.6, 13.2_

- [x] 22. Checkpoint — Full integration verification
  - Run `npx tsc --noEmit` and confirm zero type errors across the entire project
  - Verify the app renders without console errors in the browser
  - Confirm activities created in `ActivitiesModule` appear in `GradebookModule` task strip without a page reload
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Write property-based test infrastructure setup
  - [x] 23.1 Install `fast-check` as a dev dependency
    - Run `npm install --save-dev fast-check`
    - Create `src/services/__tests__/` directory
    - _Requirements: (testing infrastructure)_

- [x] 24. Write `apiClient` property test
  - [x] 24.1 Write property test for ApiError shape on HTTP failure (Property 2)
    - **Property 2: ApiError shape on HTTP failure**
    - **Validates: Requirements 1.6**
    - File: `src/services/__tests__/apiClient.test.ts`
    - Use `fc.integer({ min: 400, max: 599 })` to generate HTTP error status codes
    - Mock `fetch` to return a response with the generated status; assert the thrown error is an `ApiError` with `status === generatedStatus` and a non-empty `message`

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The `MessagesModule` component props interface is intentionally unchanged — `page.tsx` continues to own thread state and pass it down as props
- The `AnalyticsCharts` components gain a `students` prop but their export signatures remain unchanged
- All service modules follow the same Mock Adapter pattern: `IS_MOCK` flag, in-memory store, and real-mode delegation to `apiClient`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "8.1", "9.1", "10"] },
    { "id": 2, "tasks": ["11", "2.2", "2.3", "3.2", "3.3", "4.2", "5.2", "6.2", "6.3", "7.2", "7.3", "8.2", "9.2", "24.1"] },
    { "id": 3, "tasks": ["12", "13"] },
    { "id": 4, "tasks": ["14.1", "14.2", "15.1", "15.2", "16", "17.1", "18.1", "19", "20.1", "20.2"] },
    { "id": 5, "tasks": ["17.2", "18.2", "21.1", "21.2", "21.3", "21.4"] },
    { "id": 6, "tasks": ["22", "23.1"] }
  ]
}
```
