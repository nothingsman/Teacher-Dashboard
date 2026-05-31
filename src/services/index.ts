// src/services/index.ts
// Barrel file — single import location for all service types and functions.

// --- Domain Types ---
export type { Activity } from "./activitiesService";
export type {
  Student,
  StudentApi,
  StudentListResponse,
} from "./studentsService";
export type { GradeRecord } from "./gradebookService";
export type { SectionAnalytics, StudentAnalytics } from "./analyticsService";
export type { Assessment, AssessmentCreate } from "./assessmentsService";
export type {
  AssessmentResult,
  SubmissionStatus,
  BulkGradePayload,
  BulkGradeItem,
} from "./assessmentResultsService";
export type { DailyEntry } from "./homeworkService";
export type {
  Thread,
  ThreadMessage,
  ChatThread,
  ChatMessage,
  MediaFile,
} from "./messagesService";
export type { ClassSlot, CalendarEvent } from "./scheduleService";
export type { Notification } from "./notificationsService";
export type { TeacherProfile, TeacherProfileUpdate } from "./profileService";
export type { TeacherSection, TeacherSubject } from "./teacherSectionsService";
export type { UserProfile } from "./userProfileStore";

// --- ApiError ---
export { ApiError } from "./apiClient";

// --- Service functions ---
export * from "./activitiesService";
export * from "./studentsService";
export * from "./assessmentsService";
export * from "./attendanceService";
// gradebookService: explicit re-export to avoid _resetMockStore collision
export { getGrades, saveGrade } from "./gradebookService";
export * from "./analyticsService";
// homeworkService: explicit re-export to avoid _resetMockStore collision
export {
  getEntries,
  createEntry,
  updateEntryScores,
  toggleParentVisibility,
} from "./homeworkService";
export {
  listChatThreads,
  createChatThread,
  listThreadMessages,
  sendChatMessage,
  markThreadRead,
  uploadChatAttachment,
  getMediaFile,
  buildChatWebsocketUrl,
  formatThreadTimestamp,
} from "./messagesService";
export * from "./scheduleService";
export * from "./notificationsService";
export * from "./profileService";
export * from "./authService";
export * from "./teacherSectionsService";
export * from "./userProfileStore";
export * from "./attendanceService";
export * from "./assessmentResultsService";
export * from "./parentLinksService";
export * from "./homeroomService";
export * from "./schoolService";
