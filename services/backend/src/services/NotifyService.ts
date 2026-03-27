/**
 * NotifyService — stub for future flight-status notification processing.
 *
 * Currently only prints each (flight number, user id) pair to stdout.
 * Future implementations will dispatch push notifications via a provider
 * such as Firebase FCM or Expo Notifications.
 */

import type { NotifyPair } from "../schemas/notify";

export class NotifyService {
  /**
   * Process a list of (flight number, user id) pairs.
   *
   * Stub implementation: logs each pair to stdout and returns.
   * Empty arrays are silently ignored.
   *
   * @param pairs - List of flight-number / user-id pairs to process.
   */
  notify(pairs: NotifyPair[]): void {
    console.log(`[NotifyService] Processing ${pairs.length} notification(s):`);
    for (const pair of pairs) {
      console.log(JSON.stringify(pair));
    }
  }
}

/** Singleton used by the Express app and the itinerary worker. */
export const notifyService = new NotifyService();
