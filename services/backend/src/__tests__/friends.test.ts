/**
 * Integration tests for the /friends routes.
 *
 * Verifies GET/POST/DELETE operations on the user-friends table using the
 * full Express middleware stack via supertest.
 *
 * Each test generates unique user IDs to avoid cross-test interference
 * with the shared in-memory database singleton.
 */

import request from "supertest";
import app from "../index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _counter = 0;
/** Return a unique user ID so tests don't share state. */
function uid(label: string): string {
  return `${label}-${++_counter}`;
}

// ─── GET /friends ─────────────────────────────────────────────────────────────

describe("GET /friends", () => {
  it("returns 400 when x-user-id header is missing", async () => {
    const res = await request(app).get("/friends").expect(400);
    expect(res.body.message).toBe("Missing or invalid x-user-id header");
  });

  it("returns 400 when x-user-id header is blank", async () => {
    const res = await request(app)
      .get("/friends")
      .set("x-user-id", "   ")
      .expect(400);
    expect(res.body.message).toBe("Missing or invalid x-user-id header");
  });

  it("returns an empty friendIds list for a new user", async () => {
    const userA = uid("alice");
    const res = await request(app)
      .get("/friends")
      .set("x-user-id", userA)
      .expect(200);

    expect(res.body.userId).toBe(userA);
    expect(res.body.friendIds).toEqual([]);
  });
});

// ─── POST /friends/:friendId ──────────────────────────────────────────────────

describe("POST /friends/:friendId", () => {
  it("returns 400 when x-user-id header is missing", async () => {
    const res = await request(app)
      .post(`/friends/${uid("bob")}`)
      .expect(400);
    expect(res.body.message).toBe("Missing or invalid x-user-id header");
  });

  it("returns 400 when a user tries to add themselves as a friend", async () => {
    const userA = uid("alice");
    const res = await request(app)
      .post(`/friends/${userA}`)
      .set("x-user-id", userA)
      .expect(400);
    expect(res.body.message).toBe("A user cannot be their own friend");
  });

  it("adds a friend and returns 201 with the updated list", async () => {
    const userA = uid("alice");
    const userB = uid("bob");
    const res = await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(201);

    expect(res.body.userId).toBe(userA);
    expect(res.body.friendIds).toContain(userB);
  });

  it("adds multiple friends and all are present in the list", async () => {
    const userA = uid("alice");
    const userB = uid("bob");
    const userC = uid("carol");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(201);

    const res = await request(app)
      .post(`/friends/${userC}`)
      .set("x-user-id", userA)
      .expect(201);

    expect(res.body.friendIds).toContain(userB);
    expect(res.body.friendIds).toContain(userC);
  });

  it("returns 409 when the friend is already in the list", async () => {
    const userA = uid("alice");
    const userB = uid("bob");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(201);

    const res = await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(409);

    expect(res.body.message).toBe("Friend already added");
  });

  it("the friendship is not symmetric — adding B as a friend of A does not add A to B's list", async () => {
    const userA = uid("alice");
    const userB = uid("bob");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA);

    const res = await request(app)
      .get("/friends")
      .set("x-user-id", userB)
      .expect(200);

    expect(res.body.friendIds).not.toContain(userA);
  });
});

// ─── DELETE /friends/:friendId ────────────────────────────────────────────────

describe("DELETE /friends/:friendId", () => {
  it("returns 400 when x-user-id header is missing", async () => {
    const res = await request(app)
      .delete(`/friends/${uid("bob")}`)
      .expect(400);
    expect(res.body.message).toBe("Missing or invalid x-user-id header");
  });

  it("returns 404 when the friend is not in the list", async () => {
    const userA = uid("alice");
    const userB = uid("bob");
    const res = await request(app)
      .delete(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(404);
    expect(res.body.message).toBe("Friend not found");
  });

  it("removes an existing friend and returns the updated list", async () => {
    const userA = uid("alice");
    const userB = uid("bob");
    const userC = uid("carol");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA);
    await request(app)
      .post(`/friends/${userC}`)
      .set("x-user-id", userA);

    const res = await request(app)
      .delete(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(200);

    expect(res.body.userId).toBe(userA);
    expect(res.body.friendIds).not.toContain(userB);
    expect(res.body.friendIds).toContain(userC);
  });

  it("returns 404 on a second delete of the same friend", async () => {
    const userA = uid("alice");
    const userB = uid("bob");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA);

    await request(app)
      .delete(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(200);

    const res = await request(app)
      .delete(`/friends/${userB}`)
      .set("x-user-id", userA)
      .expect(404);

    expect(res.body.message).toBe("Friend not found");
  });
});

// ─── GET /friends after mutations ────────────────────────────────────────────

describe("GET /friends — reflects mutations", () => {
  it("reflects added friends", async () => {
    const userA = uid("alice");
    const userB = uid("bob");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA);

    const res = await request(app)
      .get("/friends")
      .set("x-user-id", userA)
      .expect(200);

    expect(res.body.friendIds).toContain(userB);
  });

  it("reflects removed friends", async () => {
    const userA = uid("alice");
    const userB = uid("bob");

    await request(app)
      .post(`/friends/${userB}`)
      .set("x-user-id", userA);
    await request(app)
      .delete(`/friends/${userB}`)
      .set("x-user-id", userA);

    const res = await request(app)
      .get("/friends")
      .set("x-user-id", userA)
      .expect(200);

    expect(res.body.friendIds).not.toContain(userB);
  });
});
