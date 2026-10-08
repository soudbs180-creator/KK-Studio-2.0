import { type CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { CanvasConnection } from "../../domain/canvasGraph";
import { canvasImageTotalReferenceLimit } from "../../features/models/imageModelCapabilities.ts";
import { imageReferenceCount } from "../../domain/imageReferences.ts";
import { readProviderConnections } from "../../features/creation/providerRegistry.ts";
import type { ModelSelection } from "../../domain/modelSelection.ts";

/** Whether a hovered card can accept the edge that a pointer drag would make. */
export function canConnectTarget(
  items: CanvasCollectionItem[],
  edges: CanvasConnection[],
  sourceId: string,
  targetId: string,
  defaultSelection?: ModelSelection,
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
  const incoming = edges
    .filter((edge) => edge.target === targetId && edge.kind !== "result")
    .map((edge) => items.find((item) => item.id === edge.source))
    .filter((item) => !item || item.kind === "image");
  const limit = canvasImageTotalReferenceLimit(
    target,
    readProviderConnections(),
    defaultSelection,
  );
  return target.kind === "image"
    ? imageReferenceCount(target, [...incoming, source]) <= limit
    : incoming.length < limit;
}
