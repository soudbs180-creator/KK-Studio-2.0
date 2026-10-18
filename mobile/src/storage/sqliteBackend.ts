import type { SnapshotBackend } from "./ports.ts";
import { invariant, parseSnapshot } from "./validation.ts";
import type { StorageValidationPolicy } from "./schemaPrimitives.ts";

export interface SqliteConnection {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<T | null>;
  runAsync(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<{ changes: number }>;
}
/** Single parameterized SQL statements make CAS atomic across database connections. */
export class SqliteSnapshotBackend implements SnapshotBackend {
  private readonly database: SqliteConnection;
  private readonly policy: StorageValidationPolicy;
  constructor(
    database: SqliteConnection,
    policy: StorageValidationPolicy = {},
  ) {
    this.database = database;
    this.policy = { allowLoopbackHttp: policy.allowLoopbackHttp === true };
  }
  async initialize(): Promise<void> {
    await this.database.execAsync(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS mobile_snapshots (account TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL);",
    );
  }
  async read(accountId: string): Promise<string | null> {
    const row = await this.database.getFirstAsync<{
      revision: number;
      payload: string;
    }>(
      "SELECT revision,payload FROM mobile_snapshots WHERE account=?",
      accountId,
    );
    if (!row) return null;
    invariant(
      typeof row.payload === "string" &&
        parseSnapshot(row.payload, this.policy).revision === row.revision,
      "Corrupt SQLite revision",
    );
    return row.payload;
  }
  async compareAndSwap(
    accountId: string,
    expectedRevision: number | null,
    payload: string,
  ): Promise<boolean> {
    const next = parseSnapshot(payload, this.policy);
    invariant(
      next.revision === (expectedRevision === null ? 0 : expectedRevision + 1),
      "Invalid CAS revision",
    );
    const result =
      expectedRevision === null
        ? await this.database.runAsync(
            "INSERT OR IGNORE INTO mobile_snapshots (account,revision,payload) VALUES (?,?,?)",
            accountId,
            next.revision,
            payload,
          )
        : await this.database.runAsync(
            "UPDATE mobile_snapshots SET revision=?,payload=? WHERE account=? AND revision=?",
            next.revision,
            payload,
            accountId,
            expectedRevision,
          );
    return result.changes === 1;
  }
}
