import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";

export interface CompareImage {
  id: string;
  title: string;
  src: string;
  source: "local" | "demo" | "provider";
  model?: string;
}

export function compareImage(item: CanvasCollectionItem): CompareImage | null {
  if (
    item.kind !== "image" ||
    item.plugin ||
    item.generationStatus === "pending" ||
    item.generationStatus === "error"
  )
    return null;
  const src = item.result?.src || item.preview;
  if (!src) return null;
  return {
    id: item.id,
    title: item.title,
    src,
    source: item.result?.source ?? "local",
    model: item.result?.source === "provider" ? item.model : undefined,
  };
}

export function reconcileCompareSelection(
  ids: readonly string[],
  items: readonly CanvasCollectionItem[],
): string[] {
  const valid = new Set(items.filter(compareImage).map((item) => item.id));
  return [...new Set(ids)].filter((id) => valid.has(id)).slice(0, 4);
}

export function toggleCompareSelection(
  ids: readonly string[],
  targetId: string,
  items: readonly CanvasCollectionItem[],
): string[] {
  const selected = reconcileCompareSelection(ids, items);
  if (selected.includes(targetId))
    return selected.filter((id) => id !== targetId);
  if (
    selected.length >= 4 ||
    !items.some((item) => item.id === targetId && compareImage(item))
  )
    return selected;
  return [...selected, targetId];
}
