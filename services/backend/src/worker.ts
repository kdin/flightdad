/**
 * Standalone entry point for the itinerary background worker (local dev only).
 *
 * Run directly with ts-node to start a continuous polling loop:
 *
 *   cd services/backend
 *   npm run worker
 *
 * The poll interval is controlled by the WORKER_POLL_INTERVAL_MS environment
 * variable (default: 60 000 ms / 1 minute).
 *
 * Press Ctrl-C (SIGINT) or send SIGTERM to shut down cleanly.
 *
 * ─── Production (AWS) ────────────────────────────────────────────────────────
 * In production the worker is triggered by EventBridge Scheduler invoking the
 * unified Lambda handler in `src/lambda.ts` — no separate worker Lambda is
 * needed.  See README.md for the full deployment guide.
 */

import config from "./config";
import { ItineraryWorkerService } from "./services/ItineraryWorkerService";

const worker = new ItineraryWorkerService();

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
