import { z } from "zod";
import type { CanvasCollectionItem } from "./canvasItems.ts";
import {
  cardLayout,
  INITIAL_CONNECTIONS,
  type CanvasConnection,
} from "./canvasGraph.ts";
import type { Point, ViewTransform } from "./canvasViewport.ts";

export interface ProjectCanvas {
  version: 1;
  positions: Record<string, Point>;
  edges: CanvasConnection[];
  viewport: ViewTransform;
}

/** Object member order differs after native JSON roundtrips; it is not an edit. */
export function projectCanvasFingerprint(canvas?: ProjectCanvas): string {
  if (!canvas) return "";
  return JSON.stringify([
    canvas.version,
    Object.keys(canvas.positions)
      .sort()
      .map((id) => [id, canvas.positions[id].x, canvas.positions[id].y]),
    canvas.edges.map((edge) => [edge.id, edge.source, edge.target, edge.kind]),
    [canvas.viewport.x, canvas.viewport.y, canvas.viewport.scale],
  ]);
}
const initialPositions: Record<string, Point> = {
  image: { x: 82, y: 107 },
  video1: { x: 709, y: 104 },
  video2: { x: 709, y: 397 },
};
const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const graphSchema = z.object({
  version: z.literal(1),
  positions: z.record(z.string(), point),
  edges: z.array(
    z.object({
      id: z.string().min(1).max(160),
      source: z.string(),
      target: z.string(),
      kind: z.enum(["reference", "result"]).optional(),
    }),
  ),
  viewport: point.extend({ scale: z.number().min(0.2).max(4) }),
});
export function createProjectCanvas(
  items: CanvasCollectionItem[],
): ProjectCanvas {
  const ids = new Set(items.map((item) => item.id));
  return {
    version: 1,
    positions: Object.fromEntries(
      items.map((item, index) => [
        item.id,
        initialPositions[item.id]
          ? { ...initialPositions[item.id] }
          : {
              x: 82 + (index % 2) * 650 - cardLayout(item).left,
              y: 107 + Math.floor(index / 2) * 520,
            },
      ]),
    ),
    edges: INITIAL_CONNECTIONS.filter(
      (edge) => ids.has(edge.source) && ids.has(edge.target),
    ).map((edge) => ({ ...edge })),
    viewport: { x: 0, y: 0, scale: 1 },
  };
}
/** For live item changes only. Persisted data is validated, never silently repaired. */
export function reconcileProjectCanvas(
  canvas: ProjectCanvas | undefined,
  items: CanvasCollectionItem[],
): ProjectCanvas {
  const defaults = createProjectCanvas(items);
  if (!canvas) return defaults;
  const ids = new Set(items.map((item) => item.id));
  return {
    ...canvas,
    positions: Object.fromEntries(
      items.map((item) => [
        item.id,
        canvas.positions[item.id] ?? defaults.positions[item.id],
      ]),
    ),
    edges: canvas.edges.filter(
      (edge) => ids.has(edge.source) && ids.has(edge.target),
    ),
  };
}
export function readProjectCanvas(
  value: unknown,
  items: CanvasCollectionItem[],
): ProjectCanvas {
  if (value === undefined) return createProjectCanvas(items);
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version !== 1
  )
    throw new Error("unsupported: 画布版本不受支持，原件已保留。");
  const result = graphSchema.safeParse(value);
  if (!result.success) throw new Error("corrupt: 画布数据无效，原件已保留。");
  const canvas = result.data;
  const ids = new Set(items.map((item) => item.id));
  const edges = new Set<string>();
  const pairs = new Set<string>();
  if (
    Object.keys(canvas.positions).length !== ids.size ||
    Object.keys(canvas.positions).some((id) => !ids.has(id))
  )
    throw new Error("corrupt: 画布位置与节点不匹配。");
  for (const edge of canvas.edges) {
    const pair = JSON.stringify([edge.source, edge.target]);
    if (
      !ids.has(edge.source) ||
      !ids.has(edge.target) ||
      edge.source === edge.target ||
      edges.has(edge.id) ||
      pairs.has(pair)
    )
      throw new Error("corrupt: 画布连线重复或引用无效，原件已保留。");
    edges.add(edge.id);
    pairs.add(pair);
  }
  return canvas;
}

export function newCanvasNodeId(kind: CanvasCollectionItem["kind"]): string {
  return `added-${kind}-${crypto.randomUUID()}`;
}
