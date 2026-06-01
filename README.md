<div align="center">
  <img src="./public/logo.svg" alt="Ethio-Global Academy Teacher Portal" width="180" height="180">
  <br><br>
  <h1>Teacher Dashboard</h1>
  <p><em>Ethio-Global Academy — Academic Management Platform</em></p>
  <br>
  <p>
    <strong>Course:</strong> Software Engineering Final Year Project<br>
    <strong>Institution:</strong> Addis Ababa Science and Technology University
  </p>
  <br>
  <p>
    <strong>Collaborators:</strong><br>
    <a href="https://github.com/fitiha">fitiha</a> ·
    <a href="https://github.com/NahomTesM">NahomTesM</a> ·
    <a href="https://github.com/oddegen">oddegen</a> ·
    <a href="https://github.com/RobelD420">RobelD420</a> ·
    <a href="https://github.com/Tonetor777">Tonetor777</a>
  </p>
</div>

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Development](#development)
8. [Testing](#testing)
9. [API Integration](#api-integration)
10. [Collaborators](#collaborators)

---

## Project Overview

The Teacher Dashboard is a single-page web application developed for Ethio-Global Academy that equips educators with a unified platform to manage classroom activities, track student performance, record attendance, communicate with parents, and generate academic analytics. The system is designed to reduce administrative overhead and improve teacher-parent engagement through real-time communication channels.

### Purpose

To provide a centralized academic portal where teachers can efficiently manage their daily responsibilities — from taking attendance and grading assessments to communicating with parents and viewing performance analytics — all within a responsive, role-aware interface.

---

## Features

| Module | Description |
|---|---|
| **Dashboard Overview** | Summary cards showing total students, attendance rate, pending tasks, and unread messages. Quick-access navigation to all modules. |
| **Attendance Management** | Day, week, and month views with bulk mark-all-present, CSV export, and per-student remarks. Homeroom teachers can edit today's attendance; other teachers view data as read-only. |
| **Student Roster** | Searchable, filterable student list with individual profiles displaying attendance summaries, grade records, parent contact details, and assessment results. Supports SMS dispatch to parents. |
| **Assessments & Tasks** | Create, edit, and delete assessments (Exam, Quiz, Assignment, Project, Lab). Filter by type and status (Draft, Published, Closed). Bulk grading with inline score entry. |
| **Gradebook** | Spreadsheet-style grade entry per activity or assessment. Inline editing of scores with color-coded grade pills (A/B/C/F) and CSV export. |
| **Homework Tracker** | Daily homework and classwork entries with date selection, per-student scoring, and parent visibility toggles. |
| **Parent-Teacher Chat** | Real-time messaging via WebSocket with file attachment uploads, online/offline indicators, read receipts (sent/seen), date separators, and optimistic UI with loading states. |
| **Analytics** | Section-level performance breakdown: grade distribution, subject averages, attendance rates, parent engagement metrics, chronic absentee tracking, and activity performance analysis. |
| **Schedule Viewer** | Weekly timetable per grade and section. Academic calendar with event categories (Academic, Break, Exam, Community). PDF download via jsPDF and html2canvas. |
| **Notifications** | System notification feed with unread badge count and mark-all-as-read functionality. |
| **Teacher Profile** | View and edit personal information, qualifications, specialization, and teaching assignments. |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Programming Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |
| Real-Time Communication | WebSocket API |
| PDF Generation | jsPDF, html2canvas |
| HTTP Client | Native Fetch with JWT auto-refresh interceptor |
| Unit Testing | Jest 30 with ts-jest |
| E2E Testing | Playwright |
| Code Quality | TypeScript compiler (`tsc --noEmit`) |
| Package Manager | npm |

---

## System Architecture

### Component Architecture

The application follows a single-page architecture where the root page (`/`) orchestrates all dashboard modules. Navigation between modules is handled via client-side tab state rather than route changes, providing a seamless user experience.

```
App (page.tsx)
├── Sidebar (grade/section/subject selectors, navigation tabs)
├── Overview (summary cards, quick stats)
├── AttendanceModule (day/week/month views)
├── StudentsModule (roster, profiles, SMS)
├── TasksModule (assessment CRUD)
├── GradebookModule (score entry, CSV export)
├── AnalyticsModule (charts, performance metrics)
├── HomeworksModule (daily entries, scoring)
├── MessagesModule (WebSocket chat)
├── ScheduleModule (timetable, calendar)
└── NotificationsModule (feed, badges)
```

### Data Flow

1. **Authentication**: JWT-based access and refresh tokens stored in `localStorage`. The `apiClient` service attaches tokens to every request and automatically refreshes on 401 responses.
2. **Service Layer**: Each domain has a dedicated service module that abstracts API calls. Services operate in dual mode — when `NEXT_PUBLIC_API_BASE_URL` is configured, they call real endpoints; otherwise, they return built-in mock data for offline development.
3. **State Management**: Component-local state with React hooks. Homeroom status is resolved at the App level via API call and propagated as props. Message threads and WebSocket state are managed within the MessagesModule.
4. **Error Handling**: All API errors pass through `formatApiError()`, which maps HTTP status codes to user-friendly messages with severity levels (`error`, `warning`, `info`). Errors are displayed using the reusable `<ErrorBanner>` component.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Dual-mode mock/real services | Enables development and demonstration without a live backend |
| Homeroom status at App level | Avoids stale context values from provider ordering issues |
| Custom dropdowns over native `<select>` | iOS Safari clips native pickers inside `position: fixed` containers |
| Optimistic message send | Messages appear instantly with sending/sent/seen status indicators |
| Single-page tab navigation | Faster transitions than route-based navigation for dashboard workflows |
| In-memory API cache | 30-second TTL reduces redundant network calls |

---

## Project Structure

```
src/
├── app/                                    # Next.js App Router
│   ├── page.tsx                            # Main dashboard SPA
│   ├── login/page.tsx                      # Authentication page
│   ├── profile/page.tsx                    # Teacher profile page
│   ├── complete-teacher-invitation/
│   │   └── [uid]/[token]/page.tsx          # Invitation acceptance
│   ├── layout.tsx                          # Root layout with font loading
│   ├── globals.css                         # Tailwind CSS global styles
│   └── icon.svg                            # SVG favicon (graduation cap)
│
├── components/                             # Dashboard tab modules
│   ├── ActivitiesModule.tsx                # Activity CRUD
│   ├── AnalyticsCharts.tsx                 # Chart visualizations
│   ├── AnalyticsModule.tsx                 # Performance analytics
│   ├── ErrorBanner.tsx                     # Reusable error display
│   ├── GradebookModule.tsx                 # Grade entry spreadsheet
│   ├── HomeworksModule.tsx                 # Homework/classwork tracker
│   ├── MessagesModule.tsx                  # Real-time parent chat
│   ├── ScheduleModule.tsx                  # Timetable and calendar
│   ├── StudentsModule.tsx                  # Student roster and profiles
│   └── TasksModule.tsx                     # Assessment management
│
├── contexts/
│   └── HomeroomContext.tsx                 # Homeroom status context
│
├── services/                               # API service layer
│   ├── index.ts                            # Barrel exports
│   ├── apiClient.ts                        # HTTP client with JWT auth
│   ├── apiCache.ts                         # In-memory cache
│   ├── authService.ts                      # Authentication API
│   ├── authStore.ts                        # Token persistence
│   ├── userProfileStore.ts                 # User profile cache
│   ├── errorUtils.ts                       # Error formatting utility
│   ├── activitiesService.ts                # Activities API
│   ├── analyticsService.ts                 # Analytics API
│   ├── assessmentResultsService.ts         # Assessment results API
│   ├── assessmentsService.ts               # Assessments CRUD API
│   ├── attendanceService.ts                # Attendance API
│   ├── gradebookService.ts                 # Gradebook API
│   ├── homeworkService.ts                  # Homework API
│   ├── homeroomService.ts                  # Homeroom check API
│   ├── messagesService.ts                  # Chat, WebSocket, file upload
│   ├── notificationsService.ts             # Notifications API
│   ├── parentLinksService.ts               # Parent data API
│   ├── profileService.ts                   # Teacher profile API
│   ├── scheduleService.ts                  # Timetable and calendar API
│   ├── schoolService.ts                    # School name API
│   ├── studentsService.ts                  # Students API
│   ├── teacherSectionsService.ts           # Section assignments API
│   └── __tests__/                          # Jest test suite
│       ├── activitiesService.test.ts
│       ├── analyticsService.test.ts
│       ├── apiClient.test.ts
│       ├── gradebookService.test.ts
│       ├── homeworkService.test.ts
│       ├── messagesService.test.ts
│       ├── notificationsService.test.ts
│       ├── scheduleService.test.ts
│       └── studentsService.test.ts
│
└── sharedStore.ts                          # Cross-component event sync
```

---

## Getting Started

### Prerequisites

- **Node.js** version 18 or later
- **npm** (included with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/fitiha/teacher-dashboard.git
cd teacher-dashboard

# Install dependencies
npm install
```

### Environment Configuration

Copy the example environment file and configure as needed:

```bash
cp .env.example .env.local
```

Set the API base URL to connect to a live backend:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com
```

If `NEXT_PUBLIC_API_BASE_URL` is not set, all services automatically fall back to built-in mock data — no backend server is required for development or evaluation.

---

## Development

### Running the Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000). The application supports hot module replacement for rapid development.

### Building for Production

```bash
npm run build
```

Produces an optimized production build in the `.next` directory.

### Linting

```bash
npm run lint
```

Runs the TypeScript compiler in type-checking mode (`tsc --noEmit`) to verify type safety across the codebase.

---

## Testing

The project includes both unit tests and end-to-end (E2E) browser tests.

### Unit Tests

Jest-based unit tests cover the service layer — API client behavior, mock data fallbacks, and data transformation logic.

```bash
# Run all unit tests
npm test

# Run with coverage report
npx jest --coverage
```

Test files are co-located with their corresponding service modules under `src/services/__tests__/`.

### End-to-End Tests

Playwright-based E2E tests validate critical user flows in a headless browser. Tests are located in the `e2e/` directory and cover scenarios such as login page rendering, form validation, and unauthenticated redirects.

```bash
# Run all E2E tests (starts dev server automatically)
npm run test:e2e

# Open Playwright UI mode for interactive debugging
npm run test:e2e:ui
```

The Playwright configuration (`playwright.config.ts`) uses the development server (`npm run dev`) as its web server and targets `http://localhost:3000`.

---

## API Integration

All service modules follow a consistent dual-mode pattern:

- **Real mode**: When `NEXT_PUBLIC_API_BASE_URL` is defined, services make authenticated HTTP requests to the configured API endpoints.
- **Mock mode**: When the environment variable is absent, services return realistic mock data with Ethiopian student names and school information, enabling offline development and presentation.

### Authentication Flow

1. Teacher logs in via `/login` with email and password.
2. Backend returns JWT access and refresh tokens.
3. `apiClient.ts` attaches the access token to all subsequent requests.
4. On 401 responses, the client automatically attempts a token refresh and retries the original request.
5. On refresh failure, the user is redirected to the login page.

### WebSocket Communication

The messaging module establishes a WebSocket connection per active chat thread. The connection lifecycle includes automatic reconnection with exponential backoff (1s → 2s → 4s → 8s → 10s cap). Messages broadcast by the server are merged into the local state with deduplication to prevent duplicate rendering.

---

## Collaborators

This project was developed as a Software Engineering final year project by the following team members:

| GitHub Profile | Role |
|---|---|
| [fitiha](https://github.com/fitiha) | Team Lead & Full-Stack Developer |
| [NahomTesM](https://github.com/NahomTesM) | Frontend Developer |
| [oddegen](https://github.com/oddegen) | Backend Integration & API Design |
| [RobelD420](https://github.com/RobelD420) | UI/UX Design & Testing |
| [Tonetor777](https://github.com/Tonetor777) | Documentation & Quality Assurance |

---

<div align="center">
  <p>
    <strong>Addis Ababa Science and Technology University</strong><br>
    Faculty of Electrical and Computer Engineering<br>
    Department of Software Engineering
  </p>
  <p>
    <em>© 2025 Ethio-Global Academy Teacher Dashboard. All rights reserved.</em>
  </p>
</div>
