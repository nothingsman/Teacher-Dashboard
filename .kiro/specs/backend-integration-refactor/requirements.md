# Requirements Document

## Introduction

The Ethio Global Academy teacher dashboard is a Next.js application with all data hardcoded directly inside components and a shared localStorage-backed store (`sharedStore.ts`). The goal of this refactor is to introduce a dedicated API/service layer that abstracts every data source and every mutating action behind a clean interface. No UI, no visual behavior, and no user-facing functionality will change. After the refactor, swapping mock data for real HTTP calls to a backend must require changes only inside the service layer — not inside any React component.

The app currently has the following data domains, each with hardcoded mock data and/or in-component state mutations:

- **Activities** — managed via `sharedStore.ts` (localStorage + custom hook)
- **Students** — hardcoded in `StudentsModule.tsx`, `GradebookModule.tsx`, `AnalyticsCharts.tsx`, `HomeworksModule.tsx`, `ActivitiesModule.tsx`, and `page.tsx`
- **Gradebook scores** — hardcoded in `GradebookModule.tsx`
- **Analytics / section data** — hardcoded in `AnalyticsModule.tsx`
- **Homework / classwork entries** — hardcoded in `HomeworksModule.tsx`
- **Messages / threads** — hardcoded in `MessagesModule.tsx` and `page.tsx`
- **Schedule / timetable** — hardcoded in `ScheduleModule.tsx`
- **Notifications** — hardcoded in `page.tsx`
- **Teacher profile** — hardcoded in `page.tsx`

## Glossary

- **API_Layer**: The new `src/services/` directory containing all service modules and the API client.
- **API_Client**: A thin HTTP client module (`src/services/apiClient.ts`) that wraps `fetch` and provides base URL configuration, default headers, and error normalisation. In mock mode it returns hardcoded data; in real mode it makes HTTP calls.
- **Service_Module**: A TypeScript module inside `src/services/` that exposes typed async functions for one data domain (e.g. `activitiesService.ts`, `studentsService.ts`).
- **Mock_Adapter**: The portion of each Service_Module that returns the current hardcoded data, preserving identical behaviour during the refactor.
- **Component**: Any React component file under `src/components/` or `src/app/`.
- **SharedStore**: The existing `src/sharedStore.ts` file that manages activities state via localStorage.
- **Domain_Type**: A TypeScript interface or type that describes a data entity (e.g. `Activity`, `Student`, `Thread`, `DailyEntry`).
- **Mutation**: Any operation that creates, updates, or deletes data (e.g. adding an activity, saving a grade, sending a message).

---

## Requirements

### Requirement 1: Establish the API Client and Service Layer Structure

**User Story:** As a developer, I want a single, well-defined location for all data access logic, so that I can swap mock data for real API calls without touching any React component.

#### Acceptance Criteria

1. THE API_Layer SHALL contain a dedicated `src/services/` directory at the root of the `src/` folder.
2. THE API_Client SHALL be implemented in `src/services/apiClient.ts` and SHALL expose a typed `request<T>` function that accepts an HTTP method, a path, and an optional request body.
3. WHEN the environment variable `NEXT_PUBLIC_API_BASE_URL` is not set, THE API_Client SHALL operate in mock mode and return data from the Mock_Adapter of the relevant Service_Module.
4. WHEN the environment variable `NEXT_PUBLIC_API_BASE_URL` is set, THE API_Client SHALL make real HTTP requests to that base URL.
5. THE API_Layer SHALL export all Domain_Types from a single barrel file `src/services/index.ts` so that Components import types from one location.
6. IF a Service_Module function encounters an HTTP error, THEN THE Service_Module SHALL throw a typed `ApiError` object containing a `message` string and an HTTP `status` code.
7. IF a Service_Module function encounters a non-HTTP error (such as a network timeout or JSON parse failure), THEN THE Service_Module SHALL throw an `ApiError` with a placeholder `status` of `0`.

---

### Requirement 2: Activities Service

**User Story:** As a developer, I want all activity data access and mutations abstracted behind a service, so that the `ActivitiesModule`, `GradebookModule`, and `AnalyticsModule` components do not contain hardcoded data.

#### Acceptance Criteria

