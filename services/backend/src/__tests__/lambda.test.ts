/**
 * Unit tests for the unified Lambda handler in src/lambda.ts.
 *
 * These tests verify that:
 *   - EventBridge Scheduler events are routed to the itinerary worker
 *   - API Gateway events are forwarded to the Express adapter
 *   - The handler never confuses the two event types
 */

import type { Context } from "aws-lambda";
import type { ItineraryWorkerService } from "../services/ItineraryWorkerService";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock @vendia/serverless-express before importing the handler so the module
// under test picks up the mock on first load.
const mockApiHandler = jest.fn().mockResolvedValue({ statusCode: 200 });
jest.mock("@vendia/serverless-express", () => ({
  __esModule: true,
  default: jest.fn(() => mockApiHandler),
}));

// Mock ItineraryWorkerService so worker.runOnce() doesn't touch a real DB.
const mockRunOnce = jest.fn().mockResolvedValue([]);
jest.mock("../services/ItineraryWorkerService", () => ({
  ItineraryWorkerService: jest.fn().mockImplementation(() => ({
    runOnce: mockRunOnce,
  })),
}));

// Import the handler *after* mocks are in place.
import { handler } from "../lambda";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fakeContext = {} as Context;

/** A minimal EventBridge Scheduler event (with the custom source we agreed on). */
const schedulerEvent = { source: "flightdad-scheduler" as const };

/** A minimal API Gateway v1 proxy event. */
const apiGatewayEvent = {
  httpMethod: "GET",
  path: "/health",
  headers: {},
  queryStringParameters: null,
  body: null,
  isBase64Encoded: false,
  requestContext: {} as never,
  resource: "/health",
  pathParameters: null,
  stageVariables: null,
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Lambda handler (lambda-lith)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Scheduler routing ──────────────────────────────────────────────────────

  it("calls worker.runOnce() for a scheduler event", async () => {
    await handler(schedulerEvent, fakeContext);

    expect(mockRunOnce).toHaveBeenCalledTimes(1);
  });

  it("does NOT call the API handler for a scheduler event", async () => {
    await handler(schedulerEvent, fakeContext);

    expect(mockApiHandler).not.toHaveBeenCalled();
  });

  it("returns { success: true } for a scheduler event", async () => {
    const result = await handler(schedulerEvent, fakeContext);

    expect(result).toEqual({ success: true });
  });

  // ── API Gateway routing ───────────────────────────────────────────────────

  it("calls the API handler for an API Gateway event", async () => {
    await handler(apiGatewayEvent as never, fakeContext);

    expect(mockApiHandler).toHaveBeenCalledTimes(1);
  });

  it("does NOT call worker.runOnce() for an API Gateway event", async () => {
    await handler(apiGatewayEvent as never, fakeContext);

    expect(mockRunOnce).not.toHaveBeenCalled();
  });

  it("forwards the event and context to the API handler", async () => {
    await handler(apiGatewayEvent as never, fakeContext);

    expect(mockApiHandler).toHaveBeenCalledWith(apiGatewayEvent, fakeContext);
  });

  it("returns the API handler response for an API Gateway event", async () => {
    mockApiHandler.mockResolvedValueOnce({ statusCode: 200, body: "ok" });

    const result = await handler(apiGatewayEvent as never, fakeContext);

    expect(result).toEqual({ statusCode: 200, body: "ok" });
  });

  // ── Event discrimination ───────────────────────────────────────────────────

  it("routes an event without 'source' to the API handler", async () => {
    const unknownEvent = { httpMethod: "POST", path: "/checkin" } as never;

    await handler(unknownEvent, fakeContext);

    expect(mockApiHandler).toHaveBeenCalledTimes(1);
    expect(mockRunOnce).not.toHaveBeenCalled();
  });

  it("routes an event with a different source to the API handler", async () => {
    const otherEvent = { source: "aws.s3", bucket: "my-bucket" } as never;

    await handler(otherEvent, fakeContext);

    expect(mockApiHandler).toHaveBeenCalledTimes(1);
    expect(mockRunOnce).not.toHaveBeenCalled();
  });
});
