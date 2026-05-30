// src/services/messagesService.ts

import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

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
  recentHomework: { title: string; score: number | null; max: number }[];
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

// --- Mock data ---

export const THREADS_DATA: Thread[] = [
  {
    id: 'THR-001',
    parentName: 'Alemayehu Tadesse',
    parentInitials: 'AT',
    parentPhone: '+251 91 234 5678',
    parentEmail: 'alem.tadesse@mail.com',
    parentAddress: 'Bole Sub-city, Addis Ababa',
    relation: 'Father',
    studentName: 'Liya Tadesse',
    studentId: 'STU-00421',
    studentGrade: 'Grade 8A',
    avatarColor: 'blue',
    unread: false,
    lastTime: '9:42 AM',
    preview: 'Thanks for letting me know about her progress...',
    studentSnapshot: {
      overallAvg: 91,
      attendance: 97,
      parentEngagement: 85,
      recentHomework: [
        { title: 'Linear Equations', score: 9, max: 10 },
        { title: "Newton's Laws", score: 8, max: 10 },
        { title: 'WWI Discussion', score: 9, max: 10 },
        { title: 'Problem Solving', score: 10, max: 10 },
      ],
    },
    messages: [
      {
        id: 'M1',
        sender: 'teacher',
        text: 'Good morning Mr. Alemayehu. I wanted to share Liya\'s latest progress report with you. She has been doing exceptionally well this term.',
        time: '9:28 AM',
        readAt: '9:31 AM',
        attachment: { type: 'report', title: 'Progress report — Term 2', subtitle: 'Liya Tadesse · Grade 8A', value: '91%' },
      },
      {
        id: 'M2',
        sender: 'parent',
        text: 'Wonderful! We are so proud of her. Is there anything she should focus on more?',
        time: '9:38 AM',
      },
      {
        id: 'M3',
        sender: 'teacher',
        text: 'She could improve a bit in Physics. Here is her latest homework score for reference.',
        time: '9:40 AM',
        readAt: '9:41 AM',
        attachment: { type: 'homework', title: "Newton's Laws Questions", subtitle: 'Homework · Physics · Jun 1', value: '8 / 10' },
      },
      {
        id: 'M4',
        sender: 'parent',
        text: 'Thanks for letting me know about her progress. We will make sure she reviews her Physics notes at home.',
        time: '9:42 AM',
      },
    ],
  },
  {
    id: 'THR-002',
    parentName: 'Worku Haile',
    parentInitials: 'WH',
    parentPhone: '+251 92 345 6789',
    parentEmail: 'worku.haile@mail.com',
    parentAddress: 'Kazanchis, Addis Ababa',
    relation: 'Father',
    studentName: 'Biruk Haile',
    studentId: 'STU-00398',
    studentGrade: 'Grade 7B',
    avatarColor: 'teal',
    unread: true,
    lastTime: 'Yesterday',
    preview: 'When is the next parent-teacher meeting?',
    studentSnapshot: {
      overallAvg: 73,
      attendance: 88,
      parentEngagement: 40,
      recentHomework: [
        { title: 'Algebra Practice', score: 7, max: 10 },
        { title: "Newton's Laws", score: 6, max: 10 },
        { title: 'WWI Essay', score: 8, max: 10 },
        { title: 'Problem Solving', score: 7, max: 10 },
      ],
    },
    messages: [
      {
        id: 'M1',
        sender: 'teacher',
        text: 'Hello Mr. Worku. I wanted to check in about Biruk\'s recent attendance. He has missed 3 classes this week.',
        time: 'Yesterday, 2:10 PM',
        readAt: 'Yesterday, 3:45 PM',
      },
      {
        id: 'M2',
        sender: 'parent',
        text: 'I apologize, he has been unwell. He will return tomorrow. When is the next parent-teacher meeting?',
        time: 'Yesterday, 4:22 PM',
      },
    ],
  },
  {
    id: 'THR-003',
    parentName: 'Girma Girma',
    parentInitials: 'GG',
    parentPhone: '+251 93 456 7890',
    parentEmail: 'girma.g@mail.com',
    parentAddress: 'Old Airport, Addis Ababa',
    relation: 'Father',
    studentName: 'Selam Girma',
    studentId: 'STU-00412',
    studentGrade: 'Grade 9A',
    avatarColor: 'purple',
    unread: true,
    lastTime: 'Mon',
    preview: 'Selam has been struggling with Physics...',
    studentSnapshot: {
      overallAvg: 55,
      attendance: 79,
      parentEngagement: 20,
      recentHomework: [
        { title: 'Algebra Practice', score: 5, max: 10 },
        { title: "Newton's Laws", score: 4, max: 10 },
        { title: 'Cell Division', score: 6, max: 10 },
        { title: 'Problem Solving', score: 5, max: 10 },
      ],
    },
    messages: [
      {
        id: 'M1',
        sender: 'parent',
        text: 'Good day teacher. Selam has been struggling with Physics lately. Can we discuss this?',
        time: 'Mon, 10:15 AM',
      },
    ],
  },
  {
    id: 'THR-004',
    parentName: 'Meseret Bekele',
    parentInitials: 'MB',
    parentPhone: '+251 94 567 8901',
    parentEmail: 'meseret.b@mail.com',
    parentAddress: 'Gerji, Addis Ababa',
    relation: 'Mother',
    studentName: 'Dawit Bekele',
    studentId: 'STU-00355',
    studentGrade: 'Grade 6C',
    avatarColor: 'amber',
    unread: false,
    lastTime: 'Sun',
    preview: 'I will talk to him about his attendance',
    studentSnapshot: {
      overallAvg: 36,
      attendance: 65,
      parentEngagement: 10,
      recentHomework: [
        { title: 'Algebra Practice', score: 3, max: 10 },
        { title: "Newton's Laws", score: 4, max: 10 },
        { title: 'WWI Discussion', score: null, max: 10 },
        { title: 'Problem Solving', score: 3, max: 10 },
      ],
    },
    messages: [
      {
        id: 'M1',
        sender: 'teacher',
        text: 'Dear Mrs. Meseret, I am reaching out regarding Dawit\'s attendance this month. He has been absent 8 times and it is affecting his grades.',
        time: 'Sun, 11:00 AM',
        readAt: 'Sun, 6:30 PM',
      },
      {
        id: 'M2',
        sender: 'parent',
        text: 'I will talk to him about his attendance. Thank you for informing me.',
        time: 'Sun, 6:45 PM',
      },
    ],
  },
  {
    id: 'THR-005',
    parentName: 'Tigist Mekonnen',
    parentInitials: 'TM',
    parentPhone: '+251 95 678 9012',
    parentEmail: 'tigist.m@mail.com',
    parentAddress: 'CMC, Addis Ababa',
    relation: 'Mother',
    studentName: 'Hana Mekonnen',
    studentId: 'STU-00467',
    studentGrade: 'Grade 8B',
    avatarColor: 'green',
    unread: false,
    lastTime: 'Fri',
    preview: 'Thank you! She is very happy at school.',
    studentSnapshot: {
      overallAvg: 81,
      attendance: 93,
      parentEngagement: 70,
      recentHomework: [
        { title: 'Linear Equations', score: 8, max: 10 },
        { title: "Newton's Laws", score: 7, max: 10 },
        { title: 'WWI Discussion', score: 8, max: 10 },
        { title: 'Problem Solving', score: 9, max: 10 },
      ],
    },
    messages: [
      {
        id: 'M1',
        sender: 'teacher',
        text: 'Hello Mrs. Tigist! Just wanted to share that Hana had an excellent week. Her classwork scores have been outstanding.',
        time: 'Fri, 3:00 PM',
        readAt: 'Fri, 5:12 PM',
      },
      {
        id: 'M2',
        sender: 'parent',
        text: 'Thank you! She is very happy at school. We appreciate your dedication.',
        time: 'Fri, 5:30 PM',
      },
    ],
  },
];

// --- In-memory store (mock mode only) ---

let mockStore: Thread[] = [...THREADS_DATA];

/**
 * Resets the in-memory mock store to the original THREADS_DATA.
 * Exported for use in tests only.
 */
export function _resetMockStore(): void {
  mockStore = THREADS_DATA.map((t) => ({
    ...t,
    messages: [...t.messages],
  }));
}

// --- Service functions ---

/**
 * Returns a shallow copy of all threads.
 */
export async function getThreads(): Promise<Thread[]> {
  if (IS_MOCK) return [...mockStore];
  return request<Thread[]>('GET', '/api/threads');
  return request<Thread>('POST', `/api/threads/${threadId}/messages`, message);
  return request<void>('PATCH', `/api/threads/${threadId}/read`);
  return request<void>('POST', '/api/threads/mark-all-read');
  return request<Thread>('PATCH', `/api/threads/${threadId}`, changes);
}
