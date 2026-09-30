/**
 * 本地长期记忆（用户级）模块入口。
 *
 * 共享语义：本机共享（Codex/豆包/WorkBuddy 读同一份 ~/.kk-memory/memory.json），
 * 仅存本地、不上云；采集与注入默认关闭。
 */
import { MemoryService } from "./memoryService.ts";
import { createMemoryStorage } from "./storage.ts";

export * from "./types.ts";
export {
  extractMemoryCandidates,
  fingerprintFor,
  normalizeContent,
} from "./extractor.ts";
export type { MessageRole } from "./extractor.ts";
export {
  lexicalScore,
  selectMemoryRecords,
  formatInjectionBlock,
} from "./injector.ts";
export { MemoryService } from "./memoryService.ts";
export {
  createMemoryStorage,
  KK_MEMORY_DIR_NAME,
  KK_MEMORY_FILE_NAME,
} from "./storage.ts";
export type { MemoryStorage } from "./storage.ts";

/** 全局记忆服务单例（开关默认关闭）。 */
export const memoryService = new MemoryService({
  storage: createMemoryStorage(),
});
