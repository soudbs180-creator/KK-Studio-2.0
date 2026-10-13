import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems";
import { cardLayout, type CanvasConnection } from "../../domain/canvasGraph";
import type { Point } from "../../domain/canvasViewport";

export function canvasOccupiedRects(
  items: CanvasCollectionItem[],
  nodes: Record<string, Point>,
): { x: number; y: number; width: number; height: number }[] {
  return items.flatMap((item) => {
    const point = nodes[item.id];
    if (!point) return [];
    const layout = cardLayout(item);
    return [
      {
        x: point.x + layout.left,
        y: point.y,
        width: layout.width,
        height: layout.height,
      },
    ];
  });
}

/** Reference edges share the same source metadata as uploaded references. */
export function canvasReferencesFor(
  items: CanvasCollectionItem[],
  edges: CanvasConnection[],
  parentId: string,
): CanvasReference[] {
  return edges
    .filter((edge) => edge.target === parentId && edge.kind !== "result")
    .map((edge) => ({
      edge,
      source: items.find((item) => item.id === edge.source),
    }))
    .filter(
      (
        entry,
      ): entry is { edge: CanvasConnection; source: CanvasCollectionItem } =>
        entry.source?.kind === "image",
    )
    .map(({ edge, source }) => ({
      id: edge.id,
      assetId: source.assetId,
      title: source.title,
      preview: source.preview ?? source.result?.poster ?? source.result?.src,
      slot: source.referenceSlot,
    }));
}
