/**
 * 记忆规则采集：从对话消息中抽取用户稳定偏好/习惯/约束。
 *
 * 设计说明（参考 ai_group_chat 的规则降级路径简化）：
 * - 纯本地执行，不把记忆内容发送给任何云端模型（用户隐私约束）；
 * - 命中触发词后取整句作为记忆候选，指纹去重；
 * - 为纯函数设计，便于单元测试。
 */
import { MEMORY_CONTENT_MAX_LENGTH, type MemoryType } from "./types.ts";

export interface MemoryCandidate {
  content: string;
  memoryType: MemoryType;
  confidence: number;
}

/** 用户消息触发词：命中即认为该句表达了稳定偏好/约束。 */
const USER_TRIGGERS = [
  "喜欢",
  "偏好",
  "习惯",
  "请用",
  "尽量",
  "以后",
  "平时",
  "希望",
  "不要",
  "别",
  "务必",
  "记住",
  "记得",
  "每次",
  "常用",
  "只用",
] as const;

/** assistant 消息中的偏好结论触发词（仅当模型明确总结用户偏好时）。 */
const ASSISTANT_TRIGGERS = [
  "你的偏好",
  "用户偏好",
  "已记住",
  "以后会",
] as const;

/** 低价值短句/寒暄：命中则不采集。 */
const LOW_VALUE_PATTERNS = [
  "你好",
  "您好",
  "谢谢",
  "感谢",
  "哈哈",
  "嗯嗯",
  "好的",
  "收到",
  "没问题",
  "再见",
  "拜拜",
] as const;

const CONSTRAINT_WORDS = [
  "不要",
  "别",
  "务必",
  "禁止",
  "避免",
  "一定",
] as const;
const HABIT_WORDS = ["每次", "习惯", "平时", "常用", "一直", "总是"] as const;
const STRONG_WORDS = ["不要", "别", "务必", "记住", "记得", "以后"] as const;

/** 弱触发词（assistant 结论等）基础置信度。 */
const BASE_CONFIDENCE_USER = 0.7;
const BASE_CONFIDENCE_ASSISTANT = 0.6;

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？!?\n；;]+/)
    .map((part) => part.trim())
    .filter(
      (part) => part.length >= 4 && part.length <= MEMORY_CONTENT_MAX_LENGTH,
    );
}

function isLowValue(content: string): boolean {
  // 仅当句子本身很短（接近纯寒暄）时才过滤，避免长句中的"好的"等误伤。
  if (content.length > 12) {
    return false;
  }
  return LOW_VALUE_PATTERNS.some((pattern) => content.includes(pattern));
}

function inferMemoryType(content: string): MemoryType {
  if (CONSTRAINT_WORDS.some((word) => content.includes(word))) {
    return "user_constraint";
  }
  if (HABIT_WORDS.some((word) => content.includes(word))) {
    return "user_habit";
  }
  if (
    ["喜欢", "偏好", "希望", "请用", "以后", "只用", "尽量", "平时"].some(
      (word) => content.includes(word),
    )
  ) {
    return "user_preference";
  }
  return "user_profile";
}

function inferConfidence(content: string, base: number): number {
  if (STRONG_WORDS.some((word) => content.includes(word))) {
    return Math.min(base + 0.2, 0.95);
  }
  return base;
}

export type MessageRole = "user" | "assistant";

/**
 * 从一条消息中抽取记忆候选。返回空数组表示本条无可采集内容。
 */
export function extractMemoryCandidates(
  message: string,
  role: MessageRole,
): MemoryCandidate[] {
  if (!message || message.length < 4) {
    return [];
  }
  const triggers = role === "user" ? USER_TRIGGERS : ASSISTANT_TRIGGERS;
  const base =
    role === "user" ? BASE_CONFIDENCE_USER : BASE_CONFIDENCE_ASSISTANT;
  const candidates: MemoryCandidate[] = [];
  for (const sentence of splitSentences(message)) {
    if (isLowValue(sentence)) {
      continue;
    }
    const hit = triggers.some((trigger) => sentence.includes(trigger));
    if (!hit) {
      continue;
    }
    candidates.push({
      content: sentence,
      memoryType: inferMemoryType(sentence),
      confidence: inferConfidence(sentence, base),
    });
  }
  return candidates;
}

/** 归一化内容用于指纹去重：去空白、去标点、转小写。 */
export function normalizeContent(content: string): string {
  return content
    .replace(/[\s\u3000]+/g, "")
    .replace(/[，。！？、；：""''（）《》【】,.!?;:()[\]{}<>]/g, "")
    .toLowerCase();
}

/**
 * 计算内容指纹（sha256，hex）。
 * 使用 Web Crypto；Node 20+/现代浏览器均可用。
 */
export async function fingerprintFor(content: string): Promise<string> {
  const normalized = normalizeContent(content);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