1. THE Activities_Service SHALL be implemented in `src/services/activitiesService.ts` and SHALL expose the following async functions: `getActivities()`, `createActivity(activity)`, `updateActivity(id, changes)`, and `deleteActivity(id)`.
2. WHEN `getActivities()` is called in mock mode, THE Activities_Service SHALL return the same default activity list currently defined in `sharedStore.ts`.
3. THE `useSharedActivities` hook in `sharedStore.ts` SHALL be refactored to call `Activities_Service` functions instead of reading and writing directly to localStorage.
4. WHEN `createActivity`, `updateActivity`, or `deleteActivity` is called, THE Activities_Service SHALL persist the change to localStorage in mock mode, preserving the current cross-component reactivity behaviour.
5. THE Activities_Service SHALL export the `Activity` Domain_Type.
6. FOR ALL activity objects returned by `getActivities()`, THE Activities_Service SHALL return objects that are structurally identical to the current `Activity` type defined in `sharedStore.ts` (round-trip property: the shape going in equals the shape coming out).

---

### Requirement 3: Students Service

**User Story:** As a developer, I want all student roster data centralised in a service, so that `StudentsModule`, `GradebookModule`, `HomeworksModule`, `ActivitiesModule`, and `page.tsx` all read from the same source.

#### Acceptance Criteria

1. THE Students_Service SHALL be implemented in `src/services/studentsService.ts` and SHALL expose `getStudents()` and `updateStudent(id, changes)` async functions.
2. WHEN `getStudents()` is called in mock mode, THE Students_Service SHALL return the combined student roster currently duplicated across `StudentsModule.tsx`, `GradebookModule.tsx`, `HomeworksModule.tsx`, and `page.tsx`.
3. THE Students_Service SHALL export a unified `Student` Domain_Type that is a superset of all student-related fields currently spread across the different components (id, name, grade, section, status, parentLinked, enrolled, parentName, parentPhone, parentEmail, performance, trend, subjects, attendance, parentEngagement, submissions, recentGrades, risk).
4. WHEN `updateStudent` is called with a partial student object, THE Students_Service SHALL merge the changes with the existing student record and return the updated student.
5. THE Students_Service SHALL expose a `getStudentsBySection(section)` function that returns only students belonging to the given section string.

---

### Requirement 4: Gradebook Service

**User Story:** As a developer, I want grade data managed through a service, so that `GradebookModule` does not hold student score state internally.

#### Acceptance Criteria

1. THE Gradebook_Service SHALL be implemented in `src/services/gradebookService.ts` and SHALL expose `getGrades(activityId)` and `saveGrade(activityId, studentId, score)` async functions.
2. WHEN `getGrades(activityId)` is called in mock mode, THE Gradebook_Service SHALL return the score map currently hardcoded as `INITIAL_STUDENTS` scores in `GradebookModule.tsx` for the given activity ID.
3. WHEN `saveGrade` is called, THE Gradebook_Service SHALL update the in-memory mock store and return the updated score record.
4. THE Gradebook_Service SHALL export a `GradeRecord` Domain_Type with fields `studentId`, `activityId`, and `score` (number or null).
5. FOR ALL grade records saved via `saveGrade`, THE Gradebook_Service SHALL return a record where `getGrades(activityId)` subsequently returns the saved score for that student (round-trip property: save then fetch returns the same value).

---

### Requirement 5: Analytics Service

**User Story:** As a developer, I want section analytics data served through a service, so that `AnalyticsModule` and `AnalyticsCharts` do not embed hardcoded section datasets.

#### Acceptance Criteria

1. THE Analytics_Service SHALL be implemented in `src/services/analyticsService.ts` and SHALL expose `getSectionAnalytics(sectionName)` and `getStudentAnalytics()` async functions.
2. WHEN `getSectionAnalytics(sectionName)` is called in mock mode, THE Analytics_Service SHALL return the section data object currently hardcoded in `SECTION_DATA` inside `AnalyticsModule.tsx` for the matching section key.
3. WHEN `getStudentAnalytics()` is called in mock mode, THE Analytics_Service SHALL return the `STUDENT_ANALYTICS` array currently hardcoded in `AnalyticsCharts.tsx`.
4. THE Analytics_Service SHALL export a `SectionAnalytics` Domain_Type and a `StudentAnalytics` Domain_Type that match the current data shapes used in those components.
5. IF `getSectionAnalytics` is called with a section name that does not exist in the mock data, THEN THE Analytics_Service SHALL return `null` to allow the caller to handle the missing section gracefully.

