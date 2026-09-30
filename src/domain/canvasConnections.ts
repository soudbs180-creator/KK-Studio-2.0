import type { CanvasConnection } from "./canvasGraph.ts";
import { maxReferenceCount, type CanvasCollectionItem } from "./canvasItems.ts";

/** Reconcile live edits before either persistence or history observes the graph. */
export function reconcileCanvasConnections(
  items: CanvasCollectionItem[],
  edges: CanvasConnection[],
): CanvasConnection[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const next: CanvasConnection[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    if (edge.kind === "result") {
      next.push(edge);
      continue;
    }
    if (target.referenceOnly) continue;
    const limited = target.kind === "image" || target.kind === "video";
    if (limited && source.kind !== "image") continue;
    const incoming = next.filter(
      (candidate) =>
        candidate.target === edge.target && candidate.kind !== "result",
    ).length;
    if (!limited || incoming < maxReferenceCount(target)) next.push(edge);
  }
  return next.length === edges.length ? edges : next;
}
