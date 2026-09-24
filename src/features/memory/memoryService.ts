/**
 * 记忆业务编排：开关状态、采集、注入、CRUD、身份管理。
 *
 * 隐私边界：
 * - 记忆内容只经过 MemoryStorage（IndexedDB / memory.json），
 *   设置开关（enabled）是纯布尔标记，可存 localStorage；
 * - 采集与注入全部 try/catch，失败不影响对话主链路。
 */
import {
  extractMemoryCandidates,
  fingerprintFor,
  type MessageRole,
} from "./extractor.ts";
import { formatInjectionBlock, selectMemoryRecords } from "./injector.ts";
import type { MemoryStorage } from "./storage.ts";
import {
  DEFAULT_MEMORY_SETTINGS,
  type MemoryRecord,
  type MemorySettings,
  type MemorySource,
  type MemoryStoreFile,
  MEMORY_RECORDS_MAX,
} from "./types.ts";

const SETTINGS_KEY = "kk.memory.settings";

export interface SettingsStorage {
  read(): MemorySettings;
  write(settings: MemorySettings): void;
}

const localStorageSettings: SettingsStorage = {
  read: () => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_MEMORY_SETTINGS };
      }
      const parsed = JSON.parse(raw) as Partial<MemorySettings>;
      return { enabled: parsed.enabled === true };
    } catch {
      return { ...DEFAULT_MEMORY_SETTINGS };
    }
  },
  write: (settings) => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // 设置开关写失败不影响记忆主体功能。
    }
  },
};

export interface MemoryServiceOptions {
  storage: MemoryStorage;
  settings?: SettingsStorage;
  now?: () => Date;
}

export class MemoryService {
  private readonly storage: MemoryStorage;
  private readonly settingsStorage: SettingsStorage;
  private readonly now: () => Date;

  constructor(options: MemoryServiceOptions) {
    this.storage = options.storage;
    this.settingsStorage = options.settings ?? localStorageSettings;
    this.now = options.now ?? (() => new Date());
  }

  /** 记忆开关。默认关闭，用户显式开启才会采集与注入。 */
  isEnabled(): boolean {
    return this.settingsStorage.read().enabled;
  }

  setEnabled(enabled: boolean): void {
    this.settingsStorage.write({ enabled });
  }

  async load(): Promise<MemoryStoreFile> {
    return this.storage.read();
  }

  /** 当前存储模式与共享授权状态（供 UI 展示）。 */
  async storageMode(): Promise<"shared" | "isolated"> {
    return this.storage.mode;
  }

  async storageStatus(): Promise<string> {
    return this.storage.statusText();
  }

  /** 请求授权共享目录（Web 端 File System Access；Desktop 恒成功）。 */
  async authorizeSharedDirectory(): Promise<boolean> {
    return this.storage.authorizeSharedDirectory();
  }

  /**
   * 采集一条消息中的记忆候选（用户/assistant 消息）。
   * 失败静默：绝不让记忆采集影响对话。
   */
  async ingestMessage(
    message: string,
    role: MessageRole,
    sourceThreadId?: string,
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    try {
      const candidates = extractMemoryCandidates(message, role);
      if (candidates.length === 0) {
        return;
      }
      const store = await this.load();
      const timestamp = this.now().toISOString();
      const existing = new Set(
        store.records.map((record) => record.fingerprint),
      );
      const additions: MemoryRecord[] = [];
      for (const candidate of candidates) {
        if (additions.length + store.records.length >= MEMORY_RECORDS_MAX) {
          break;
        }
        const fingerprint = await fingerprintFor(candidate.content);
        if (existing.has(fingerprint)) {
          continue;
        }
        const record: MemoryRecord = {
          id: crypto.randomUUID(),
          content: candidate.content,
          memoryType: candidate.memoryType,
          confidence: candidate.confidence,
          fingerprint,
          source: "auto_rule",
          sourceThreadId,
          createdAt: timestamp,
          updatedAt: timestamp,
          active: true,
        };
        additions.push(record);
        existing.add(fingerprint);
      }
      if (additions.length === 0) {
        return;
      }
      await this.storage.write({
        ...store,
        records: [...store.records, ...additions],
      });
    } catch {
      // 静默：记忆采集失败不影响对话。
    }
  }

  /**
   * 构建对话发送前的 [长期记忆] 注入块。
   * 开关关闭或检索为空时返回空字符串（调用方不注入）。
   */
  async buildInjection(query: string): Promise<string> {
    if (!this.isEnabled()) {
      return "";
    }
    try {
      const store = await this.load();
      const selected = selectMemoryRecords(query, store.records, {
        now: this.now(),
      });
      if (selected.length === 0) {
        return "";
      }
      return formatInjectionBlock(selected);
    } catch {
      return "";
    }
  }

  /** 手动 Codex 提炼：解析回复中的「记忆：」行并入库。返回新增条数。 */
  async saveCodexExtraction(
    reply: string,
    sourceThreadId?: string,
  ): Promise<number> {
    if (!this.isEnabled() || !reply) {
      return 0;
    }
    const candidates: Array<{ content: string; confidence: number }> = [];
    for (const line of reply.split("\n")) {
      const match = /^记忆[:：]\s*(.+)$/.exec(line.trim());
      if (match && match[1].trim().length >= 4) {
        candidates.push({ content: match[1].trim(), confidence: 0.85 });
      }
    }
    if (candidates.length === 0) {
      return 0;
    }
    const store = await this.load();
    const timestamp = this.now().toISOString();
    const existing = new Set(store.records.map((record) => record.fingerprint));
    const additions: MemoryRecord[] = [];
    for (const candidate of candidates) {
      if (additions.length + store.records.length >= MEMORY_RECORDS_MAX) {
        break;
      }
      const fingerprint = await fingerprintFor(candidate.content);
      if (existing.has(fingerprint)) {
        continue;
      }
      additions.push({
        id: crypto.randomUUID(),
        content: candidate.content,
        memoryType: inferTypeFromText(candidate.content),
        confidence: candidate.confidence,
        fingerprint,
        source: "manual_codex",
        sourceThreadId,
        createdAt: timestamp,
        updatedAt: timestamp,
        active: true,
      });
      existing.add(fingerprint);
    }
    if (additions.length === 0) {
      return 0;
    }
    await this.storage.write({
      ...store,
      records: [...store.records, ...additions],
    });
    return additions.length;
  }

  /** 删除单条记忆。 */
  async deleteRecord(id: string): Promise<MemoryStoreFile> {
    const store = await this.load();
    const next = {
      ...store,
      records: store.records.filter((record) => record.id !== id),
    };
    await this.storage.write(next);
    return next;
  }

  /** 清空本机共享记忆的全部条目（保留文件结构）。 */
  async clearAll(): Promise<MemoryStoreFile> {
    const store = await this.load();
    const next = { ...store, records: [] };
    await this.storage.write(next);
    return next;
  }

  /** 重置共享记忆文件：重建空文件；旧文件由存储层保留（.previous-*.json）。 */
  async resetIdentity(): Promise<MemoryStoreFile> {
    return this.storage.resetIdentity();
  }
}

function inferTypeFromText(content: string): MemoryRecord["memoryType"] {
  if (/不要|别|务必|禁止|避免|一定/.test(content)) {
    return "user_constraint";
  }
  if (/每次|习惯|平时|常用|一直|总是/.test(content)) {
    return "user_habit";
  }
  if (/喜欢|偏好|希望/.test(content)) {
    return "user_preference";
  }
  return "user_profile";
}

export type { MemorySource };
