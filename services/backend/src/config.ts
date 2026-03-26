/**
 * Application configuration.
 *
 * Reads from environment variables (loaded by dotenv in development/test).
 * In production the variables are expected to be injected by the runtime
 * environment — dotenv is only loaded when NODE_ENV is not "production".
 *
 * Usage:
 *   import config from "./config";
 *   console.log(config.db.type); // "memory" | "dynamodb"
 */

import dotenv from "dotenv";
import path from "path";

// Load the environment file that corresponds to the current NODE_ENV.
// Priority (highest → lowest):
//   .env.<NODE_ENV>.local  →  .env.local  →  .env.<NODE_ENV>  →  .env
if (process.env.NODE_ENV !== "production") {
  const envFile =
    process.env.NODE_ENV === "test" ? ".env.test" : ".env.local";

  // Try the environment-specific file first, fall back to .env
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// ─── Config object ────────────────────────────────────────────────────────────

const config = {
  /** Current runtime environment. */
  env: optionalEnv("NODE_ENV", "development") as
    | "development"
    | "test"
    | "production",

  /** HTTP port the backend listens on. */
  port: parseInt(optionalEnv("PORT", "3000"), 10),

  db: {
    /**
     * Database backend to use.
     * - "memory"   – in-process document store for local dev & testing
     * - "dynamodb" – AWS DynamoDB (production)
     */
    type: optionalEnv("DB_TYPE", "memory") as "memory" | "dynamodb",

    // ── DynamoDB (future) ────────────────────────────────────────────────
    dynamodb: {
      region: optionalEnv("AWS_REGION", "us-east-1"),
      /** Table name prefix — final table names are "<prefix>-<collection>". */
      tablePrefix: optionalEnv("DYNAMODB_TABLE_PREFIX", "flightdad"),
    },
  },

  worker: {
    /**
     * How often (in milliseconds) the worker polls for due itineraries when
     * running locally.  In production this is controlled by the EventBridge
     * Scheduler rule, so the value is ignored by the Lambda handler.
     */
    pollIntervalMs: parseInt(
      optionalEnv("WORKER_POLL_INTERVAL_MS", "60000"),
      10
    ),
  },
} as const;

export type AppConfig = typeof config;
export { requireEnv, optionalEnv };
export default config;
