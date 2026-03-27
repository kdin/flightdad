/**
 * Unit tests for ItineraryWorkerService.
 *
 * A fresh InMemoryDatabase is injected into every worker instance so that
 * each test starts with an empty collection — no shared state, no ordering
 * dependencies.
 */

import { ItineraryWorkerService } from "../services/ItineraryWorkerService";
import { InMemoryDatabase } from "../db/InMemoryDatabase";
import { NotifyService } from "../services/NotifyService";
import type { ItineraryRecord } from "../schemas/itinerary";
import type { Collection } from "../db/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal valid ItineraryRecord with sensible defaults. */
function makeRecord(
  overrides: Partial<ItineraryRecord> = {}
): ItineraryRecord {
  return {
    bookingReference: "ABC123",
    bookedAt: "2024-01-01T00:00:00Z",
    contactEmail: "test@example.com",
    passengers: [{ firstName: "Jane", lastName: "Doe" }],
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
    userId: "user-1",
    timeToQuery: new Date("2020-01-01T00:00:00Z"), // well in the past → due
    journeyStatus: "PENDING",
    ...overrides,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("ItineraryWorkerService", () => {
  let db: InMemoryDatabase;
  let collection: Collection<ItineraryRecord>;
  let notifyServiceInstance: NotifyService;
  let worker: ItineraryWorkerService;

  beforeEach(() => {
    db = new InMemoryDatabase();
    collection = db.collection<ItineraryRecord>("itineraries");
    notifyServiceInstance = new NotifyService();
    worker = new ItineraryWorkerService(db, notifyServiceInstance);
  });

  afterEach(() => {
    worker.stop();
    jest.restoreAllMocks();
  });

  // ─── runOnce() ──────────────────────────────────────────────────────────────

  it("returns an empty array and logs when there are no records", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await worker.runOnce();

    expect(result).toHaveLength(0);
    expect(spy).toHaveBeenCalledWith(
      "[ItineraryWorker] No due itineraries found."
    );
  });

  it("returns due PENDING records", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await collection.insert(makeRecord({ journeyStatus: "PENDING" }));

    const result = await worker.runOnce();

    expect(result).toHaveLength(1);
    expect(result[0].journeyStatus).toBe("PENDING");
  });

  it("returns due IN-PROGRESS records", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await collection.insert(makeRecord({ journeyStatus: "IN-PROGRESS" }));

    const result = await worker.runOnce();

    expect(result).toHaveLength(1);
    expect(result[0].journeyStatus).toBe("IN-PROGRESS");
  });

  it("returns both PENDING and IN-PROGRESS records in the same pass", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await collection.insert(makeRecord({ journeyStatus: "PENDING" }));
    await collection.insert(makeRecord({ journeyStatus: "IN-PROGRESS" }));

    const result = await worker.runOnce();

    expect(result).toHaveLength(2);
    const statuses = result.map((r) => r.journeyStatus);
    expect(statuses).toContain("PENDING");
    expect(statuses).toContain("IN-PROGRESS");
  });

  it("ignores COMPLETED records", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await collection.insert(makeRecord({ journeyStatus: "COMPLETED" }));

    const result = await worker.runOnce();

    expect(result).toHaveLength(0);
  });

  it("ignores records whose timeToQuery is in the future", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const future = new Date(Date.now() + 60_000);
    await collection.insert(makeRecord({ timeToQuery: future }));

    const result = await worker.runOnce();

    expect(result).toHaveLength(0);
  });

  it("includes records whose timeToQuery equals now (boundary)", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    // A date just before now should always be ≤ now.
    const justPast = new Date(Date.now() - 1);
    await collection.insert(makeRecord({ timeToQuery: justPast }));

    const result = await worker.runOnce();

    expect(result).toHaveLength(1);
  });

  it("logs the count and each record when due records are found", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    await collection.insert(makeRecord());

    await worker.runOnce();

    const logMessages = spy.mock.calls.map((c) => String(c[0]));
    expect(
      logMessages.some((msg) => msg.includes("Found 1 due itinerary"))
    ).toBe(true);
    // The record itself should be printed as JSON.
    expect(
      logMessages.some((msg) => msg.includes("ABC123"))
    ).toBe(true);
  });

  it("returned documents include the _id field assigned by the database", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    await collection.insert(makeRecord());

    const result = await worker.runOnce();

    expect(result[0]._id).toBeDefined();
    expect(typeof result[0]._id).toBe("string");
  });

  // ─── start() / stop() ───────────────────────────────────────────────────────

  it("start() triggers an immediate runOnce call", async () => {
    const spy = jest
      .spyOn(worker, "runOnce")
      .mockResolvedValue([]);
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    worker.start(60_000);
    // Allow the initial async runOnce to be scheduled.
    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("stop() prevents the worker from polling again", () => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const spy = jest
      .spyOn(worker, "runOnce")
      .mockResolvedValue([]);

    worker.start(1_000);
    worker.stop();
    jest.advanceTimersByTime(5_000);

    // Only the initial immediate call should have been made.
    expect(spy).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("calling start() twice does not create duplicate intervals", async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const spy = jest
      .spyOn(worker, "runOnce")
      .mockResolvedValue([]);

    worker.start(1_000);
    worker.start(1_000); // second call is a no-op
    jest.advanceTimersByTime(2_000);
    // Allow microtasks to settle.
    await Promise.resolve();

    // 1 immediate + 2 interval ticks = 3, not 6 (which would happen with 2 intervals).
    expect(spy).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });

  // ─── NotifyService integration ───────────────────────────────────────────────

  it("calls NotifyService.notify with (flightNumber, userId) pairs for due records", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const spy = jest.spyOn(notifyServiceInstance, "notify");

    await collection.insert(makeRecord());

    await worker.runOnce();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith([
      { flightNumber: "AA100", userId: "user-1" },
    ]);
  });

  it("does not call NotifyService.notify when there are no due records", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const spy = jest.spyOn(notifyServiceInstance, "notify");

    await worker.runOnce();

    expect(spy).not.toHaveBeenCalled();
  });

  it("passes one pair per flight leg across all due records", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const spy = jest.spyOn(notifyServiceInstance, "notify");

    const multiLeg = makeRecord({
      userId: "user-multi",
      flights: [
        {
          flightNumber: "AA100",
          airline: "American Airlines",
          origin: { iataCode: "JFK", name: "JFK", city: "New York", country: "US" },
          destination: { iataCode: "ORD", name: "O'Hare", city: "Chicago", country: "US" },
          scheduledDeparture: "2024-06-01T08:00:00Z",
          scheduledArrival: "2024-06-01T10:00:00Z",
          cabinClass: "ECONOMY",
        },
        {
          flightNumber: "AA200",
          airline: "American Airlines",
          origin: { iataCode: "ORD", name: "O'Hare", city: "Chicago", country: "US" },
          destination: { iataCode: "LAX", name: "LAX", city: "Los Angeles", country: "US" },
          scheduledDeparture: "2024-06-01T12:00:00Z",
          scheduledArrival: "2024-06-01T14:00:00Z",
          cabinClass: "ECONOMY",
        },
      ],
    });
    await collection.insert(multiLeg);

    await worker.runOnce();

    expect(spy).toHaveBeenCalledWith([
      { flightNumber: "AA100", userId: "user-multi" },
      { flightNumber: "AA200", userId: "user-multi" },
    ]);
  });
});
