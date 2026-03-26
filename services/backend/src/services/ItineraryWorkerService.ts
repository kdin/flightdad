/**
 * ItineraryWorkerService — background worker that scans the itinerary table
 * for records whose `timeToQuery` has passed and whose `journeyStatus` is
 * still PENDING or IN-PROGRESS, then prints them to stdout.
 *
 * ─── Local dev ───────────────────────────────────────────────────────────────
 * Call `start(intervalMs)` to kick off a continuous `setInterval` polling
 * loop.  Call `stop()` to tear it down cleanly.
 *
 * ─── AWS Lambda (production) ─────────────────────────────────────────────────
 * Call `runOnce()` directly — it performs a single scan pass and returns the
 * due records.  The Lambda entry point in `worker.ts` wraps this call.
 */

import defaultDb from "../db";
import type { DocumentDatabase } from "../db/types";
import type { Document } from "../db/types";
import type { ItineraryRecord } from "../schemas/itinerary";

const COLLECTION = "itineraries";

/** Journey statuses that still require flight-status processing. */
const ACTIVE_STATUSES: ItineraryRecord["journeyStatus"][] = [
  "PENDING",
  "IN-PROGRESS",
];

export class ItineraryWorkerService {
  private readonly db: DocumentDatabase;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * @param database - Optional database to use. Defaults to the app singleton.
   *                   Inject a fresh `InMemoryDatabase` in tests for isolation.
   */
  constructor(database?: DocumentDatabase) {
    this.db = database ?? defaultDb;
  }

  /**
   * Start a continuous polling loop.
   *
   * Runs one scan immediately, then repeats every `intervalMs` milliseconds.
   * Calling `start()` on an already-running worker is a no-op.
   *
   * @param intervalMs - Poll interval in milliseconds. Default: 60 000 (1 min).
   */
  start(intervalMs = 60_000): void {
    if (this.intervalHandle !== null) return; // already running

    // Run once immediately, then on each tick.
    this.runOnce().catch((err) =>
      console.error("[ItineraryWorker] Error during scan:", err)
    );

    this.intervalHandle = setInterval(() => {
      this.runOnce().catch((err) =>
        console.error("[ItineraryWorker] Error during scan:", err)
      );
    }, intervalMs);

    console.log(
      `[ItineraryWorker] Started. Polling every ${intervalMs / 1000}s.`
    );
  }

  /** Stop the polling loop. */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log("[ItineraryWorker] Stopped.");
    }
  }

  /**
   * Perform one scan pass:
   *  1. Fetch all PENDING / IN-PROGRESS itineraries from the database.
   *  2. Keep only those whose `timeToQuery` ≤ now.
   *  3. Print each matching record to stdout as JSON.
   *
   * Returns the list of due records so callers (tests, Lambda handler) can
   * inspect the results without parsing stdout.
   */
  async runOnce(): Promise<Document<ItineraryRecord>[]> {
    const collection = this.db.collection<ItineraryRecord>(COLLECTION);
    const now = new Date();

    // The Collection interface only supports equality queries; fetch each
    // active status in parallel and merge the results.
    const results = (
      await Promise.all(
        ACTIVE_STATUSES.map((status) =>
          collection.find({ journeyStatus: status })
        )
      )
    ).flat();

    const due = results.filter((r) => r.timeToQuery.getTime() <= now.getTime());

    if (due.length === 0) {
      console.log("[ItineraryWorker] No due itineraries found.");
      return due;
    }

    console.log(
      `[ItineraryWorker] Found ${due.length} due itinerary/itineraries:`
    );
    for (const record of due) {
      console.log(JSON.stringify(record, null, 2));
    }

    return due;
  }
}
