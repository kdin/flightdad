# Flight Tracker API — AviationStack

This document describes how to set up and use the AviationStack API integration
in the flightdad backend.

## Why AviationStack?

| Criteria | AviationStack |
|---|---|
| **Adoption** | 100,000+ developers; used widely in travel / flight apps |
| **Free tier** | ✅ 100 real-time API calls / month; unlimited historical |
| **Data quality** | Aggregates from IATA, ICAO, and global airline feeds |
| **ETA / delay** | ✅ `departure.estimated`, `arrival.estimated`, `departure.delay`, `arrival.delay` (minutes) |
| **REST API** | Simple key-based HTTP GET — no SDK required |
| **Documentation** | https://aviationstack.com/documentation |

---

## Getting an API Key

1. Go to <https://aviationstack.com> and click **Get Free API Key**.
2. Create a free account (no credit card required for the free plan).
3. Copy the **Access Key** shown in your dashboard.

> **Free plan limits**  
> • 100 real-time API calls / month  
> • Unlimited historical data requests  
> • HTTPS access requires a paid plan; the free tier uses HTTP  
>
> These limits are sufficient for initial development and testing.
> Upgrade to a paid plan for production workloads.

---

## Environment Setup

### Local development

1. Copy the example env file (if you haven't already):

   ```bash
   cp services/backend/.env.example services/backend/.env.local
   ```

2. Open `services/backend/.env.local` and set your key:

   ```dotenv
   AVIATIONSTACK_API_KEY=your_access_key_here
   ```

### Test environment

The `.env.test` file ships with a blank key (`AVIATIONSTACK_API_KEY=`).
All tests mock the HTTP client, so no real key is needed for `npm test`.

### Production (AWS Lambda)

Inject the key as a Lambda environment variable (or via AWS Secrets Manager /
Parameter Store):

```
AVIATIONSTACK_API_KEY=your_access_key_here
```

---

## API Endpoint

The integration calls:

```
GET https://api.aviationstack.com/v1/flights
    ?access_key=<key>
    &flight_iata=<flightNumber>
    &limit=1
```

### Key response fields

| Field | Description |
|---|---|
| `flight_status` | `scheduled` \| `active` \| `landed` \| `cancelled` \| `diverted` \| `incident` |
| `departure.scheduled` | Scheduled departure time (ISO-8601) |
| `departure.estimated` | Estimated departure time (ETA from origin) |
| `departure.delay` | Departure delay in minutes (positive = late) |
| `arrival.scheduled` | Scheduled arrival time (ISO-8601) |
| `arrival.estimated` | Estimated arrival time / ETA (ISO-8601) |
| `arrival.delay` | Arrival delay in minutes (positive = late) |

---

## flightdad Status Mapping

AviationStack statuses are normalised to the shared `FlightStatus` type:

| AviationStack | flightdad `FlightStatus` | Notes |
|---|---|---|
| `scheduled` | `SCHEDULED` | |
| `active` | `IN_FLIGHT` | Overridden to `DELAYED` if delay > 0 |
| `landed` | `LANDED` | |
| `cancelled` | `CANCELLED` | |
| `diverted` | `DIVERTED` | |
| `incident` | `DIVERTED` | Treated as divert for notifications |
| *(any with delay > 0)* | `DELAYED` | Delay takes precedence |

---

## Using the Endpoint

```http
GET /flights/AA100
```

### Success response (200)

```json
{
  "data": {
    "id": "AA100",
    "flightNumber": "AA100",
    "airline": "American Airlines",
    "origin": {
      "iataCode": "JFK",
      "name": "John F. Kennedy International Airport",
      "city": "John F. Kennedy International Airport",
      "country": ""
    },
    "destination": {
      "iataCode": "LAX",
      "name": "Los Angeles International Airport",
      "city": "Los Angeles International Airport",
      "country": ""
    },
    "scheduledDeparture": "2024-06-01T08:00:00+00:00",
    "scheduledArrival":   "2024-06-01T11:00:00+00:00",
    "status": "DELAYED",
    "estimatedDeparture": "2024-06-01T08:45:00+00:00",
    "estimatedArrival":   "2024-06-01T11:45:00+00:00",
    "departureDelayMinutes": 45,
    "arrivalDelayMinutes":   45
  }
}
```

### Not found (404)

```json
{ "message": "Flight XX999 not found" }
```

### Upstream error (502)

```json
{
  "message": "Failed to retrieve flight status",
  "error":   "AviationStack request failed: 429 Too Many Requests"
}
```

---

## Relevant Source Files

| File | Purpose |
|---|---|
| `services/backend/src/clients/aviationstack.ts` | Typed HTTP client for the AviationStack REST API |
| `services/backend/src/services/FlightStatusService.ts` | Maps API response to `FlightStatusInfo`; singleton exported as `flightStatusService` |
| `services/backend/src/routes/flights.ts` | `GET /flights/:flightNumber` route handler |
| `packages/shared/src/index.ts` | `FlightStatusInfo` type (extends `Flight` with ETA + delay fields) |
