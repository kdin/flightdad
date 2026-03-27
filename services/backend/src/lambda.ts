/**
 * Unified AWS Lambda entry point — "lambda-lith" pattern.
 *
 * A single Lambda function handles two distinct event sources:
 *
 * 1. **API Gateway (HTTP requests)**
 *    API Gateway invokes this handler for every HTTP request. The event is
 *    forwarded to the Express app via `@vendia/serverless-express` and the
 *    HTTP response is returned to API Gateway.
 *
 * 2. **EventBridge Scheduler (background worker)**
 *    EventBridge invokes this handler directly — without going through API
 *    Gateway — on a cron or rate schedule.  The handler calls
 *    `worker.runOnce()` to scan for due itineraries and then returns.
 *
 * ─── Why a single Lambda? ────────────────────────────────────────────────────
 * Running the entire Express backend inside Lambda (behind API Gateway) is
 * known as the "lambda-lith" pattern.  It eliminates idle server cost while
 * keeping familiar Express routing.  Because the backend is already a Lambda,
 * EventBridge can invoke it directly for scheduled work — no separate worker
 * function required.
 *
 * ─── Required AWS infrastructure ─────────────────────────────────────────────
 *   - Lambda function  → handler: dist/lambda.handler, runtime: nodejs20.x
 *   - API Gateway (HTTP API or REST API) → Lambda proxy integration
 *   - EventBridge Scheduler rule targeting the Lambda ARN directly
 *     (configure a custom input JSON to distinguish it from HTTP events)
 *   - IAM execution role with:
 *       · dynamodb:Query + dynamodb:Scan on the itineraries table
 *       · logs:CreateLogGroup + logs:CreateLogStream + logs:PutLogEvents
 *
 * ─── Local dev ───────────────────────────────────────────────────────────────
 * Use `npm run dev` for the HTTP server and `npm run worker` for the polling
 * loop — no changes needed for local development.
 */

import serverlessExpress from "@vendia/serverless-express";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  Context,
} from "aws-lambda";
import app from "./index";
import { ItineraryWorkerService } from "./services/ItineraryWorkerService";

// Build the API Gateway ↔ Express adapter once (reused across warm invocations).
// serverlessExpress returns a standard Lambda Handler, which is typed with a
// callback argument, but the function is fully async-compatible when awaited —
// cast to the async form to keep call sites clean.
type AsyncProxyHandler = (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  context: Context
) => Promise<unknown>;
const apiHandler = serverlessExpress({ app }) as unknown as AsyncProxyHandler;

const worker = new ItineraryWorkerService();

/** An EventBridge Scheduler event targeted directly at this Lambda. */
interface SchedulerEvent {
  source: "flightdad-scheduler";
}

type LambdaEvent =
  | SchedulerEvent
  | APIGatewayProxyEvent
  | APIGatewayProxyEventV2;

/**
 * Returns `true` when the event was sent by EventBridge Scheduler rather
 * than by API Gateway.  We use a custom `source` field set in the
 * EventBridge Scheduler target input so that the check is unambiguous.
 */
function isSchedulerEvent(event: LambdaEvent): event is SchedulerEvent {
  return (event as SchedulerEvent).source === "flightdad-scheduler";
}

/**
 * Unified Lambda handler.
 *
 * - EventBridge Scheduler events  → runs the itinerary worker once
 * - API Gateway events             → proxies to the Express app
 */
export const handler = async (
  event: LambdaEvent,
  context: Context
): Promise<unknown> => {
  if (isSchedulerEvent(event)) {
    await worker.runOnce();
    return { success: true };
  }

  // API Gateway v1 or v2 proxy event — forward to Express.
  return apiHandler(
    event as APIGatewayProxyEvent | APIGatewayProxyEventV2,
    context
  );
};
