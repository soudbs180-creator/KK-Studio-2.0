/**
 * 本地长期记忆（用户级）类型定义。
 *
 * 隐私约束（用户明确要求）：
 * - 记忆仅存本地（Web: IndexedDB；Desktop: memory/memory.json）；
 * - 按本地身份键（namespace）隔离，不同身份互不可见；
 * - 记忆内容绝不进入 WebDAV 同步、localStorage、日志或导出包。
 */

export type MemoryType =
  "user_profile" | "user_preference" | "user_habit" | "user_constraint";

export type MemorySource = "auto_rule" | "manual_codex" | "manual_user";

export interface MemoryRecord {
  id: string;
  /** 本地记忆身份键：账号隔离边界。不同 namespace 的记忆互不可见。 */
  namespace: string;
  /** 记忆内容（≤200 字）。 */
  content: string;
  memoryType: MemoryType;
  confidence: number;
  /** sha256(归一化 content) 去重。 */
  fingerprint: string;
  source: MemorySource;
  sourceThreadId?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  active: boolean;
}

export interface MemoryStoreFile {
  version: 1;
  namespace: string;
  records: MemoryRecord[];
}

export interface MemorySettings {
  enabled: boolean;
}

/** 单条记忆内容上限（字符）。 */
export const MEMORY_CONTENT_MAX_LENGTH = 200;
/** 记忆条目总数上限。 */
export const MEMORY_RECORDS_MAX = 10_000;
/** 一次检索最多注入的记忆条数。 */
export const MEMORY_INJECT_MAX = 3;
/** 注入块总长上限（字符）。 */
export const MEMORY_INJECT_TOTAL_LIMIT = 400;
/** 自动注入的最低置信度。 */
export const MEMORY_MIN_CONFIDENCE = 0.55;

export const MEMORY_STORE_VERSION = 1 as const;

/** 默认记忆设置：关闭。用户显式开启才会采集与注入。 */
export const DEFAULT_MEMORY_SETTINGS: MemorySettings = { enabled: false };
