// Feature: backend-integration-refactor, Property 11: Mark all notifications read
// Validates: Requirements 9.3

import * as fc from 'fast-check';
import {
  getNotifications,
  markAllNotificationsRead,
  _setMockStore,
} from '../notificationsService';

/**
 * **Validates: Requirements 9.3**
 *
 * Property 11: Mark all notifications read
 * For any initial set of notifications (including unread ones), calling
 * markAllNotificationsRead() followed by getNotifications() should return a
 * list where every notification has read === true.
 */
describe('notificationsService — Property 11: Mark all notifications read', () => {
  it(
    'every notification has read === true after markAllNotificationsRead()',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string(),
              desc: fc.string(),
              time: fc.string(),
              urgent: fc.boolean(),
              read: fc.boolean(),
            }),
            { minLength: 1 }
          ),
          async (notifications) => {
            // Seed the mock store with the generated array
            _setMockStore(notifications);

            // Mark all as read
            await markAllNotificationsRead();

            // Retrieve the updated list
            const result = await getNotifications();

            // Every notification must have read === true
            return result.every((n) => n.read === true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
