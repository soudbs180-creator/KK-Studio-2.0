import { validMemoryRecord } from "./memoryRecordValidation.ts";
import { MEMORY_RECORDS_MAX } from "./types.ts";
import type { MemoryRecord } from "./types.ts";

export type MemoryNamespaceScope = "global" | "project" | "session";

export interface MemoryNamespaceKey {
  scope: MemoryNamespaceScope;
  id?: string;
}

export const CURRENT_MEMORY_STORE_VERSION = 2 as const;

export interface MemoryStoreMetadata {
  scope: MemoryNamespaceScope;
  scopeId?: string;
  createdAt: string;
  updatedAt: string;
  recordCount: number;
  description?: string;
}

export interface MemoryStoreFileV2 {
  version: typeof CURRENT_MEMORY_STORE_VERSION;
  namespace: string;
  records: MemoryRecord[];
  updatedAt: string;
  metadata: MemoryStoreMetadata;
}

export function formatNamespaceKey(
  scope: MemoryNamespaceScope,
  id?: string,
): string {
  if (scope === "global") {
    return "global";
  }
  if (!id?.trim()) throw new Error("记忆命名空间缺少身份");
  return `${scope}:${id}`;
}

export function parseNamespaceKey(key?: string): MemoryNamespaceKey {
  if (!key || key === "global" || key === "") {
    return { scope: "global" };
  }
  const match = /^(project|session):(.+)$/s.exec(key);
  if (!match || !match[2].trim()) throw new Error("记忆命名空间无效");
  return { scope: match[1] as "project" | "session", id: match[2] };
}

export function emptyStoreV2(
  namespaceKey = "global",
  nowIso = new Date().toISOString(),
): MemoryStoreFileV2 {
  const parsed = parseNamespaceKey(namespaceKey);
  return {
    version: CURRENT_MEMORY_STORE_VERSION,
    namespace: namespaceKey,
    records: [],
    updatedAt: nowIso,
    metadata: {
      scope: parsed.scope,
      scopeId: parsed.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      recordCount: 0,
    },
  };
}

/** Read migration is deterministic; disk migration occurs only during a guarded save. */
export function normalizeStoreV2(
  value: unknown,
  namespace = "global",
): MemoryStoreFileV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("记忆文件格式无效，已保留原数据");
  }
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 && raw.version !== 2) {
    throw new Error("本地记忆版本不支持，已保留原数据");
  }
  const parsed = parseNamespaceKey(namespace);
  // Reuse the existing record validator without accepting a malformed V1 array.
  if (
    !Array.isArray(raw.records) ||
    raw.records.length > MEMORY_RECORDS_MAX ||
    !raw.records.every(validMemoryRecord)
  ) {
    throw new Error("记忆文件格式无效，已保留原数据");
  }
  const records: MemoryRecord[] = structuredClone(raw.records);
  if (raw.version === 1) {
    const timestamp = records.reduce(
      (latest, record) =>
        record.updatedAt > latest ? record.updatedAt : latest,
      "1970-01-01T00:00:00.000Z",
    );
    return {
      ...emptyStoreV2(namespace, timestamp),
      records,
      metadata: {
        ...emptyStoreV2(namespace, timestamp).metadata,
        recordCount: records.length,
      },
    };
  }
  const metadata = raw.metadata as MemoryStoreMetadata | undefined;
  const validDate = (date: unknown) =>
    typeof date === "string" && Number.isFinite(Date.parse(date));
  if (
    raw.namespace !== namespace ||
    !metadata ||
    metadata.scope !== parsed.scope ||
    metadata.scopeId !== parsed.id ||
    metadata.recordCount !== records.length ||
    !validDate(raw.updatedAt) ||
    !validDate(metadata.createdAt) ||
    !validDate(metadata.updatedAt) ||
    (metadata.description !== undefined &&
      typeof metadata.description !== "string")
  ) {
    throw new Error("记忆文件作用域或元数据无效，已保留原数据");
  }
  return structuredClone(raw) as unknown as MemoryStoreFileV2;
}
