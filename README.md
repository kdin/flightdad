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

The worker can also be started alongside the HTTP server — it is automatically
launched when you run `npm run dev` or `npm start` (when the module is the
process entry point).

#### Environment variables

| Variable                 | Default  | Description                                          |
|--------------------------|----------|------------------------------------------------------|
| `WORKER_POLL_INTERVAL_MS`| `60000`  | Poll interval in milliseconds (local dev only).      |
| `DB_TYPE`                | `memory` | Database backend (`memory` for local, `dynamodb` for prod). |

### Deploying the worker in production (AWS)

In production the worker runs as an **AWS Lambda function** triggered by an
**Amazon EventBridge Scheduler** rule.  This is the most cost-effective
serverless architecture: you pay only for Lambda invocations (typically a few
milliseconds per run), and EventBridge handles the scheduling reliably without
needing a long-running process.

#### Architecture

```
EventBridge Scheduler
  └─► Lambda function (src/worker.ts → handler)
        └─► DynamoDB (itineraries table)
              └─► CloudWatch Logs (stdout)
```

#### Deployment steps

1. **Build the backend**

   ```bash
   cd services/backend
   npm run build          # compiles TypeScript to dist/
   ```

2. **Package the Lambda**

   Zip the compiled output and its `node_modules`:

   ```bash
   zip -r worker.zip dist/ node_modules/
   ```

3. **Create the Lambda function** (AWS Console or CLI)

   ```bash
   aws lambda create-function \
     --function-name flightdad-itinerary-worker \
     --runtime nodejs20.x \
     --handler dist/worker.handler \
     --zip-file fileb://worker.zip \
     --role arn:aws:iam::<ACCOUNT_ID>:role/flightdad-worker-role \
     --environment Variables="{DB_TYPE=dynamodb,AWS_REGION=us-east-1,DYNAMODB_TABLE_PREFIX=flightdad}"
   ```

4. **Attach an IAM execution role** with the following permissions:
   - `dynamodb:Query` and `dynamodb:Scan` on the `flightdad-itineraries` table
   - `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

5. **Create an EventBridge Scheduler rule** that triggers the Lambda on a
   rate or cron schedule:

   ```bash
   aws scheduler create-schedule \
     --name flightdad-itinerary-worker-schedule \
     --schedule-expression "rate(1 minute)" \
     --flexible-time-window Mode=OFF \
     --target '{"Arn":"arn:aws:lambda:<REGION>:<ACCOUNT_ID>:function:flightdad-itinerary-worker","RoleArn":"arn:aws:iam::<ACCOUNT_ID>:role/flightdad-scheduler-role"}'
   ```

6. **Monitor** the worker via CloudWatch Logs — all `console.log` output from
   `runOnce()` is automatically captured in the `/aws/lambda/flightdad-itinerary-worker`
   log group.

---

## Roadmap

- [ ] Flight status polling (external flight data API)
- [ ] Push notifications (Expo Notifications / Firebase FCM)
- [ ] Airline check-in automation
- [ ] User authentication
- [ ] Web dashboard
