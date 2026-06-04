process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';

jest.mock('../apiClient', () => ({
  request: jest.fn(),
}));

import { request } from '../apiClient';
import {
  getNotificationCounter,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../notificationsService';

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('notificationsService backend contract', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('maps backend notification DTOs into UI notifications', async () => {
    mockedRequest.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'ntf-1',
          title: 'Announcement',
          message: 'School opens late tomorrow.',
          data: { is_urgent: true },
          read_at: null,
          created_at: '2026-06-01T10:00:00Z',
          notifiable: { type: 'announcement', id: 'ann-1' },
        },
      ],
    });

    await expect(getNotifications()).resolves.toEqual([
      {
        id: 'ntf-1',
        title: 'Announcement',
        desc: 'School opens late tomorrow.',
        time: '2026-06-01T10:00:00Z',
        urgent: true,
        read: false,
      },
    ]);
  });

  it('markAllNotificationsRead refreshes notifications after the mutation', async () => {
    mockedRequest
      .mockResolvedValueOnce({ updated_count: 2 })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 'ntf-2',
            title: 'Parent Message',
            message: 'Please call back.',
            data: {},
            read_at: '2026-06-01T11:00:00Z',
            created_at: '2026-06-01T10:30:00Z',
            notifiable: { type: 'chat_message', id: 'msg-1' },
          },
        ],
      });

    await expect(markAllNotificationsRead()).resolves.toEqual([
      {
        id: 'ntf-2',
        title: 'Parent Message',
        desc: 'Please call back.',
        time: '2026-06-01T10:30:00Z',
        urgent: false,
        read: true,
      },
    ]);
  });

  it('markNotificationRead maps the updated notification', async () => {
    mockedRequest.mockResolvedValueOnce({
      id: 'ntf-3',
      title: 'New chat message',
      message: 'Can we reschedule?',
      data: {},
      read_at: '2026-06-01T12:00:00Z',
      created_at: '2026-06-01T11:30:00Z',
      notifiable: { type: 'chat_message', id: 'msg-2' },
    });

    await expect(markNotificationRead('ntf-3')).resolves.toEqual({
      id: 'ntf-3',
      title: 'New chat message',
      desc: 'Can we reschedule?',
      time: '2026-06-01T11:30:00Z',
      urgent: false,
      read: true,
    });
  });

  it('getNotificationCounter returns unread_count', async () => {
    mockedRequest.mockResolvedValueOnce({ unread_count: 7 });

    await expect(getNotificationCounter()).resolves.toBe(7);
  });
});
