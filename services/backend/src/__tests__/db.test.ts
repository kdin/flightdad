/**
 * Unit tests for InMemoryDatabase.
 *
 * Verifies that the in-memory document store correctly implements the
 * Collection<T> interface used throughout the backend.
 */

import { InMemoryDatabase } from "../db/InMemoryDatabase";

interface TestDoc {
  name: string;
  value: number;
}

describe("InMemoryDatabase", () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    // Each test gets a fresh database instance — no shared state.
    db = new InMemoryDatabase();
  });

  // ─── collection() ──────────────────────────────────────────────────────────

  it("returns the same collection instance for the same name", () => {
    const c1 = db.collection<TestDoc>("items");
    const c2 = db.collection<TestDoc>("items");
    expect(c1).toBe(c2);
  });

  it("returns different collection instances for different names", () => {
    const c1 = db.collection<TestDoc>("alpha");
    const c2 = db.collection<TestDoc>("beta");
    expect(c1).not.toBe(c2);
  });

  // ─── insert() ──────────────────────────────────────────────────────────────

  it("insert() persists a document and returns it with an _id", async () => {
    const col = db.collection<TestDoc>("items");
    const inserted = await col.insert({ name: "foo", value: 42 });

    expect(inserted._id).toBeDefined();
    expect(typeof inserted._id).toBe("string");
    expect(inserted.name).toBe("foo");
    expect(inserted.value).toBe(42);
  });

  it("insert() assigns unique ids to different documents", async () => {
    const col = db.collection<TestDoc>("items");
    const a = await col.insert({ name: "a", value: 1 });
    const b = await col.insert({ name: "b", value: 2 });

    expect(a._id).not.toBe(b._id);
  });

  it("insert() returns a copy, not the original reference", async () => {
    const col = db.collection<TestDoc>("items");
    const original = { name: "x", value: 10 };
    const inserted = await col.insert(original);

    // Mutating the original must not affect the stored document.
    original.value = 999;
    const found = await col.findById(inserted._id);
    expect(found?.value).toBe(10);
  });

  // ─── findById() ────────────────────────────────────────────────────────────

  it("findById() returns the document by id", async () => {
    const col = db.collection<TestDoc>("items");
    const { _id } = await col.insert({ name: "bar", value: 7 });
    const found = await col.findById(_id);

    expect(found).not.toBeNull();
    expect(found?._id).toBe(_id);
    expect(found?.name).toBe("bar");
  });

  it("findById() returns null for unknown ids", async () => {
    const col = db.collection<TestDoc>("items");
    const result = await col.findById("non-existent-id");
    expect(result).toBeNull();
  });

  // ─── find() ────────────────────────────────────────────────────────────────

  it("find() with no query returns all documents", async () => {
    const col = db.collection<TestDoc>("items");
    await col.insert({ name: "a", value: 1 });
    await col.insert({ name: "b", value: 2 });
    await col.insert({ name: "c", value: 3 });

    const all = await col.find();
    expect(all).toHaveLength(3);
  });

  it("find({}) returns all documents", async () => {
    const col = db.collection<TestDoc>("items");
    await col.insert({ name: "a", value: 1 });
    await col.insert({ name: "b", value: 1 });

    const all = await col.find({});
    expect(all).toHaveLength(2);
  });

  it("find() filters documents by a single field", async () => {
    const col = db.collection<TestDoc>("items");
    await col.insert({ name: "match", value: 5 });
    await col.insert({ name: "no-match", value: 5 });
    await col.insert({ name: "match", value: 99 });

    const results = await col.find({ name: "match" });
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.name).toBe("match"));
  });

  it("find() filters documents by multiple fields", async () => {
    const col = db.collection<TestDoc>("items");
    await col.insert({ name: "match", value: 5 });
    await col.insert({ name: "match", value: 99 });

    const results = await col.find({ name: "match", value: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(5);
  });

  it("find() returns an empty array when nothing matches", async () => {
    const col = db.collection<TestDoc>("items");
    await col.insert({ name: "a", value: 1 });

    const results = await col.find({ name: "z" });
    expect(results).toHaveLength(0);
  });

  // ─── update() ──────────────────────────────────────────────────────────────

  it("update() merges fields into an existing document", async () => {
    const col = db.collection<TestDoc>("items");
    const { _id } = await col.insert({ name: "original", value: 1 });

    const updated = await col.update(_id, { value: 100 });
    expect(updated).not.toBeNull();
    expect(updated?._id).toBe(_id);
    expect(updated?.name).toBe("original"); // unchanged
    expect(updated?.value).toBe(100);       // updated
  });

  it("update() persists the change (findById returns updated doc)", async () => {
    const col = db.collection<TestDoc>("items");
    const { _id } = await col.insert({ name: "a", value: 1 });
    await col.update(_id, { value: 42 });

    const found = await col.findById(_id);
    expect(found?.value).toBe(42);
  });

  it("update() returns null for unknown ids", async () => {
    const col = db.collection<TestDoc>("items");
    const result = await col.update("ghost-id", { value: 0 });
    expect(result).toBeNull();
  });

  // ─── delete() ──────────────────────────────────────────────────────────────

  it("delete() removes the document and returns true", async () => {
    const col = db.collection<TestDoc>("items");
    const { _id } = await col.insert({ name: "to-delete", value: 0 });

    const deleted = await col.delete(_id);
    expect(deleted).toBe(true);

    const found = await col.findById(_id);
    expect(found).toBeNull();
  });

  it("delete() returns false for unknown ids", async () => {
    const col = db.collection<TestDoc>("items");
    const result = await col.delete("non-existent");
    expect(result).toBe(false);
  });

  // ─── Isolation ─────────────────────────────────────────────────────────────

  it("documents in different collections are isolated", async () => {
    const users = db.collection<TestDoc>("users");
    const items = db.collection<TestDoc>("items");

    const user = await users.insert({ name: "alice", value: 1 });
    const item = await items.insert({ name: "widget", value: 2 });

    expect(await users.findById(item._id)).toBeNull();
    expect(await items.findById(user._id)).toBeNull();
  });
});
