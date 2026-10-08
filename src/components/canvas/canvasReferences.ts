import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";

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
