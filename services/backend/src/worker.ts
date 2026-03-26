/**
 * Standalone entry point for the itinerary background worker.
 *
 * ─── Local dev ───────────────────────────────────────────────────────────────
 * Run directly with ts-node to start a continuous polling loop:
 *
 *   cd services/backend
 *   npx ts-node src/worker.ts
 *
 * The poll interval is controlled by the WORKER_POLL_INTERVAL_MS environment
 * variable (default: 60 000 ms / 1 minute).
 *
 * Press Ctrl-C (SIGINT) or send SIGTERM to shut down cleanly.
 *
 * ─── AWS Lambda (production) ─────────────────────────────────────────────────
 * The exported `handler` function is invoked by an Amazon EventBridge
 * Scheduler rule on a cron or rate schedule.
 *
 * Required AWS infrastructure (deploy separately — see README.md):
 *   - Lambda function pointing to this handler (Node.js 20.x runtime)
 *   - IAM execution role with:
 *       · dynamodb:Query + dynamodb:Scan on the itineraries table
 *       · logs:CreateLogGroup + logs:CreateLogStream + logs:PutLogEvents
 *   - EventBridge Scheduler rule (e.g. rate(1 minute)) targeting the Lambda
 */

import config from "./config";
import { ItineraryWorkerService } from "./services/ItineraryWorkerService";

const worker = new ItineraryWorkerService();

// ─── AWS Lambda handler ───────────────────────────────────────────────────────

/**
 * Lambda entry point.  EventBridge Scheduler calls this on each scheduled
 * tick.  The function performs one scan pass and exits cleanly — Lambda
 * manages the lifecycle.
 */
export const handler = async (): Promise<void> => {
  await worker.runOnce();
};

// ─── Local dev entry point ────────────────────────────────────────────────────

if (require.main === module) {
  const intervalMs = config.worker.pollIntervalMs;
  worker.start(intervalMs);

  // Graceful shutdown on SIGINT (Ctrl-C) / SIGTERM.
  const shutdown = (): void => {
    worker.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
