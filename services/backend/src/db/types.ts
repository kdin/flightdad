/**
 * Document database abstraction.
 *
 * These interfaces define a minimal document-store API that mirrors the
 * conceptual model of Amazon DynamoDB so that swapping backends later
 * (local in-memory → DynamoDB) requires only a new implementation, not
 * changes to the calling code.
 *
 * Terminology:
 *   DocumentDatabase  – the top-level database instance (analogous to a DynamoDB client)
 *   Collection<T>     – a named table / container of typed documents
 *   Document<T>       – a stored record: T plus an auto-generated string `_id`
 */

// ─── Core types ───────────────────────────────────────────────────────────────

/** A persisted document: the original shape T plus a generated identifier. */
export type Document<T> = T & { _id: string };

/** A partial document used for simple equality-based queries. */
export type Query<T> = Partial<T>;

// ─── Collection interface ─────────────────────────────────────────────────────

/**
 * Operations on a single named collection of typed documents.
 *
 * All methods are async so that the interface is compatible with remote
 * backends (e.g. DynamoDB) without API changes.
 */
export interface Collection<T extends object> {
  /**
   * Persist a new document.
   * Returns the document with its generated `_id`.
   */
  insert(doc: T): Promise<Document<T>>;

  /**
   * Retrieve a document by its `_id`.
   * Returns `null` if no document with that id exists.
   */
  findById(id: string): Promise<Document<T> | null>;

  /**
   * Return all documents that match every field in `query`.
   * An empty query `{}` returns all documents in the collection.
   */
  find(query?: Query<T>): Promise<Document<T>[]>;

  /**
   * Replace the fields of an existing document (shallow merge).
   * Returns the updated document, or `null` if the id was not found.
   */
  update(id: string, fields: Partial<T>): Promise<Document<T> | null>;

  /**
   * Remove a document by its `_id`.
   * Returns `true` if a document was deleted, `false` otherwise.
   */
  delete(id: string): Promise<boolean>;
}

// ─── Database interface ───────────────────────────────────────────────────────

/**
 * Top-level database instance.
 * Call `collection(name)` to get a typed handle to a specific table.
 */
export interface DocumentDatabase {
  /**
   * Return (or lazily create) the named collection.
   * Repeated calls with the same name return the same collection instance.
   */
  collection<T extends object>(name: string): Collection<T>;
}
