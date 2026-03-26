/**
 * Database factory.
 *
 * Returns the correct `DocumentDatabase` implementation based on the current
 * configuration.  Only the backend/middleware code imports from this module —
 * the mobile app and shared packages have no access to the database layer.
 *
 * Adding a new backend (e.g. DynamoDB) is a matter of:
 *   1. Implementing the `DocumentDatabase` interface
 *   2. Adding a new case to the `createDatabase` factory below
 *   3. Setting `DB_TYPE=dynamodb` in the production environment
 */

import config from "../config";
import { InMemoryDatabase } from "./InMemoryDatabase";
import type { DocumentDatabase } from "./types";

// ─── Factory ──────────────────────────────────────────────────────────────────

function createDatabase(): DocumentDatabase {
  switch (config.db.type) {
    case "memory":
      return new InMemoryDatabase();

    case "dynamodb":
      // TODO: return new DynamoDBDatabase(config.db.dynamodb);
      throw new Error(
        'DynamoDB backend is not yet implemented. Set DB_TYPE=memory for local dev.'
      );

    default: {
      const _exhaustive: never = config.db.type;
      throw new Error(`Unknown DB_TYPE: ${String(_exhaustive)}`);
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * Application-level database singleton.
 *
 * Use `db.collection<MyType>("my-collection")` anywhere in the backend to
 * get a typed handle to a collection.
 */
const db: DocumentDatabase = createDatabase();

export { createDatabase };
export default db;
