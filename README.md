# Ethio-Global Academy — Teacher Dashboard

A single-page application for teachers to manage classes, track student performance, take attendance, communicate with parents, and oversee academic activities at Ethio-Global Academy.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |
| Chat | WebSocket (real-time messaging) |
| PDF Export | jsPDF + html2canvas |
| HTTP | Native fetch with JWT auto-refresh wrapper |
| Testing | Jest 30 + ts-jest |
| Linting | `tsc --noEmit` |

## Features

| Module | Description |
|---|---|
| **Attendance** | Day/week/month views, bulk mark-all-present, CSV export, remarks. Only homeroom teachers can edit today's attendance. |
| **Students** | Roster with search/filter, student profiles showing attendance, grades, parent contact, assessment results, SMS trigger. |
| **Assessments / Tasks** | Create/edit/delete exams, quizzes, assignments, projects, labs. Bulk grading with score entry. |
| **Gradebook** | Spreadsheet-style score entry per activity, CSV export, color-coded grade pills (A/B/C/F). |
| **Homeworks** | Daily homework/classwork entries with per-student scores and parent visibility toggle. |
| **Parent Chat** | Real-time WebSocket messaging with file attachments, online/offline indicators, read receipts, date separators. |
| **Analytics** | Grade distribution charts, subject averages, attendance stats, parent engagement, chronic absentee tracking. |
| **Schedule** | Weekly timetable per grade/section, academic calendar with event types, PDF download. |
| **Notifications** | Fetch and mark-as-read for system notifications. |
| **Profile** | View/edit teacher info, qualifications, specialization. |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Environment

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
```

If `NEXT_PUBLIC_API_BASE_URL` is not set, all services fall back to built-in mock data with realistic Ethiopian student names and school data — no backend required.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint    # tsc --noEmit
```

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Main dashboard SPA (~3000 lines)
│   ├── login/page.tsx            # Teacher login
│   ├── profile/page.tsx          # Teacher profile
│   ├── complete-teacher-invitation/[uid]/[token]/page.tsx
│   ├── layout.tsx                # Root layout + fonts
│   ├── globals.css               # Tailwind styles
│   └── icon.svg                  # Favicon
├── components/                   # Dashboard tab modules
│   ├── ActivitiesModule.tsx
│   ├── AnalyticsCharts.tsx
│   ├── AnalyticsModule.tsx
│   ├── ErrorBanner.tsx
│   ├── GradebookModule.tsx
│   ├── HomeworksModule.tsx
│   ├── MessagesModule.tsx
│   ├── ScheduleModule.tsx
│   ├── StudentsModule.tsx
│   └── TasksModule.tsx
├── contexts/
│   └── HomeroomContext.tsx
└── services/
    ├── apiClient.ts              # HTTP client (JWT auth, auto-refresh)
    ├── apiCache.ts               # In-memory cache with TTL
    ├── authService.ts            # Login, invitation
    ├── authStore.ts              # Token storage
    ├── userProfileStore.ts
    ├── errorUtils.ts             # Centralized error formatting
    ├── activitiesService.ts
    ├── analyticsService.ts
    ├── assessmentResultsService.ts
    ├── assessmentsService.ts
    ├── attendanceService.ts
    ├── gradebookService.ts
    ├── homeworkService.ts
    ├── homeroomService.ts
    ├── messagesService.ts        # Chat threads, WebSocket, file upload
    ├── notificationsService.ts
    ├── parentLinksService.ts
    ├── profileService.ts
    ├── scheduleService.ts
    ├── schoolService.ts
    ├── studentsService.ts
    ├── teacherSectionsService.ts
    └── __tests__/                # Jest test suite
```

## Architecture

- **Dual-mode services**: Every service checks for `NEXT_PUBLIC_API_BASE_URL`. When set, it makes real API calls; otherwise returns hardcoded mock data — no backend needed for development.
- **JWT auth**: Access + refresh tokens stored in `localStorage`. The `apiClient` wrapper automatically refreshes on 401 and retries the original request.
- **Error handling**: Centralized `formatApiError()` maps HTTP status codes to user-facing messages with severity levels (`error`, `warning`, `info`). Rendered via the reusable `<ErrorBanner>` component.
- **Role-based access**: Homeroom status is checked at the App level and passed as props. Non-homeroom teachers see attendance/phone numbers as read-only.
- **Optimistic UI**: Sent messages appear instantly with a sending spinner → checkmark → seen indicator, all before the API responds.
- **Responsive design**: Sidebar collapses on mobile, touch targets are 44px+, custom button-based dropdowns replace native `<select>` to avoid iOS Safari clipping bugs.
