import { normalizeTags } from "./assets.ts";
export const LEGACY_FAVORITE_TAG = "收藏";

/** Keep the old field and allow one virtual tag alongside 32 real tags. */
export function effectiveTags(
  tags: readonly string[] | undefined,
  favorite: boolean,
): string[] {
  const result = normalizeTags(tags);
  return favorite && !result.includes(LEGACY_FAVORITE_TAG)
    ? [...result, LEGACY_FAVORITE_TAG]
    : result;
}
export function splitCollectionTags(values: readonly string[]): {
  tags: string[];
  favorite: boolean;
} {
  const stored = Array.from(
    new Set(values.filter((tag) => tag !== LEGACY_FAVORITE_TAG)),
  );
  if (stored.length > 32)
    throw new Error("每张卡片最多32个分类标签，请先移除一个标签。");
  if (stored.some((tag) => !tag.trim() || tag.trim().length > 40))
    throw new Error("标签需要1到40个字符。");
  return {
    tags: normalizeTags(stored),
    favorite: values.includes(LEGACY_FAVORITE_TAG),
  };
}
