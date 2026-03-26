/**
 * Integration tests for POST /flights/itinerary.
 *
 * Uses supertest to exercise the full Express middleware stack so that the
 * request validation, DB persistence, and response shape are all verified
 * together.
 */

import request from "supertest";
import app from "../index";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validItinerary = {
  bookingReference: "TESTIT",
  bookedAt: "2024-01-15T10:00:00Z",
  contactEmail: "test@example.com",
  passengers: [
    {
      firstName: "Jane",
      lastName: "Doe",
    },
  ],
  flights: [
    {
      flightNumber: "AA100",
      airline: "American Airlines",
      origin: {
        iataCode: "JFK",
        name: "John F. Kennedy International Airport",
        city: "New York",
        country: "US",
      },
      destination: {
        iataCode: "LAX",
        name: "Los Angeles International Airport",
        city: "Los Angeles",
        country: "US",
      },
      scheduledDeparture: "2024-06-01T08:00:00Z",
      scheduledArrival: "2024-06-01T11:00:00Z",
      cabinClass: "ECONOMY",
    },
  ],
  totalPrice: 299.99,
  currency: "USD",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /flights/itinerary", () => {
  it("returns 201 and persists the itinerary with an _id, userId, and timeToQuery", async () => {
    const res = await request(app)
      .post("/flights/itinerary")
      .set("x-user-id", "user-abc")
      .send(validItinerary)
      .expect(201);

    expect(res.body.message).toBe("Itinerary received");
    expect(res.body.data).toMatchObject({
      bookingReference: "TESTIT",
      contactEmail: "test@example.com",
      userId: "user-abc",
      _id: expect.any(String),
    });
    // timeToQuery is serialised to an ISO string in the JSON response and is
    // exactly 3 hours before the first flight's scheduledDeparture
    expect(typeof res.body.data.timeToQuery).toBe("string");
    const expectedTimeToQuery =
      new Date(validItinerary.flights[0].scheduledDeparture).getTime() -
      3 * 60 * 60 * 1000;
    expect(new Date(res.body.data.timeToQuery).getTime()).toBe(
      expectedTimeToQuery
    );
  });

  it("returns 400 when the x-user-id header is missing", async () => {
    const res = await request(app)
      .post("/flights/itinerary")
      .send(validItinerary)
      .expect(400);

    expect(res.body.message).toBe("Missing or invalid x-user-id header");
  });

  it("returns 400 when the x-user-id header is blank", async () => {
    const res = await request(app)
      .post("/flights/itinerary")
      .set("x-user-id", "   ")
      .send(validItinerary)
      .expect(400);

    expect(res.body.message).toBe("Missing or invalid x-user-id header");
  });

  it("returns 400 when the payload is missing required fields", async () => {
    const res = await request(app)
      .post("/flights/itinerary")
      .set("x-user-id", "user-abc")
      .send({ bookingReference: "INCOMPLETE" })
      .expect(400);

    expect(res.body.message).toBe("Invalid itinerary payload");
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("returns 400 when scheduledArrival is before scheduledDeparture", async () => {
    const badItinerary = {
      ...validItinerary,
      flights: [
        {
          ...validItinerary.flights[0],
          scheduledDeparture: "2024-06-01T11:00:00Z",
          scheduledArrival: "2024-06-01T08:00:00Z",
        },
      ],
    };

    const res = await request(app)
      .post("/flights/itinerary")
      .set("x-user-id", "user-abc")
      .send(badItinerary)
      .expect(400);

    expect(res.body.message).toBe("Invalid itinerary payload");
  });

  it("each itinerary is assigned a unique _id", async () => {
    const [res1, res2] = await Promise.all([
      request(app)
        .post("/flights/itinerary")
        .set("x-user-id", "user-abc")
        .send(validItinerary),
      request(app)
        .post("/flights/itinerary")
        .set("x-user-id", "user-abc")
        .send(validItinerary),
    ]);

    expect(res1.body.data._id).not.toBe(res2.body.data._id);
  });
});

// ─── Health check (sanity) ────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with service name", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toEqual({ status: "ok", service: "flightdad-backend" });
  });
});
