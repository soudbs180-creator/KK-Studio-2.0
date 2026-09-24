/**
 * 本地长期记忆（用户级）类型定义。
 *
 * 共享语义（TASK-MEMORY-002，用户决策覆盖 TASK-MEMORY-001 的隔离语义）：
 * - 记忆是本机共享的：Codex（KK Studio 桌面/Web）、豆包（Agent 环境）、
 *   WorkBuddy 等本机产品读写同一份共享文件 `~/.kk-memory/memory.json`；
 * - 不再按"记忆身份键"（namespace）隔离；换账号/换人时用户手动清空；
 * - 记忆文件仅存本地，不进入 WebDAV 同步、localStorage、日志或导出包；
 *   用户开启记忆后，选中的相关片段会发送给当前模型用于本轮推理。
 */

export type MemoryType =
  "user_profile" | "user_preference" | "user_habit" | "user_constraint";

export type MemorySource = "auto_rule" | "manual_codex" | "manual_user";

export interface MemoryRecord {
  id: string;
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
  /** 兼容旧文件字段（隔离版遗留），共享模式恒为空字符串。 */
  namespace?: string;
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
