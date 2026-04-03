/**
 * Integration tests for GET /flights/:flightNumber.
 *
 * AviationStackClient is mocked so that tests run without network access and
 * without a real API key.
 */

import request from "supertest";
import app from "../index";
import { flightStatusService } from "../services/FlightStatusService";
import type { FlightStatusInfo } from "@flightdad/shared";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFlightStatus: FlightStatusInfo = {
  id: "AA100",
  flightNumber: "AA100",
  airline: "American Airlines",
  origin: {
    iataCode: "JFK",
    name: "John F. Kennedy International Airport",
    city: "John F. Kennedy International Airport",
    country: "",
  },
  destination: {
    iataCode: "LAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles International Airport",
    country: "",
  },
  scheduledDeparture: "2024-06-01T08:00:00+00:00",
  scheduledArrival: "2024-06-01T11:00:00+00:00",
  status: "SCHEDULED",
  estimatedDeparture: "2024-06-01T08:00:00+00:00",
  estimatedArrival: "2024-06-01T11:15:00+00:00",
  departureDelayMinutes: null,
  arrivalDelayMinutes: null,
};

const mockDelayedFlightStatus: FlightStatusInfo = {
  ...mockFlightStatus,
  status: "DELAYED",
  departureDelayMinutes: 45,
  arrivalDelayMinutes: 45,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /flights/:flightNumber", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 with flight status data when the flight is found", async () => {
    jest
      .spyOn(flightStatusService, "getFlightStatus")
      .mockResolvedValue(mockFlightStatus);

    const res = await request(app).get("/flights/AA100").expect(200);

    expect(res.body.data).toMatchObject({
      id: "AA100",
      flightNumber: "AA100",
      airline: "American Airlines",
      status: "SCHEDULED",
    });
  });

  it("includes ETA (estimatedArrival) and delay fields in the response", async () => {
    jest
      .spyOn(flightStatusService, "getFlightStatus")
      .mockResolvedValue(mockFlightStatus);

    const res = await request(app).get("/flights/AA100").expect(200);

    expect(res.body.data).toHaveProperty("estimatedDeparture");
    expect(res.body.data).toHaveProperty("estimatedArrival");
    expect(res.body.data).toHaveProperty("departureDelayMinutes");
    expect(res.body.data).toHaveProperty("arrivalDelayMinutes");
  });

  it("returns DELAYED status and delay minutes for a delayed flight", async () => {
    jest
      .spyOn(flightStatusService, "getFlightStatus")
      .mockResolvedValue(mockDelayedFlightStatus);

    const res = await request(app).get("/flights/BA202").expect(200);

    expect(res.body.data.status).toBe("DELAYED");
    expect(res.body.data.departureDelayMinutes).toBe(45);
    expect(res.body.data.arrivalDelayMinutes).toBe(45);
  });

  it("returns 404 when the flight is not found", async () => {
    jest
      .spyOn(flightStatusService, "getFlightStatus")
      .mockResolvedValue(null);

    const res = await request(app).get("/flights/XX999").expect(404);

    expect(res.body.message).toContain("XX999");
  });

  it("returns 502 when the flight data provider throws an error", async () => {
    jest
      .spyOn(flightStatusService, "getFlightStatus")
      .mockRejectedValue(new Error("AviationStack request failed: 429 Too Many Requests"));

    const res = await request(app).get("/flights/AA100").expect(502);

    expect(res.body.message).toBe("Failed to retrieve flight status");
    expect(res.body.error).toContain("429");
  });

  it("calls getFlightStatus with the flight number from the URL", async () => {
    const spy = jest
      .spyOn(flightStatusService, "getFlightStatus")
      .mockResolvedValue(mockFlightStatus);

    await request(app).get("/flights/UA303");

    expect(spy).toHaveBeenCalledWith("UA303");
  });
});

// ─── FlightStatusService unit tests ──────────────────────────────────────────

