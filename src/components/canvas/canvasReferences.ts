import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems.ts";
import { cardLayout, type CanvasConnection } from "../../domain/canvasGraph.ts";
import type { Point } from "../../domain/canvasViewport.ts";

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
        entry.source?.kind === "image" ||
        entry.source?.kind === "video" ||
        entry.source?.kind === "audio",
    )
    .map(({ edge, source }) => ({
      id: edge.id,
      assetId: source.assetId,
      title: source.title,
      preview: source.preview ?? source.result?.poster ?? source.result?.src,
      kind: source.kind,
      frame: source.referenceFrame,
      slot: source.referenceSlot,
    }));
}

/** Swap only the two video source nodes; connector ids and edge order stay untouched. */
export function swapReferenceFrames(
  items: CanvasCollectionItem[],
  edges: CanvasConnection[],
  firstReferenceId: string,
  lastReferenceId: string,
): CanvasCollectionItem[] {
  const firstSource = edges.find(
    (edge) => edge.id === firstReferenceId,
  )?.source;
  const lastSource = edges.find((edge) => edge.id === lastReferenceId)?.source;
  if (!firstSource || !lastSource || firstSource === lastSource) return items;
  return items.map((item) =>
    item.id === firstSource
      ? { ...item, referenceFrame: "last", updatedAt: Date.now() }
      : item.id === lastSource
        ? { ...item, referenceFrame: "first", updatedAt: Date.now() }
        : item,
  );
}
