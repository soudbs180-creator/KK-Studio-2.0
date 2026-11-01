import {
  comfyOutputSourceId,
  type CanvasCollectionItem,
} from "../../domain/canvasItems.ts";

export function resolveWorkflowSource(
  item: CanvasCollectionItem,
  items: readonly CanvasCollectionItem[],
): CanvasCollectionItem | undefined {
  if (item.kind !== "image") return undefined;
  const sourceId = item.comfyWorkflowSourceId ?? comfyOutputSourceId(item);
  return sourceId
    ? items.find((candidate) => candidate.id === sourceId)
    : undefined;
}