import { FlightStatusService } from "../services/FlightStatusService";
import { AviationStackClient } from "../clients/aviationstack";
import type { AviationStackFlight } from "../clients/aviationstack";

const rawScheduledFlight: AviationStackFlight = {
  flight_date: "2024-06-01",
  flight_status: "scheduled",
  departure: {
    airport: "John F. Kennedy International Airport",
    iata: "JFK",
    terminal: "4",
    gate: "B22",
    scheduled: "2024-06-01T08:00:00+00:00",
    estimated: "2024-06-01T08:00:00+00:00",
    actual: null,
    delay: null,
  },
  arrival: {
    airport: "Los Angeles International Airport",
    iata: "LAX",
    terminal: "4",
    gate: null,
    baggage: null,
    scheduled: "2024-06-01T11:00:00+00:00",
    estimated: "2024-06-01T11:00:00+00:00",
    actual: null,
    delay: null,
  },
  airline: { name: "American Airlines", iata: "AA" },
  flight: { number: "100", iata: "AA100" },
};

const rawDelayedFlight: AviationStackFlight = {
  ...rawScheduledFlight,
  flight_status: "active",
  departure: { ...rawScheduledFlight.departure, delay: 30 },
  arrival: { ...rawScheduledFlight.arrival, delay: 30 },
};

const rawCancelledFlight: AviationStackFlight = {
  ...rawScheduledFlight,
  flight_status: "cancelled",
};

describe("FlightStatusService", () => {
  let mockClient: jest.Mocked<AviationStackClient>;
  let service: FlightStatusService;

  beforeEach(() => {
    mockClient = {
      getFlightStatus: jest.fn(),
    } as unknown as jest.Mocked<AviationStackClient>;
    service = new FlightStatusService(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when no flights are returned by the API", async () => {
    mockClient.getFlightStatus.mockResolvedValue([]);

    const result = await service.getFlightStatus("ZZ000");

    expect(result).toBeNull();
  });

  it("maps a scheduled flight to SCHEDULED status", async () => {
    mockClient.getFlightStatus.mockResolvedValue([rawScheduledFlight]);

    const result = await service.getFlightStatus("AA100");

    expect(result?.status).toBe("SCHEDULED");
    expect(result?.flightNumber).toBe("AA100");
    expect(result?.departureDelayMinutes).toBeNull();
    expect(result?.arrivalDelayMinutes).toBeNull();
  });

  it("maps a flight with positive delay to DELAYED status", async () => {
    mockClient.getFlightStatus.mockResolvedValue([rawDelayedFlight]);

    const result = await service.getFlightStatus("AA100");

    expect(result?.status).toBe("DELAYED");
    expect(result?.departureDelayMinutes).toBe(30);
    expect(result?.arrivalDelayMinutes).toBe(30);
  });

  it("maps a cancelled flight to CANCELLED status", async () => {
    mockClient.getFlightStatus.mockResolvedValue([rawCancelledFlight]);

    const result = await service.getFlightStatus("AA100");

    expect(result?.status).toBe("CANCELLED");
  });

  it("passes the estimated arrival as the ETA", async () => {
    const flightWithEta: AviationStackFlight = {
      ...rawScheduledFlight,
      arrival: {
        ...rawScheduledFlight.arrival,
        estimated: "2024-06-01T11:30:00+00:00",
      },
    };
    mockClient.getFlightStatus.mockResolvedValue([flightWithEta]);

    const result = await service.getFlightStatus("AA100");

    expect(result?.estimatedArrival).toBe("2024-06-01T11:30:00+00:00");
  });

  it("propagates errors thrown by the underlying client", async () => {
    mockClient.getFlightStatus.mockRejectedValue(
      new Error("AviationStack API error: Invalid API key")
    );

    await expect(service.getFlightStatus("AA100")).rejects.toThrow(
      "Invalid API key"
    );
  });
});
