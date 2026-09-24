/**
 * 模型上下文窗口：`model[1M]` 后缀解析与 cc-switch 兼容 catalog 生成。
 *
 * 设计对齐 CodexPlusPlus docs/specs/2026-06-23-model-catalog-prototype-design.md
 * 与 cc-switch model_catalog 字段形态（参考思路，不复制代码）：
 * - 后缀语法：`slug[1M]` / `[200K]` / `[512k]` / `[1000000]`，单位 K/k=1000、M/m=1_000_000
 * - 生成时剥离后缀，slug 不带后缀进入 catalog
 * - 无后缀条目：context_window 留空（回落顶层配置），不生成窗口字段
 * - auto_compact_token_limit = null（codex 内置模型即 null，按比例计算）
 */
import { z } from "zod";

export interface ContextWindowSpec {
  slug: string;
  contextWindow?: number;
}

const WINDOW_SUFFIX = /^(.+?)\[(\d+(?:\.\d+)?)\s*([KkMm])?\]$/;

const UNITS: Record<string, number> = { k: 1000, m: 1_000_000 };

export function parseModelWindow(modelId: string): ContextWindowSpec {
  const trimmed = modelId.trim();
  const match = WINDOW_SUFFIX.exec(trimmed);
  if (!match) return { slug: trimmed };
  const [, slug, raw, unit] = match;
  if (!slug) return { slug: trimmed };
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return { slug: trimmed };
  const scale = unit ? (UNITS[unit.toLowerCase()] ?? 1) : 1;
  const contextWindow = Math.floor(value * scale);
  if (contextWindow <= 0) return { slug: trimmed };
  return { slug, contextWindow };
}

export const catalogModelEntrySchema = z.object({
  slug: z.string().min(1).max(120),
  display_name: z.string().min(1).max(120),
  context_window: z.number().int().positive().optional(),
  max_context_window: z.number().int().positive().optional(),
  auto_compact_token_limit: z.null().optional(),
  priority: z.number().int().nonnegative().optional(),
});
export type CatalogModelEntry = z.infer<typeof catalogModelEntrySchema>;

export interface CatalogModelInput {
  model: string;
  displayName?: string;
  priority?: number;
}

export function buildModelCatalog(
  inputs: CatalogModelInput[],
): CatalogModelEntry[] {
  return inputs.map((input) => {
    const { slug, contextWindow } = parseModelWindow(input.model);
    const entry: CatalogModelEntry = {
      slug,
      display_name: input.displayName?.trim().slice(0, 120) || slug,
      auto_compact_token_limit: null,
    };
    if (contextWindow !== undefined) {
      entry.context_window = contextWindow;
      entry.max_context_window = contextWindow;
    }
    if (input.priority !== undefined) entry.priority = input.priority;
    return catalogModelEntrySchema.parse(entry);
  });
}

/** 生成 model-catalogs/<profileId>.json 的 payload 与相对路径指针。 */
export function renderModelCatalogJson(
  profileId: string,
  inputs: CatalogModelInput[],
): { path: string; json: string } {
  const entries = buildModelCatalog(inputs);
  return {
    path: `model-catalogs/${profileId}.json`,
    json: JSON.stringify(entries, null, 2),
  };
}