---

### Requirement 6: Homework / Classwork Entries Service

**User Story:** As a developer, I want daily homework and classwork entries managed through a service, so that `HomeworksModule` does not hold entry state internally.

#### Acceptance Criteria

1. THE Homework_Service SHALL be implemented in `src/services/homeworkService.ts` and SHALL expose `getEntries(section, dateRange?)`, `createEntry(entry)`, `updateEntryScores(entryId, scores)`, and `toggleParentVisibility(entryId)` async functions.
2. WHEN `getEntries` is called in mock mode, THE Homework_Service SHALL return the `initialEntries` array currently hardcoded in `HomeworksModule.tsx`, optionally filtered by section and date range.
3. WHEN `createEntry` is called, THE Homework_Service SHALL add the new entry to the in-memory mock store and return the created entry with its generated ID.
4. WHEN `updateEntryScores` is called, THE Homework_Service SHALL merge the provided score map into the existing entry and return the updated entry.
5. THE Homework_Service SHALL export a `DailyEntry` Domain_Type and a `Student` sub-type matching the current shapes in `HomeworksModule.tsx`.
6. FOR ALL entries created via `createEntry`, THE Homework_Service SHALL return an entry where `getEntries` subsequently includes that entry (round-trip property: create then fetch returns the created entry).

---

### Requirement 7: Messages Service

**User Story:** As a developer, I want message thread data and send actions abstracted behind a service, so that `MessagesModule` and `page.tsx` do not embed hardcoded thread data.

#### Acceptance Criteria

1. THE Messages_Service SHALL be implemented in `src/services/messagesService.ts` and SHALL expose `getThreads()`, `sendMessage(threadId, message)`, `markThreadRead(threadId)`, `markAllRead()`, and `updateParentInfo(threadId, changes)` async functions.
2. WHEN `getThreads()` is called in mock mode, THE Messages_Service SHALL return the `THREADS_DATA` array currently exported from `MessagesModule.tsx`.
3. WHEN `sendMessage` is called, THE Messages_Service SHALL append the new message to the thread's message list in the in-memory mock store and return the updated thread.
4. WHEN `markThreadRead` is called, THE Messages_Service SHALL set `unread` to `false` on the matching thread.
5. THE Messages_Service SHALL export `Thread`, `Message`, `Attachment`, and `StudentSnapshot` Domain_Types matching the current interfaces in `MessagesModule.tsx`.
6. FOR ALL messages sent via `sendMessage`, THE Messages_Service SHALL return a thread where `getThreads()` subsequently includes the sent message (round-trip property: send then fetch returns the message).

---

### Requirement 8: Schedule Service

**User Story:** As a developer, I want timetable and academic calendar data served through a service, so that `ScheduleModule` does not embed hardcoded schedule data.

#### Acceptance Criteria

1. THE Schedule_Service SHALL be implemented in `src/services/scheduleService.ts` and SHALL expose `getTimetable(grade, section)` and `getAcademicCalendar()` async functions.
2. WHEN `getTimetable(grade, section)` is called in mock mode, THE Schedule_Service SHALL return the filtered timetable slots from `MASTER_TIMETABLE` in `ScheduleModule.tsx` for the given grade and section.
3. WHEN `getAcademicCalendar()` is called in mock mode, THE Schedule_Service SHALL return the `YEARLY_CALENDAR_DATA` array currently hardcoded in `ScheduleModule.tsx`.
4. THE Schedule_Service SHALL export `ClassSlot` and `CalendarEvent` Domain_Types matching the current interfaces in `ScheduleModule.tsx`.

---

### Requirement 9: Notifications Service

**User Story:** As a developer, I want notification data and read-state mutations abstracted behind a service, so that `page.tsx` does not hold notification state internally.

#### Acceptance Criteria

1. THE Notifications_Service SHALL be implemented in `src/services/notificationsService.ts` and SHALL expose `getNotifications()` and `markAllNotificationsRead()` async functions.
2. WHEN `getNotifications()` is called in mock mode, THE Notifications_Service SHALL return the notifications array currently hardcoded in `page.tsx`.
3. WHEN `markAllNotificationsRead()` is called, THE Notifications_Service SHALL set `read` to `true` on all notifications in the in-memory mock store and return the updated list.
4. THE Notifications_Service SHALL export a `Notification` Domain_Type with fields `id`, `title`, `desc`, `time`, `urgent`, and `read`.

