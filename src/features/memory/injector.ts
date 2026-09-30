/**
 * 记忆检索注入：发送对话前按词法相关性选取记忆并格式化为 [长期记忆] 块。
 *
 * 参考 ai_group_chat 的 lexical score 与注入格式简化：
 * - 打分 = 字符 bigram 重叠（0.5）+ 关键词 Jaccard（0.5）；
 * - 预算：最多 MEMORY_INJECT_MAX 条、总长 ≤ MEMORY_INJECT_TOTAL_LIMIT；
 * - 注入块插在 KK_INSTRUCTIONS 与用户指令之间（由调用方负责位置）。
 */
import {
  MEMORY_INJECT_MAX,
  MEMORY_INJECT_TOTAL_LIMIT,
  MEMORY_MIN_CONFIDENCE,
  type MemoryRecord,
} from "./types.ts";

const STOP_WORDS = new Set([
  "的",
  "了",
  "是",
  "吗",
  "呢",
  "吧",
  "啊",
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "你们",
  "他们",
  "这",
  "那",
  "和",
  "与",
  "或",
  "在",
  "有",
  "就",
  "都",
  "很",
  "也",
  "要",
  "会",
  "可以",
  "然后",
  "所以",
  "但是",
  "因为",
  "而且",
  "一个",
  "这个",
  "那个",
  "什么",
  "怎么",
  "为什么",
]);

function keywords(text: string): Set<string> {
  const chars = Array.from(text);
  const tokens = new Set<string>();
  // 中文按字符 bigram，英文按词。
  for (let i = 0; i < chars.length - 1; i += 1) {
    const pair = chars[i] + chars[i + 1];
    if (!STOP_WORDS.has(pair)) {
      tokens.add(pair);
    }
  }
  const englishWords = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2);
  for (const word of englishWords) {
    tokens.add(`w:${word}`);
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function bigramOverlap(query: string, content: string): number {
  const queryPairs = new Set(
    Array.from(query)
      .slice(0, -1)
      .map((_, i) => query.slice(i, i + 2)),
  );
  const contentPairs = new Set(
    Array.from(content)
      .slice(0, -1)
      .map((_, i) => content.slice(i, i + 2)),
  );
  return jaccard(queryPairs, contentPairs);
}

/** 词法相关性打分（0~1）。 */
export function lexicalScore(query: string, content: string): number {
  const queryWords = keywords(query);
  const contentWords = keywords(content);
  return (
    bigramOverlap(query, content) * 0.5 +
    jaccard(queryWords, contentWords) * 0.5
  );
}

export interface SelectMemoryOptions {
  max?: number;
  totalLimit?: number;
  minConfidence?: number;
  now?: Date;
}

/**
 * 按词法相关性选取注入的记忆条：过滤 active + 置信度，
 * 排序后裁剪到条数与总长预算。
 */
export function selectMemoryRecords(
  query: string,
  records: MemoryRecord[],
  options: SelectMemoryOptions = {},
): MemoryRecord[] {
  const max = options.max ?? MEMORY_INJECT_MAX;
  const totalLimit = options.totalLimit ?? MEMORY_INJECT_TOTAL_LIMIT;
  const minConfidence = options.minConfidence ?? MEMORY_MIN_CONFIDENCE;
  const now = options.now ?? new Date();

  const candidates = records
    .filter((record) => record.active && record.confidence >= minConfidence)
    .map((record) => ({ record, score: lexicalScore(query, record.content) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected: MemoryRecord[] = [];
  let used = 0;
  for (const entry of candidates) {
    if (selected.length >= max) {
      break;
    }
    const cost = entry.record.content.length + 2;
    if (used + cost > totalLimit) {
      continue;
    }
    selected.push(entry.record);
    used += cost;
    entry.record.lastUsedAt = now.toISOString();
  }
  return selected;
}

function formatDate(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : iso.slice(0, 10);
}

/**
 * 格式化注入块。返回空字符串表示无记忆可注入。
 */
export function formatInjectionBlock(records: MemoryRecord[]): string {
  if (records.length === 0) {
    return "";
  }
  const lines = records.map(
    (record, index) =>
      `- ${index + 1}. [${formatDate(record.createdAt)}] ${record.content}`,
  );
  return [
    "[长期记忆]",
    ...lines,
    "注意：以上为本地记忆背景，与用户本轮明确输入冲突时以本轮输入为准。",
  ].join("\n");
}
