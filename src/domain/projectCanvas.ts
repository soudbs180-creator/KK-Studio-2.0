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
  /** Persisted canvas groups; optional for backwards-compatible v1 snapshots. */
  groups?: CanvasGroup[];
}

export type CanvasGroupCollapseMode = "info" | "stack";
export type CanvasGroupLayoutMode =
  "grid" | "horizontal" | "vertical" | "upstream";

export interface CanvasGroup {
  id: string;
  name: string;
  itemIds: string[];
  borderColor: string;
  collapseMode: CanvasGroupCollapseMode;
  layoutMode: CanvasGroupLayoutMode;
  tagIds?: string[];
  resourcePackId?: string;
  createdAt: number;
  updatedAt: number;
}

function samePoint(a: Point | undefined, b: Point | undefined): boolean {
  return a?.x === b?.x && a?.y === b?.y;
}

/** Accept external edits without overwriting local drag/add/undo previews. */
export function mergeCanvasPositions(
  current: ProjectCanvas["positions"],
  previous: ProjectCanvas["positions"],
  incoming: ProjectCanvas["positions"],
): ProjectCanvas["positions"] {
  let next = current;
  for (const id of Object.keys(previous)) {
    if (!(id in incoming) && id in next) {
      if (next === current) next = { ...current };
      delete next[id];
    }
  }
  for (const [id, point] of Object.entries(incoming)) {
    if (
      !samePoint(point, previous[id]) &&
      (!current[id] || samePoint(current[id], previous[id])) &&
      !samePoint(current[id], point)
    ) {
      if (next === current) next = { ...current };
      next[id] = point;
    }
  }
  return next;
}

function sameEdge(
  a: CanvasConnection | undefined,
  b: CanvasConnection | undefined,
): boolean {
  return (
    a?.source === b?.source && a?.target === b?.target && a?.kind === b?.kind
  );
}

export function mergeCanvasEdges(
  current: CanvasConnection[],
  previous: CanvasConnection[],
  incoming: CanvasConnection[],
): CanvasConnection[] {
  const before = new Map(previous.map((edge) => [edge.id, edge]));
  const after = new Map(incoming.map((edge) => [edge.id, edge]));
  const next = current
    .filter(
      (edge) =>
        after.has(edge.id) ||
        !before.has(edge.id) ||
        !sameEdge(edge, before.get(edge.id)),
    )
    .map((edge) => {
      const update = after.get(edge.id);
      return update &&
        sameEdge(edge, before.get(edge.id)) &&
        !sameEdge(edge, update)
        ? update
        : edge;
    });
  for (const edge of incoming) {
    if (
      !before.has(edge.id) &&
      !next.some(
        (existing) =>
          existing.id === edge.id ||
          (existing.source === edge.source && existing.target === edge.target),
      )
    )
      next.push(edge);
  }
  return next.length === current.length &&
    next.every((edge, index) => edge === current[index])
    ? current
    : next;
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
    (canvas.groups ?? []).map((group) => [
      group.id,
      group.name,
      [...group.itemIds].sort(),
      group.borderColor,
      group.collapseMode,
      group.layoutMode,
      [...(group.tagIds ?? [])].sort(),
      group.resourcePackId ?? "",
      group.createdAt,
      group.updatedAt,
    ]),
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
  groups: z
    .array(
      z.object({
        id: z.string().min(1).max(160),
        name: z.string().trim().min(1).max(120),
        itemIds: z.array(z.string().min(1).max(160)).min(1).max(200),
        borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        collapseMode: z.enum(["info", "stack"]),
        layoutMode: z.enum(["grid", "horizontal", "vertical", "upstream"]),
        tagIds: z.array(z.string().min(1).max(160)).max(40).optional(),
        resourcePackId: z.string().min(1).max(160).optional(),
        createdAt: z.number().finite().nonnegative(),
        updatedAt: z.number().finite().nonnegative(),
      }),
    )
    .max(100)
    .optional(),
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
    groups: [],
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
    groups: (canvas.groups ?? [])
      .map((group) => ({
        ...group,
        itemIds: group.itemIds.filter((id) => ids.has(id)),
      }))
      .filter((group) => group.itemIds.length > 0),
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
  if (canvas.groups === undefined) return canvas;
  const groups = canvas.groups
    .map((group) => ({
      ...group,
      itemIds: [...new Set(group.itemIds)].filter((id) => ids.has(id)),
      tagIds: group.tagIds ? [...new Set(group.tagIds)] : undefined,
    }))
    .filter((group) => group.itemIds.length > 0);
  return { ...canvas, groups };
}

export function newCanvasNodeId(kind: CanvasCollectionItem["kind"]): string {
  return `added-${kind}-${crypto.randomUUID()}`;
}
