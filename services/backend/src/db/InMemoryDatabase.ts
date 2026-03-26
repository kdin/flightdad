/**
 * InMemoryDatabase — an in-process document store for local development and
 * testing.
 *
 * Uses plain JavaScript Maps for storage so there are no external runtime
 * dependencies.  Data does not persist across process restarts — which is
 * exactly what you want for tests (clean slate every run) and local dev
 * (no setup required).
 *
 * This class implements the `DocumentDatabase` interface so it can be
 * hot-swapped for a DynamoDB-backed implementation without touching the
 * routes or services that consume it.
 */

import { randomUUID } from "crypto";
import type { Collection, Document, DocumentDatabase, Query } from "./types";

// ─── InMemoryCollection ───────────────────────────────────────────────────────

class InMemoryCollection<T extends object> implements Collection<T> {
  private readonly store = new Map<string, Document<T>>();

  async insert(doc: T): Promise<Document<T>> {
    const _id = randomUUID();
    const persisted: Document<T> = { ...doc, _id };
    this.store.set(_id, persisted);
    return { ...persisted };
  }

  async findById(id: string): Promise<Document<T> | null> {
    const doc = this.store.get(id);
    return doc ? { ...doc } : null;
  }

  async find(query: Query<T> = {}): Promise<Document<T>[]> {
    const queryKeys = Object.keys(query) as (keyof T)[];

    const results: Document<T>[] = [];
    for (const doc of this.store.values()) {
      const matches = queryKeys.every(
        (key) => doc[key] === query[key]
      );
      if (matches) {
        results.push({ ...doc });
      }
    }
    return results;
  }

  async update(id: string, fields: Partial<T>): Promise<Document<T> | null> {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: Document<T> = { ...existing, ...fields, _id: id };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /** Return the number of documents in the collection (useful for tests). */
  size(): number {
    return this.store.size;
  }
}

// ─── InMemoryDatabase ─────────────────────────────────────────────────────────

export class InMemoryDatabase implements DocumentDatabase {
  private readonly collections = new Map<string, InMemoryCollection<object>>();

  collection<T extends object>(name: string): Collection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new InMemoryCollection<object>());
    }
    return this.collections.get(name) as InMemoryCollection<T>;
  }
}
