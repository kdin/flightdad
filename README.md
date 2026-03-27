# flightdad ✈️

> A virtual dad that helps you with flight logistics — check-in, status tracking, and notifications.

---

## Mono-repo structure

```
flightdad/
├── apps/
│   └── mobile/          # React Native (Expo) mobile app
├── services/
│   └── backend/         # Node.js / Express cloud backend
└── packages/
    └── shared/          # Shared TypeScript types & utilities
```

### `apps/mobile`

Expo / React Native app. Screens (all placeholders for now):

| Screen | Purpose |
|---|---|
| `HomeScreen` | Dashboard listing upcoming flights |
| `FlightStatusScreen` | Real-time status, gate info, delays |
| `CheckInScreen` | Guided check-in flow & boarding pass |
| `NotificationsScreen` | History of flight alerts |

### `services/backend`

Express REST API. Routes (all return `501 Not Implemented` for now):

| Route | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /flights/:flightNumber` | Flight status |
| `POST /checkin` | Initiate check-in |
| `GET /notifications` | User notification history |

### `packages/shared`

TypeScript types consumed by both the mobile app and backend:
`Flight`, `Airport`, `FlightStatus`, `CheckIn`, `Notification`, `NotificationType`.

---

## Getting started

> **Prerequisites:** Node.js ≥ 18, npm ≥ 9

```bash
# Install all workspace dependencies
npm install

# Run the backend (dev mode)
npm run backend

# Run the mobile app (Expo)
npm run mobile
```

---

## Background worker

The **itinerary worker** is a background process that periodically scans the
`itineraries` collection for records that are ready to be processed (i.e. whose
`timeToQuery` timestamp has passed and whose `journeyStatus` is `PENDING` or
`IN-PROGRESS`) and prints them to stdout.

### Running the worker locally

The worker runs as a standalone Node.js process with a configurable polling
loop.

```bash
# From the repository root
cd services/backend

# Copy the example env file and adjust as needed
cp .env.example .env.local

# Start the worker (default poll interval: 60 s)
npm run worker

# Or override the poll interval (e.g. every 10 s for development)
WORKER_POLL_INTERVAL_MS=10000 npm run worker
```

Press **Ctrl-C** to stop the worker cleanly.

#### Environment variables

| Variable                 | Default  | Description                                          |
|--------------------------|----------|------------------------------------------------------|
| `WORKER_POLL_INTERVAL_MS`| `60000`  | Poll interval in milliseconds (local dev only).      |
| `DB_TYPE`                | `memory` | Database backend (`memory` for local, `dynamodb` for prod). |

---

## Production deployment (AWS — lambda-lith)

In production the entire backend runs as a single **AWS Lambda function**
(the "lambda-lith" pattern):

```
                         ┌─────────────────────────────────┐
Mobile app ──► API Gateway HTTP API ──► Lambda (dist/lambda.handler)
                                                  │
EventBridge Scheduler (rate(1 minute)) ───────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                     API Gateway event     Scheduler event
                              │                     │
                         Express app        worker.runOnce()
                              │                     │
                         DynamoDB            DynamoDB
```

The same Lambda handles both API requests (via `@vendia/serverless-express`)
and the scheduled worker tick (via a direct EventBridge invocation).  No
separate worker Lambda is needed.

**Why lambda-lith?**
- Pay per request — no idle server cost
- EventBridge invokes the Lambda directly (no public HTTP surface for the scheduler)
- Single deployment artifact — one zip, one function
- CloudWatch Logs captures all `console.log` output automatically

### Deployment steps

1. **Build the backend**

   ```bash
   cd services/backend
   npm run build          # compiles TypeScript to dist/
   ```

2. **Package the Lambda**

   ```bash
   zip -r backend.zip dist/ node_modules/
   ```

3. **Create the Lambda function**

   ```bash
   aws lambda create-function \
     --function-name flightdad-backend \
     --runtime nodejs20.x \
     --handler dist/lambda.handler \
     --zip-file fileb://backend.zip \
     --role arn:aws:iam::<ACCOUNT_ID>:role/flightdad-lambda-role \
     --environment Variables="{NODE_ENV=production,DB_TYPE=dynamodb,AWS_REGION=us-east-1,DYNAMODB_TABLE_PREFIX=flightdad}"
   ```

4. **Create the API Gateway HTTP API** and connect it to the Lambda function
   with a `$default` catch-all route using Lambda proxy integration.

5. **Attach an IAM execution role** with:
   - `dynamodb:Query` and `dynamodb:Scan` on the `flightdad-itineraries` table
   - `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

6. **Create an EventBridge Scheduler rule** that invokes the Lambda directly
   with a custom input to trigger the worker:

   ```bash
   aws scheduler create-schedule \
     --name flightdad-itinerary-worker-schedule \
     --schedule-expression "rate(1 minute)" \
     --flexible-time-window Mode=OFF \
     --target '{
       "Arn": "arn:aws:lambda:<REGION>:<ACCOUNT_ID>:function:flightdad-backend",
       "RoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/flightdad-scheduler-role",
       "Input": "{\"source\":\"flightdad-scheduler\"}"
     }'
   ```

   The `"source": "flightdad-scheduler"` input tells the unified handler to
   run the worker instead of routing to the Express app.

7. **Monitor** via CloudWatch Logs — all output lands in
   `/aws/lambda/flightdad-backend`.

---

## Roadmap

- [ ] Flight status polling (external flight data API)
- [ ] Push notifications (Expo Notifications / Firebase FCM)
- [ ] Airline check-in automation
- [ ] User authentication
- [ ] Web dashboard
