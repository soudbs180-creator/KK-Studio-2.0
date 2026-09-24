/**
 * 本地长期记忆（用户级）模块入口。
 *
 * 隐私约束：记忆仅存本地、按身份隔离、不上云；采集与注入默认关闭。
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
export { createMemoryStorage } from "./storage.ts";
export type { MemoryStorage } from "./storage.ts";

/** 全局记忆服务单例（开关默认关闭）。 */
export const memoryService = new MemoryService({
  storage: createMemoryStorage(),
});
