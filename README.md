# flightdad ✈️

> A virtual dad that helps you with flight logistics — check-in, status tracking, notifications, first and last mile.

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

Express REST API.

| Route | Purpose |
|---|---|
| `GET /health` | Health check |
| `POST /flights/itinerary` | Store a flight itinerary (parses booking confirmation emails) |
| `GET /flights/:flightNumber` | Flight status (not yet implemented) |
| `POST /checkin` | Initiate check-in (not yet implemented) |
| `GET /notifications` | User notification history (not yet implemented) |

### `packages/shared`

TypeScript types consumed by both the mobile app and backend:
`Flight`, `Airport`, `FlightStatus`, `CheckIn`, `Notification`, `NotificationType`.

---

## Getting started

### Option A — Docker (recommended, nothing installed locally)

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Engine and Compose V2)

```bash
# Start the API server (first run builds the image automatically)
docker compose up --build
```

The API is available at `http://localhost:3000`. Source code is bind-mounted into the container so edits are reflected immediately — no rebuild needed.

```bash
# Also start the background worker
docker compose --profile worker up --build

# Stop everything
docker compose down
```

> **After adding or removing npm dependencies** run `docker compose build` to refresh the image.

Environment variables default to the values in `docker-compose.yml`. Override any of them by creating `services/backend/.env.local` (gitignored) — see `.env.example` for the full list.

---

### Option B — Node.js directly

> **Prerequisites:** Node.js ≥ 18, npm ≥ 9

```bash
# Install all workspace dependencies
npm install
```

#### Set up the backend environment

```bash
cd services/backend

# Copy the example env file and adjust as needed
cp .env.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port for the local dev server |
| `DB_TYPE` | `memory` | Database backend (`memory` for local, `dynamodb` for prod) |
| `WORKER_POLL_INTERVAL_MS` | `60000` | Worker poll interval in milliseconds (local dev only) |

#### Run everything locally

In production the HTTP server and background worker run inside the **same Lambda function** (see [Production deployment](#production-deployment-aws--lambda-lith) below). Locally they are two separate processes — start each in its own terminal:

**Terminal 1 — HTTP server**

```bash
# From the repository root
npm run backend          # equivalent to: cd services/backend && npm run dev
```

The server starts on `http://localhost:3000` (or the `PORT` in `.env.local`).

**Terminal 2 — background worker**

```bash
# From the repository root
npm run worker           # equivalent to: cd services/backend && npm run worker

# Or override the poll interval (e.g. every 10 s for faster iteration)
WORKER_POLL_INTERVAL_MS=10000 npm run worker
```

Press **Ctrl-C** in either terminal to stop that process.

#### Run the mobile app

```bash
npm run mobile           # starts the Expo dev server
```

#### Run tests

```bash
# All workspaces
npm test

# Backend only
cd services/backend && npm test
```

---

## Background worker

The **itinerary worker** scans the `itineraries` collection for records whose
`timeToQuery` has passed and whose `journeyStatus` is `PENDING` or
`IN-PROGRESS`, then prints each matching record to stdout as JSON.

| Environment | How it runs |
|---|---|
| **Local dev** | `npm run worker` — a `setInterval` polling loop (`src/worker.ts`) |
| **Production** | EventBridge Scheduler invokes the same Lambda directly once per minute |

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

## Storing sample itineraries (seed script)

The backend ships with a seed script that posts three sample itineraries
(domestic, international, and multi-leg) to the running local server.

```bash
# 1. Start the backend (Docker or Node.js - see Getting started)
docker compose up --build        # or: npm run backend

# 2. In a second terminal, run the seed script
docker compose exec backend npm run seed --workspace=services/backend
# or without Docker:
cd services/backend && npm run seed
```

You can override the target URL with the `API_URL` environment variable:

```bash
API_URL=http://localhost:3001 npm run seed
```

Expected output:

```
Seeding itineraries to http://localhost:3000

✅ [DOM001] stored
   _id          : <uuid>
   userId       : user-alice
   timeToQuery  : 2025-02-14T05:00:00.000Z

✅ [INT002] stored
   _id          : <uuid>
   userId       : user-bob
   timeToQuery  : 2025-03-10T19:00:00.000Z

✅ [MLT003] stored
   _id          : <uuid>
   userId       : user-carol
   timeToQuery  : 2025-04-05T04:00:00.000Z
```

> **Note:** `timeToQuery` is automatically set to 3 hours before the first
> flight's scheduled departure. This is used by the backend to know when to
> start polling for flight-status updates.

---

## Roadmap

- [ ] Flight status polling (external flight data API)
- [ ] Push notifications (Expo Notifications / Firebase FCM)
- [ ] Airline check-in automation
- [ ] User authentication
- [ ] Web dashboard
