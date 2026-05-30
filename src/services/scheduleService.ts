// src/services/scheduleService.ts

import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

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

export type DaysOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

// --- Master Class Periods Timeline ---

const PERIODS = [
  { id: 1, time: '08:30 AM - 09:15 AM', name: '1st Period' },
  { id: 2, time: '09:15 AM - 10:00 AM', name: '2nd Period' },
  { id: 3, time: '10:00 AM - 10:45 AM', name: '3rd Period' },
  { id: 4, time: '10:45 AM - 11:30 AM', name: '4th Period' },
  { id: 5, time: '11:45 AM - 12:30 PM', name: '5th Period' },
  { id: 6, time: '12:30 PM - 01:15 PM', name: '6th Period' },
  { id: 7, time: '02:00 PM - 02:45 PM', name: '7th Period' },
  { id: 8, time: '02:45 PM - 03:30 PM', name: '8th Period' },
];

const MASTER_TIMETABLE_DATA: Record<DaysOfWeek, ClassSlot[]> = {
  Monday: [
    { period: 1, time: '08:30 AM - 09:15 AM', subject: 'Mathematics', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 2, time: '09:15 AM - 10:00 AM', subject: 'Physics', teacher: 'Abebe Bikila', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 3, time: '10:00 AM - 10:45 AM', subject: 'Chemistry', teacher: 'Tadesse Kenenisa', room: 'Lab-1', grade: 'Grade 7', section: 'Sec A' },
    { period: 4, time: '10:45 AM - 11:30 AM', subject: 'English', teacher: 'Liya Girma', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 5, time: '11:45 AM - 12:30 PM', subject: 'Biology', teacher: 'Mekonnen Haile', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 6, time: '12:30 PM - 01:15 PM', subject: 'Civics', teacher: 'Hana Alula', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 7, time: '02:00 PM - 02:45 PM', subject: 'Social Studies', teacher: 'Yonas Tesfaye', room: 'R-101', grade: 'Grade 7', section: 'Sec A' },
    { period: 8, time: '02:45 PM - 03:30 PM', subject: 'Physical Ed', teacher: 'Biruk Haile', room: 'Field', grade: 'Grade 7', section: 'Sec A' },

    { period: 1, time: '08:30 AM - 09:15 AM', subject: 'Physics', teacher: 'Abebe Bikila', room: 'R-104', grade: 'Grade 8', section: 'Sec A' },
    { period: 2, time: '09:15 AM - 10:00 AM', subject: 'Mathematics', teacher: 'Sara Kassa', room: 'R-104', grade: 'Grade 8', section: 'Sec A' },
    { period: 3, time: '10:00 AM - 10:45 AM', subject: 'English', teacher: 'Liya Girma', room: 'R-104', grade: 'Grade 8', section: 'Sec A' },
    { period: 4, time: '10:45 AM - 11:30 AM', subject: 'Biology', teacher: 'Mekonnen Haile', room: 'Lab-2', grade: 'Grade 8', section: 'Sec A' },
  ],
  Tuesday: [
    { period: 1, time: '08:30 AM - 09:15 AM', subject: 'English', teacher: 'Liya Girma', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 2, time: '09:15 AM - 10:00 AM', subject: 'Mathematics', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 3, time: '10:00 AM - 10:45 AM', subject: 'Physics', teacher: 'Abebe Bikila', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 4, time: '10:45 AM - 11:30 AM', subject: 'ICT', teacher: 'Dawit Mekonnen', room: 'Comp Lab', grade: 'Grade 7', section: 'Sec A' },
    { period: 5, time: '11:45 AM - 12:30 PM', subject: 'History', teacher: 'Yonas Tesfaye', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 6, time: '12:30 PM - 01:15 PM', subject: 'Chemistry', teacher: 'Tadesse Kenenisa', room: 'Lab-1', grade: 'Grade 7', section: 'Sec A' },
    { period: 7, time: '02:00 PM - 02:45 PM', subject: 'Arts', teacher: 'Marta Hailu', room: 'Art Room', grade: 'Grade 7', section: 'Sec A' },
    { period: 8, time: '02:45 PM - 03:30 PM', subject: 'Study Period', teacher: 'Sara Kassa', room: 'Library', grade: 'Grade 7', section: 'Sec A' },
  ],
  Wednesday: [
    { period: 1, time: '08:30 AM - 09:15 AM', subject: 'Mathematics', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 2, time: '09:15 AM - 10:00 AM', subject: 'Biology', teacher: 'Mekonnen Haile', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 3, time: '10:00 AM - 10:45 AM', subject: 'Civics', teacher: 'Hana Alula', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 4, time: '10:45 AM - 11:30 AM', subject: 'English', teacher: 'Liya Girma', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 5, time: '11:45 AM - 12:30 PM', subject: 'Physics', teacher: 'Abebe Bikila', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 6, time: '12:30 PM - 01:15 PM', subject: 'Social Studies', teacher: 'Yonas Tesfaye', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 7, time: '02:00 PM - 02:45 PM', subject: 'Chemistry', teacher: 'Tadesse Kenenisa', room: 'Lab-1', grade: 'Grade 7', section: 'Sec A' },
    { period: 8, time: '02:45 PM - 03:30 PM', subject: 'Guidance', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
  ],
  Thursday: [
    { period: 1, time: '08:30 AM - 09:15 AM', subject: 'English', teacher: 'Liya Girma', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 2, time: '09:15 AM - 10:00 AM', subject: 'Physics', teacher: 'Abebe Bikila', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 3, time: '10:00 AM - 10:45 AM', subject: 'Mathematics', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 4, time: '10:45 AM - 11:30 AM', subject: 'History', teacher: 'Yonas Tesfaye', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 5, time: '11:45 AM - 12:30 PM', subject: 'Chemistry', teacher: 'Tadesse Kenenisa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 6, time: '12:30 PM - 01:15 PM', subject: 'Biology', teacher: 'Mekonnen Haile', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 7, time: '02:00 PM - 02:45 PM', subject: 'ICT', teacher: 'Dawit Mekonnen', room: 'Comp Lab', grade: 'Grade 7', section: 'Sec A' },
    { period: 8, time: '02:45 PM - 03:30 PM', subject: 'Club Activity', teacher: 'Staff', room: 'Campus', grade: 'Grade 7', section: 'Sec A' },
  ],
  Friday: [
    { period: 1, time: '08:30 AM - 09:15 AM', subject: 'Chemistry', teacher: 'Tadesse Kenenisa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 2, time: '09:15 AM - 10:00 AM', subject: 'English', teacher: 'Liya Girma', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 3, time: '10:00 AM - 10:45 AM', subject: 'Biology', teacher: 'Mekonnen Haile', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 4, time: '10:45 AM - 11:30 AM', subject: 'Mathematics', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 5, time: '11:45 AM - 12:30 PM', subject: 'Civics', teacher: 'Hana Alula', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 6, time: '12:30 PM - 01:15 PM', subject: 'Geography', teacher: 'Yonas Tesfaye', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
    { period: 7, time: '02:00 PM - 02:45 PM', subject: 'Physical Ed', teacher: 'Biruk Haile', room: 'Field', grade: 'Grade 7', section: 'Sec A' },
    { period: 8, time: '02:45 PM - 03:30 PM', subject: 'Review Session', teacher: 'Sara Kassa', room: 'R-102', grade: 'Grade 7', section: 'Sec A' },
  ],
};

// --- Yearly Academic Calendar Events ---

export const YEARLY_CALENDAR_DATA: CalendarEvent[] = [
  { date: 'Sep 07, 2026', title: 'Academic Year Launch', holiday: false, type: 'academic', description: 'Official startup of standard instruction & class inductions for grades 6-10.' },
  { date: 'Oct 12, 2026', title: 'First Quarter Assessment Window', holiday: false, type: 'exam', description: 'Internal diagnostic exams and parent progress feedback loops.' },
  { date: 'Nov 09 - 13, 2026', title: 'Midterm Evaluation Week', holiday: false, type: 'exam', description: 'Comprehensive assessments on primary subject cores.' },
  { date: 'Nov 21, 2026', title: 'Parent-Teacher conference', holiday: false, type: 'community', description: 'Direct academic briefings and intermediate report card handovers.' },
  { date: 'Jan 01 - 08, 2027', title: 'Christmas Holiday Recess', holiday: true, type: 'break', description: 'School closed globally. Winter vacation period.' },
  { date: 'Jan 25 - 29, 2027', title: 'Semester I Final exams', holiday: false, type: 'exam', description: 'Complete cumulative examinations across high school bands.' },
  { date: 'Feb 08, 2027', title: 'Semester II Commencement', holiday: false, type: 'academic', description: 'Spring timetable activation, roster updates & gradebook auditing.' },
  { date: 'Mar 15, 2027', title: 'Science, Tech & Invention Fair', holiday: false, type: 'community', description: 'Laboratory research demonstrations and competitive presentations.' },
  { date: 'Apr 16, 2027', title: 'Ethiopian Culture & Heritage Fest', holiday: false, type: 'community', description: 'Annual exhibition of language roots, traditional arts, garments and foods.' },
  { date: 'May 03 - 07, 2027', title: 'Semester II Midterm assessments', holiday: false, type: 'exam', description: 'Interim tests checking alignment with curricular timelines.' },
  { date: 'Jun 14 - 18, 2027', title: 'Ministry & National Exam Window', holiday: false, type: 'exam', description: 'Grade 8 regional and Grade 10 national standardization trials.' },
  { date: 'Jul 03, 2027', title: 'Closing & Promotion Ceremony', holiday: true, type: 'academic', description: 'Annual general assembly, student awards & promotion reports.' },
];

const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
const SECTIONS = ['Sec A', 'Sec B', 'Sec C'];
const DAYS: DaysOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Generate robust schedule data across grade bands
const getFullTimetable = (): Record<DaysOfWeek, ClassSlot[]> => {
  const result: Record<DaysOfWeek, ClassSlot[]> = JSON.parse(JSON.stringify(MASTER_TIMETABLE_DATA));

  DAYS.forEach(day => {
    GRADES.forEach(grade => {
      SECTIONS.forEach(sec => {
        if (grade === 'Grade 7' && sec === 'Sec A') return; // Keep original handcrafted Monday-Friday

        const subjects = [
          { name: 'Mathematics', teacher: 'Sara Kassa', room: 'R-102' },
          { name: 'Physics', teacher: 'Abebe Bikila', room: 'R-103' },
          { name: 'Chemistry', teacher: 'Tadesse Kenenisa', room: 'Lab-1' },
          { name: 'English', teacher: 'Liya Girma', room: 'R-104' },
          { name: 'Biology', teacher: 'Mekonnen Haile', room: 'Lab-2' },
          { name: 'History', teacher: 'Yonas Tesfaye', room: 'R-101' },
          { name: 'Geography', teacher: 'Yonas Tesfaye', room: 'R-105' },
          { name: 'Civics', teacher: 'Hana Alula', room: 'R-106' },
        ];

        PERIODS.forEach((p, idx) => {
          const subjectIndex = (idx + grade.charCodeAt(6) + sec.charCodeAt(4)) % subjects.length;
          const sub = subjects[subjectIndex];
          result[day].push({
            period: p.id,
            time: p.time,
            subject: sub.name,
            teacher: sub.teacher,
            room: sub.room,
            grade: grade,
            section: sec,
          });
        });
      });
    });
  });

  return result;
};

// Expanded timetable covering all grades and sections
const MASTER_TIMETABLE: Record<DaysOfWeek, ClassSlot[]> = getFullTimetable();

// --- Service functions ---

/**
 * Returns all ClassSlot entries for the given grade and section, across all days.
 */
export async function getTimetable(grade: string, section: string): Promise<ClassSlot[]> {
  if (IS_MOCK) {
    const slots: ClassSlot[] = [];
    for (const day of DAYS) {
      for (const slot of MASTER_TIMETABLE[day]) {
        if (slot.grade === grade && slot.section === section) {
          slots.push(slot);
        }
      }
    }
    return slots;
  }
  return request<ClassSlot[]>('GET', `/api/schedule/timetable?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
}

/**
 * Returns a shallow copy of all yearly academic calendar events.
 */
export async function getAcademicCalendar(): Promise<CalendarEvent[]> {
  if (IS_MOCK) return [...YEARLY_CALENDAR_DATA];
  return request<CalendarEvent[]>('GET', '/api/schedule/calendar');
}
