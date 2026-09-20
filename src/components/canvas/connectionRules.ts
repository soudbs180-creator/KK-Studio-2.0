import {
  maxReferenceCount,
  type CanvasCollectionItem,
} from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";

/** Whether a hovered card can accept the edge that a pointer drag would make. */
export function canConnectTarget(
  items: CanvasCollectionItem[],
  edges: CanvasConnection[],
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return false;
  const target = items.find((item) => item.id === targetId);
  if (!target) return true;
  if (target.referenceOnly) return false;
  if (
    edges.some((edge) => edge.source === sourceId && edge.target === targetId)
  )
    return false;
  const source = items.find((item) => item.id === sourceId);
  const limited = target.kind === "image" || target.kind === "video";
  if (limited && source && source.kind !== "image") return false;
  if (!limited) return true;
  const incoming = edges.filter(
    (edge) =>
      edge.target === targetId &&
      edge.kind !== "result" &&
      (items.find((item) => item.id === edge.source)?.kind === "image" ||
        !items.some((item) => item.id === edge.source)),
  ).length;
  return incoming < maxReferenceCount(target);
}