---

### Requirement 10: Teacher Profile Service

**User Story:** As a developer, I want the logged-in teacher's profile data served through a service, so that `page.tsx` does not hardcode teacher identity.

#### Acceptance Criteria

1. THE Profile_Service SHALL be implemented in `src/services/profileService.ts` and SHALL expose a `getTeacherProfile()` async function.
2. WHEN `getTeacherProfile()` is called in mock mode, THE Profile_Service SHALL return a profile object containing at minimum the fields `name`, `initials`, `role`, `grade`, and `section` matching the values currently hardcoded in `page.tsx` (Sara Kassa, SK, Primary Teacher).
3. THE Profile_Service SHALL export a `TeacherProfile` Domain_Type.

---

### Requirement 11: Component Decoupling

**User Story:** As a developer, I want all React components to consume data exclusively through service calls or the refactored hook, so that no component contains hardcoded data arrays or direct localStorage access.

#### Acceptance Criteria

1. THE Component SHALL NOT contain any hardcoded data arrays (e.g. `INITIAL_STUDENTS`, `THREADS_DATA`, `SECTION_DATA`, `initialEntries`, `MASTER_TIMETABLE_DATA`) after the refactor.
2. WHEN a Component needs to read data, THE Component SHALL call the appropriate Service_Module function or use the `useSharedActivities` hook.
3. WHEN a Component needs to mutate data, THE Component SHALL call the appropriate Service_Module mutation function.
4. THE Component SHALL receive data via React state initialised exclusively from service calls or the `useSharedActivities` hook (using `useEffect` + `useState` or an equivalent data-fetching pattern already present in the codebase). Hardcoded inline values SHALL NOT be used to initialise state.
5. THE Component SHALL preserve all existing loading states, error boundaries, and UI behaviour — no visual or functional change is permitted as part of this refactor.
6. WHERE a Component currently imports a type (e.g. `Activity` from `sharedStore`, `Thread` from `MessagesModule`), THE Component SHALL import that type from `src/services/index.ts` after the refactor.
7. WHERE a Component is a pure UI component that does not handle any data, THE Component SHALL be exempt from the service-call state requirement in criterion 4.

---

### Requirement 12: Preserve Cross-Component Reactivity

**User Story:** As a developer, I want the existing cross-component data sharing (e.g. activities created in `ActivitiesModule` appearing in `GradebookModule`) to continue working after the refactor.

#### Acceptance Criteria

1. WHILE the app is running in mock mode, THE Activities_Service SHALL dispatch the `edugov_activities_updated` browser event after every mutation, preserving the current event-based reactivity used by `useSharedActivities`.
2. THE `useSharedActivities` hook SHALL continue to be the single subscription point for activity state across `ActivitiesModule`, `GradebookModule`, and `AnalyticsModule`.
3. WHEN an activity is created in `ActivitiesModule`, THE GradebookModule SHALL reflect the new activity in its task selector strip without a page reload, as it does today.

---

### Requirement 13: No Breaking Changes to Existing Interfaces

**User Story:** As a developer, I want the public props and exported symbols of each component to remain unchanged, so that no call sites in `page.tsx` need to be updated as part of this refactor.

#### Acceptance Criteria

1. THE Component props interfaces (e.g. `GradebookModuleProps`, `HomeworksModuleProps`, `MessagesModuleProps`) SHALL remain identical after the refactor.
2. THE exported symbols from `MessagesModule.tsx` (`THREADS_DATA`, `Thread`) SHALL continue to be exported from that file OR re-exported from `src/services/index.ts`, so that `page.tsx` does not break. WHERE a symbol is moved entirely to the service layer, a re-export SHALL be provided at the original location. Symbols that are no longer needed MAY be removed provided all remaining symbols are accessible through at least one of the two locations.
3. THE `ScheduleModule` named exports (`OverviewScheduleWidget`, `SchedulePDFModal`) SHALL remain unchanged.
4. THE `AnalyticsCharts` named exports (`PerformanceDistribution`, `ParentEngagementChart`) SHALL remain unchanged.
