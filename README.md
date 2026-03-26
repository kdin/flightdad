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

> **Prerequisites:** Node.js ≥ 18, npm ≥ 9

```bash
# Install all workspace dependencies
npm install

# Run the backend (dev mode, listens on http://localhost:3000)
npm run backend

# Run the mobile app (Expo)
npm run mobile
```

---

## Storing sample itineraries (seed script)

The backend ships with a seed script that posts three sample itineraries
(domestic, international, and multi-leg) to the running local server.

```bash
# 1. Start the backend in one terminal
npm run backend

# 2. In a second terminal, run the seed script
cd services/backend
npm run seed
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
