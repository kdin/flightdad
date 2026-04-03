# Backend Architecture

## Overview

The `services/backend` service is a Node.js / Express REST API. In production it runs as a single AWS Lambda function (the **lambda-lith** pattern), with API Gateway in front for HTTP traffic and EventBridge Scheduler invoking it directly for background work.

---

## Deployment topology

```
Mobile app
    │
    │  Authorization: Bearer <Cognito ID token>
    ▼
API Gateway HTTP API
    │
    ▼
Lambda  (dist/lambda.handler)
    │
    ├─── API Gateway event ──► @vendia/serverless-express ──► Express app ──► DynamoDB
    │                                                              │
    │                                                   requireAuth middleware
    │                                                   (JWT validation via JWKS)
    │
    └─── EventBridge Scheduler event ──► ItineraryWorkerService.runOnce() ──► DynamoDB

EventBridge Scheduler (rate(1 minute))
    │
    └──► Lambda (direct invocation, no API Gateway)

AWS Cognito User Pool
    │
    └──► PostConfirmation trigger ──► Lambda ──► DynamoDB (users collection)
```

See [docs/federated-auth.md](./federated-auth.md) for the full authentication and
user-creation flow.

---

## Why lambda-lith instead of an always-on server?

| | Always-on server (ECS / Fargate) | Lambda-lith (API Gateway + Lambda) |
|---|---|---|
| Idle cost | Charged 24 / 7 | None — pay per request |
| Cold starts | None | ~100–500 ms (mitigable with Provisioned Concurrency) |
| Max request duration | Unlimited | 29 s (API Gateway timeout) |
| Ops burden | Manage containers, scaling, health checks | Near zero |
| Deployment artifact | Docker image | Single zip file |

For flightdad — a mobile companion app with bursty, unpredictable traffic — the lambda-lith eliminates idle cost with minimal code changes. The Express app is wrapped by [`@vendia/serverless-express`](https://github.com/vendia/serverless-express), so all existing routes work unchanged.

---

## Why EventBridge invokes the Lambda directly rather than calling an HTTP endpoint?

The background worker needs to run on a schedule regardless of whether any user is making HTTP requests. Two options were considered:

**Option A — EventBridge → HTTP endpoint (POST /run-worker)**
- Requires the backend to be a persistent server (ECS / EC2) that is always reachable.
- The endpoint must be secured (auth header, VPC-only, etc.) to prevent external callers from triggering it.
- If the server is redeploying or unhealthy when EventBridge fires, the scheduled tick is silently dropped.

**Option B — EventBridge → Lambda direct invocation (chosen)**
- EventBridge calls the Lambda ARN directly — no public HTTP surface is exposed.
- The invocation is independent of any API Gateway request; the Lambda starts a fresh execution even if it was idle.
- No extra authentication is needed — IAM controls which EventBridge role can invoke which Lambda.
- Because the backend is already a Lambda, there is no need for a separate worker Lambda; one function, one deployment artifact.

---

## Lambda event routing

The unified handler in `src/lambda.ts` discriminates between the two event sources using a custom field injected by EventBridge Scheduler:

```
EventBridge target input: { "source": "flightdad-scheduler" }
```

```ts
// src/lambda.ts (simplified)
export const handler = async (event, context) => {
  if (event.source === "flightdad-scheduler") {
    // Background worker path
    await worker.runOnce();
    return { success: true };
  }

  // API Gateway path
  return apiHandler(event, context);
};
```

API Gateway events never carry a `source` field matching `"flightdad-scheduler"`, so there is no ambiguity.

---

## Collections (database tables)

| Collection | Key fields | Description |
|---|---|---|
| `users` | `userId`, `email` | User profile created on first sign-up via Cognito PostConfirmation trigger |
| `itineraries` | `userId`, `journeyStatus`, `timeToQuery` | Flight itineraries submitted by users |
| `user-friends` | `userId`, `friendIds` | Per-user friend list (userId → list of friend userIds) |

`userId` in every collection is the Cognito `sub` claim — a stable UUID that never
changes. See [docs/federated-auth.md](./federated-auth.md) for details.

---

## Flight data provider — AviationStack

The `GET /flights/:flightNumber` endpoint retrieves live flight status from the
[AviationStack REST API](https://aviationstack.com).

### Data returned

- **ETA** — `estimatedDeparture` and `estimatedArrival` (ISO-8601 timestamps)
- **Delay** — `departureDelayMinutes` and `arrivalDelayMinutes` (positive integer = late)
- **Status** — normalised to the shared `FlightStatus` enum (see table below)

### Status mapping

| AviationStack `flight_status` | flightdad `FlightStatus` |
|---|---|
| `scheduled` | `SCHEDULED` |
| `active` | `IN_FLIGHT` (overridden to `DELAYED` when delay > 0) |
| `landed` | `LANDED` |
| `cancelled` | `CANCELLED` |
| `diverted` / `incident` | `DIVERTED` |

### Configuration

Set `AVIATIONSTACK_API_KEY` in the environment (blank by default).
See [docs/flight-tracker-api.md](./flight-tracker-api.md) for full setup instructions.

### Source files

| File | Role |
|---|---|
| `src/clients/aviationstack.ts` | Typed HTTP client; wraps a single `GET /v1/flights` call |
| `src/services/FlightStatusService.ts` | Business logic; maps raw API response to `FlightStatusInfo` |
| `src/routes/flights.ts` | Route handler; calls `flightStatusService.getFlightStatus()` |

---

## Background worker — ItineraryWorkerService

`src/services/ItineraryWorkerService.ts` implements the worker logic.

### What it does

On each invocation (`runOnce()`):
1. Queries the `itineraries` collection for all records with `journeyStatus` of `PENDING` or `IN-PROGRESS`.
2. Filters those results to records whose `timeToQuery ≤ now` (i.e. it is time to check their flight status).
3. Prints each matching record to stdout as JSON (picked up by CloudWatch Logs in production).

### Why two queries instead of one?

The `Collection.find()` abstraction currently supports only equality filters. To match two statuses, the worker issues two parallel queries and merges the results in application code:

```ts
const results = (
  await Promise.all(
    ["PENDING", "IN-PROGRESS"].map((status) =>
      collection.find({ journeyStatus: status })
    )
  )
).flat();
```

### Known limitation — over-fetching on `timeToQuery`

The `timeToQuery ≤ now` filter runs in application code after DynamoDB returns all active records. At low volume this is fine; at scale it reads more data than necessary. The recommended fix — a DynamoDB GSI with `journeyStatus` as the partition key and `timeToQuery` as the sort key — is tracked separately.

### Local dev vs. production

| Environment | Entry point | Mechanism |
|---|---|---|
| Local dev | `src/worker.ts` (`npm run worker`) | `setInterval` polling loop |
| Production | `src/lambda.ts` | Single `runOnce()` call per EventBridge invocation |

---

## Local development

```bash
cd services/backend

# HTTP server
npm run dev

# Background worker (separate terminal)
npm run worker

# Override poll interval
WORKER_POLL_INTERVAL_MS=10000 npm run worker
```

---

## Required AWS infrastructure

| Resource | Configuration |
|---|---|
| Lambda function | Handler: `dist/lambda.handler`, Runtime: `nodejs20.x` |
| API Gateway HTTP API | `$default` catch-all route, Lambda proxy integration |
| EventBridge Scheduler | `rate(1 minute)`, target = Lambda ARN, input = `{"source":"flightdad-scheduler"}` |
| IAM execution role | `dynamodb:Query`, `dynamodb:Scan` on itineraries table; `logs:*` for CloudWatch |

See the [README](../README.md) for step-by-step deployment commands.
