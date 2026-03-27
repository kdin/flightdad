/**
 * Integration tests for POST /notify.
 *
 * Uses supertest to exercise the full Express middleware stack.
 */

import request from "supertest";
import app from "../index";
import { notifyService } from "../services/NotifyService";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validPairs = [
  { flightNumber: "AA100", userId: "user-1" },
  { flightNumber: "BA202", userId: "user-2" },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /notify", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 and the count when given a valid list of pairs", async () => {
    jest.spyOn(notifyService, "notify").mockImplementation(() => undefined);

    const res = await request(app)
      .post("/notify")
      .send(validPairs)
      .expect(200);

    expect(res.body.message).toBe("Notifications received");
    expect(res.body.count).toBe(2);
  });

  it("calls NotifyService.notify with the validated pairs", async () => {
    const spy = jest.spyOn(notifyService, "notify").mockImplementation(() => undefined);

    await request(app).post("/notify").send(validPairs).expect(200);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(validPairs);
  });

  it("returns 400 when the body is not an array", async () => {
    const res = await request(app)
      .post("/notify")
      .send({ flightNumber: "AA100", userId: "user-1" })
      .expect(400);

    expect(res.body.message).toBe("Invalid notify payload");
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("returns 400 when the array is empty", async () => {
    const res = await request(app)
      .post("/notify")
      .send([])
      .expect(400);

    expect(res.body.message).toBe("Invalid notify payload");
  });

  it("returns 400 when a pair is missing flightNumber", async () => {
    const res = await request(app)
      .post("/notify")
      .send([{ userId: "user-1" }])
      .expect(400);

    expect(res.body.message).toBe("Invalid notify payload");
    expect(res.body.errors.some((e: { path: string }) => e.path.includes("flightNumber"))).toBe(true);
  });

  it("returns 400 when a pair is missing userId", async () => {
    const res = await request(app)
      .post("/notify")
      .send([{ flightNumber: "AA100" }])
      .expect(400);

    expect(res.body.message).toBe("Invalid notify payload");
    expect(res.body.errors.some((e: { path: string }) => e.path.includes("userId"))).toBe(true);
  });

  it("accepts a single-element list", async () => {
    jest.spyOn(notifyService, "notify").mockImplementation(() => undefined);

    const res = await request(app)
      .post("/notify")
      .send([{ flightNumber: "UA303", userId: "user-3" }])
      .expect(200);

    expect(res.body.count).toBe(1);
  });
});
