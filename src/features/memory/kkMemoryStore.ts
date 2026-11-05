import { lexicalScore } from "./injector.ts";
import { containsSensitiveCredential } from "./extractor.ts";
import { MemoryConflictError, type MemoryStorage } from "./storage.ts";
import {
  MEMORY_STORE_VERSION,
  MEMORY_RECORDS_MAX,
  MEMORY_INJECT_MAX,
  MEMORY_MIN_CONFIDENCE,
  MEMORY_INJECT_TOTAL_LIMIT,
  type MemoryRecord,
  type MemoryStoreFile,
  type MemoryType,
} from "./types.ts";
import {
  createKkMemoryDriver,
  memoryPlatformStorage,
  type KkMemoryDriver,
} from "./kkMemoryDriver.ts";
import {
  emptyStoreV2,
  normalizeStoreV2,
  formatNamespaceKey,
  parseNamespaceKey,
  type MemoryNamespaceScope,
  type MemoryStoreFileV2,
} from "./kkMemorySchema.ts";
export * from "./kkMemorySchema.ts";
export {
  InMemoryMemoryDriver,
  TauriMemoryDriver,
  IndexedDbMemoryDriver,
} from "./kkMemoryDriver.ts";
export type { KkMemoryDriver } from "./kkMemoryDriver.ts";

export interface KkMemoryStoreOptions {
  driver?: KkMemoryDriver;
  defaultNamespace?: string;
  now?: () => Date;
  platform?: MemoryStorage;
}
export interface ScopedMemoryQueryOptions {
  query: string;
  projectId?: string;
  sessionId?: string;
  scopes?: MemoryNamespaceScope[];
  max?: number;
  minConfidence?: number;
  memoryTypes?: MemoryType[];
}

