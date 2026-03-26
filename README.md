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

## Roadmap

- [ ] Flight status polling (external flight data API)
- [ ] Push notifications (Expo Notifications / Firebase FCM)
- [ ] Airline check-in automation
- [ ] User authentication
- [ ] Web dashboard
