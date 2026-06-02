// src/services/notificationsService.ts

import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

export interface Notification {
  id: number;
  title: string;
  desc: string;
  time: string;
  urgent: boolean;
  read: boolean;
}

// --- Mock data (copied from page.tsx) ---

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, title: 'Absence Alert', desc: 'Bethlehem Mekonnen was marked absent for 3 consecutive days.', time: '2h ago', urgent: true, read: false },
  { id: 2, title: 'Report Ready', desc: 'Monthly attendance report for Grade 7A is ready for download.', time: '5h ago', urgent: false, read: false },
  { id: 3, title: 'Parent Message', desc: "New message from Abel's parents regarding upcoming leave.", time: '1d ago', urgent: false, read: false },
  { id: 4, title: 'System Update', desc: 'Gradebook module has been updated with new assessment types.', time: '2d ago', urgent: false, read: false },
  { id: 5, title: 'Staff Meeting', desc: 'Mandatory staff meeting rescheduled for Friday at 4 PM.', time: '3d ago', urgent: true, read: false },
];

// --- In-memory store (mock mode only) ---

let mockStore: Notification[] = [...INITIAL_NOTIFICATIONS];

/**
 * Test helper: replace the mock store with a custom array.
 * Only intended for use in tests.
 */
export function _setMockStore(notifications: Notification[]): void {
  mockStore = [...notifications];
}

// --- Service functions ---

/**
 * Returns a shallow copy of all notifications.
 */
export async function getNotifications(): Promise<Notification[]> {
  if (IS_MOCK) return [...mockStore];
  try {
    return await request<Notification[]>('GET', '/api/notifications');
  } catch {
    return [...mockStore];
  }
}

/**
 * Sets read: true on all notifications.
 * Returns the updated list.
 */
export async function markAllNotificationsRead(): Promise<Notification[]> {
  if (IS_MOCK) {
    mockStore = mockStore.map((n) => ({ ...n, read: true }));
    return [...mockStore];
  }
  try {
    return await request<Notification[]>('POST', '/api/notifications/mark-all-read');
  } catch {
    mockStore = mockStore.map((n) => ({ ...n, read: true }));
    return [...mockStore];
  }
}