export class KkMemoryStore {
  private readonly driver: KkMemoryDriver;
  private readonly namespace: string;
  private readonly now: () => Date;
  private readonly platform?: MemoryStorage;
  private readonly snapshots = new WeakMap<MemoryStoreFileV2, string | null>();
  constructor(options: KkMemoryStoreOptions = {}) {
    this.driver = options.driver ?? createKkMemoryDriver();
    this.namespace = options.defaultNamespace ?? "global";
    parseNamespaceKey(this.namespace);
    this.now = options.now ?? (() => new Date());
    this.platform =
      options.platform ?? (options.driver ? undefined : memoryPlatformStorage);
  }
  getDriverName() {
    return this.driver.name;
  }
  formatKey = formatNamespaceKey;
  parseKey = parseNamespaceKey;
  listNamespaces() {
    return this.driver.listNamespaces();
  }
  async loadStore(namespace = this.namespace): Promise<MemoryStoreFileV2> {
    parseNamespaceKey(namespace);
    const raw = await this.driver.read(namespace);
    const store =
      raw === null
        ? emptyStoreV2(namespace, this.now().toISOString())
        : normalizeStoreV2(JSON.parse(raw), namespace);
    this.snapshots.set(store, raw);
    return store;
  }
  async saveStore(
    store: MemoryStoreFileV2,
    expected?: MemoryStoreFileV2,
    namespace = store.namespace || this.namespace,
  ): Promise<MemoryStoreFileV2> {
    const previous = expected ?? (await this.loadStore(namespace));
    if (!this.snapshots.has(previous) || previous.namespace !== namespace)
      throw new MemoryConflictError();
    const timestamp = this.now().toISOString();
    const valid = normalizeStoreV2(
      {
        ...store,
        namespace,
        updatedAt: timestamp,
        metadata: {
          ...store.metadata,
          updatedAt: timestamp,
          recordCount: store.records.length,
        },
      },
      namespace,
    );
    if (
      valid.records.some((record) =>
        containsSensitiveCredential(record.content),
      )
    ) {
      throw new Error("记忆不能包含凭据，请移除敏感内容");
    }
    const serialized = JSON.stringify(valid, null, 2);
    await this.driver.write(
      namespace,
      serialized,
      this.snapshots.get(previous)!,
    );
    this.snapshots.set(valid, serialized);
    return valid;
  }
  async resetStore(namespace = this.namespace) {
    const current = await this.loadStore(namespace);
    return this.saveStore(
      emptyStoreV2(namespace, this.now().toISOString()),
      current,
      namespace,
    );
  }
  async addRecord(
    candidate: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt">,
    namespace = this.namespace,
  ): Promise<MemoryRecord> {
    const current = await this.loadStore(namespace);
    const existing = current.records.find(
      (record) => record.fingerprint === candidate.fingerprint,
    );
    if (!existing && current.records.length >= MEMORY_RECORDS_MAX)
      throw new Error("记忆条目已达上限");
    const timestamp = this.now().toISOString();
    const record = {
      ...candidate,
      id: existing?.id ?? `rec_${crypto.randomUUID()}`,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const records = existing
      ? current.records.map((item) => (item.id === existing.id ? record : item))
      : [...current.records, record];
    await this.saveStore({ ...current, records }, current, namespace);
    return record;
  }
  async updateRecord(
    id: string,
    updates: Partial<Omit<MemoryRecord, "id" | "createdAt">>,
    namespace = this.namespace,
  ): Promise<MemoryRecord | null> {
    const current = await this.loadStore(namespace);
    const previous = current.records.find((record) => record.id === id);
    if (!previous) return null;
    const next = {
      ...previous,
      ...updates,
      id,
      createdAt: previous.createdAt,
      updatedAt: this.now().toISOString(),
    };
    await this.saveStore(
      {
        ...current,
        records: current.records.map((record) =>
          record.id === id ? next : record,
        ),
      },
      current,
      namespace,
    );
    return next;
  }
  async deleteRecord(id: string, namespace = this.namespace) {
    const current = await this.loadStore(namespace);
    const records = current.records.filter((record) => record.id !== id);
    if (records.length === current.records.length) return false;
    await this.saveStore({ ...current, records }, current, namespace);
    return true;
  }
  async getRecord(id: string, namespace = this.namespace) {
    return (
      (await this.loadStore(namespace)).records.find(
        (record) => record.id === id,
      ) ?? null
    );
  }
  async queryCascading(
    options: ScopedMemoryQueryOptions,
  ): Promise<MemoryRecord[]> {
    const scopes = options.scopes ?? ["session", "project", "global"];
    const requested: Array<[MemoryNamespaceScope, string | undefined, number]> =
      [
        ["session", options.sessionId, 1],
        ["project", options.projectId, 0.85],
        ["global", undefined, 0.7],
      ];
    const candidates: Array<{ record: MemoryRecord; score: number }> = [];
    for (const [scope, id, weight] of requested) {
      if (!scopes.includes(scope) || (scope !== "global" && !id)) continue;
      const store = await this.loadStore(formatNamespaceKey(scope, id));
      for (const record of store.records) {
        if (
          !record.active ||
          record.confidence <
            (options.minConfidence ?? MEMORY_MIN_CONFIDENCE) ||
          (options.memoryTypes &&
            !options.memoryTypes.includes(record.memoryType)) ||
          containsSensitiveCredential(record.content)
        )
          continue;
        const score = lexicalScore(options.query, record.content) * weight;
        if (score > 0) candidates.push({ record, score });
      }
    }
    candidates.sort(
      (a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id),
    );
    const seen = new Set<string>();
    const selected: MemoryRecord[] = [];
    const max = Math.max(
      0,
      Math.min(MEMORY_INJECT_MAX, Math.floor(options.max ?? MEMORY_INJECT_MAX)),
    );
    let used = 0;
    for (const { record } of candidates) {
      if (selected.length >= max) break;
      if (
        seen.has(record.fingerprint) ||
        used + record.content.length + 2 > MEMORY_INJECT_TOTAL_LIMIT
      )
        continue;
      seen.add(record.fingerprint);
      selected.push(structuredClone(record));
      used += record.content.length + 2;
    }
    return selected;
  }
  asMemoryStorage(namespace = this.namespace): MemoryStorage {
    const snapshots = new WeakMap<MemoryStoreFile, MemoryStoreFileV2>();
    const expose = (store: MemoryStoreFileV2): MemoryStoreFile => {
      const legacy: MemoryStoreFile = {
        version: MEMORY_STORE_VERSION,
        namespace: "",
        records: structuredClone(store.records),
      };
      snapshots.set(legacy, store);
      return legacy;
    };
    return {
      read: async () => expose(await this.loadStore(namespace)),
      write: async (store, expected) => {
        const previous = snapshots.get(expected);
        if (!previous) throw new MemoryConflictError();
        return expose(
          await this.saveStore(
            { ...previous, records: store.records },
            previous,
            namespace,
          ),
        );
      },
      resetIdentity: async () => {
        if (namespace === "global" && this.platform) {
          await this.platform.resetIdentity();
          return expose(await this.loadStore(namespace));
        }
        if (this.driver.resetIdentity) {
          await this.driver.resetIdentity(namespace);
          return expose(await this.loadStore(namespace));
        }
        return expose(await this.resetStore(namespace));
      },
      mode: () => this.platform?.mode() ?? Promise.resolve("isolated"),
      authorizeSharedDirectory: () =>
        this.platform?.authorizeSharedDirectory() ?? Promise.resolve(false),
      leaveSharedDirectory: () =>
        this.platform?.leaveSharedDirectory() ?? Promise.resolve(),
      statusText: () =>
        this.platform?.statusText() ?? Promise.resolve(this.driver.name),
    };
  }
}
export function createKkMemoryStore(options?: KkMemoryStoreOptions) {
  return new KkMemoryStore(options);
}
export const kkMemoryStore = createKkMemoryStore();
