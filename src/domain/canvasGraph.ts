import type { CanvasCollectionItem } from "./canvasItems.ts";
import type { Point } from "./canvasViewport.ts";
import { aspectRatioForDimensions } from "./mediaDimensions.ts";

export interface CanvasConnection {
  id: string;
  source: string;
  target: string;
  /** Result edges describe provenance; reference edges consume model slots. */
  kind?: "reference" | "result";
}
export const INITIAL_CONNECTIONS: CanvasConnection[] = [
  { id: "connector-video1", source: "image", target: "video1" },
  { id: "connector-video2", source: "image", target: "video2" },
];

function resultCardHeight(item: CanvasCollectionItem): number {
  const ratio = aspectRatioForDimensions(
    item.mediaWidth ?? 1,
    item.mediaHeight ?? 1,
  );
  // The 380px result body has a 1px border and no inner padding.
  return 2 + 378 / ratio;
}

/** Visible card body, excluding labels, upload buttons and the optional composer. */
export function cardVisualBounds(item: CanvasCollectionItem): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (item.plugin)
    return {
      x: 0,
      y: 0,
      width: item.plugin.width ?? 380,
      height: item.plugin.height ?? 300,
    };
  if (item.kind === "image" && item.result) {
    return {
      x: 0,
      y: 0,
      width: 380,
      height: resultCardHeight(item),
    };
  }
  if (
    item.result ||
    (item.generationStatus && item.generationIndex !== undefined) ||
    item.kind === "audio" ||
    item.kind === "text"
  )
    return { x: 0, y: 0, width: 380, height: 380 };
  /* Keep the label/upload slot outside this visual bound so connection
     endpoints land on the 400px Figma card rather than its controls. */
  if (item.kind === "image")
    return {
      x: 94,
      y: 58,
      width: 400,
      height:
        400 /
        aspectRatioForDimensions(item.mediaWidth ?? 1, item.mediaHeight ?? 1),
    };
  /* Both Figma video modules use a 16px label slot before the 208px body. */
  return { x: 0, y: 16, width: 370, height: 208 };
}

export function cardLayout(item: CanvasCollectionItem): {
  width: number;
  height: number;
  left: number;
  collapsedHeight: number;
  anchor: Point;
} {
  const visual = cardVisualBounds(item);
  const anchor = {
    x: visual.x + visual.width,
    y: visual.y + visual.height / 2,
  };
  if (item.plugin)
    return {
      width: visual.width,
      height: visual.height,
      left: 0,
      collapsedHeight: visual.height,
      anchor,
    };
  if (item.referenceOnly)
    return {
      width: 590,
      height: visual.y + visual.height,
      left: 0,
      collapsedHeight: visual.y + visual.height,
      anchor,
    };
  if (
    item.result ||
    (item.generationStatus && item.generationIndex !== undefined)
  ) {
    const hasReferenceComposer = Boolean(
      item.result &&
      !item.referenceOnly &&
      (item.kind === "image" || item.kind === "video"),
    );
    return {
      width: hasReferenceComposer ? 652 : 380,
      height: hasReferenceComposer ? visual.height + 172 : visual.height,
      left: hasReferenceComposer ? (visual.width - 652) / 2 : 0,
      collapsedHeight: visual.height,
      anchor,
    };
  }
  if (item.kind === "audio" || item.kind === "text")
    return {
      width: 590,
      height: 627,
      left: -105,
      collapsedHeight: 380,
      anchor,
    };
  if (item.kind === "image")
    return {
      width: 652,
      height: visual.y + visual.height + 172,
      left: visual.x + (visual.width - 652) / 2,
      collapsedHeight: visual.y + visual.height,
      anchor,
    };
  return {
    width: 370,
    height: 224,
    left: 0,
    collapsedHeight: 224,
    anchor,
  };
}

/** Bounds used to reveal a selected node, including its optional editor. */
export function cardSelectionLayout(
  item: CanvasCollectionItem,
): ReturnType<typeof cardLayout> {
  const layout = cardLayout(item);
  if (
    item.kind === "video" &&
    !item.plugin &&
    !item.referenceOnly &&
    !item.result &&
    !(item.generationStatus && item.generationIndex !== undefined)
  ) {
    // Reserve the shared 652×156 editor plus its 16px media gap.
    return { ...layout, width: 652, height: 396, left: -141 };
  }
  return layout;
}

export function connectionGeometry(
  edge: CanvasConnection,
  nodes: Record<string, Point>,
  items: CanvasCollectionItem[] | Map<string, CanvasCollectionItem>,
): { path: string; start: Point; end: Point; midpoint: Point } | null {
  const isMap = items instanceof Map;
  const a = isMap
    ? items.get(edge.source)
    : items.find((item) => item.id === edge.source);
  const b = isMap
    ? items.get(edge.target)
    : items.find((item) => item.id === edge.target);
  const from = nodes[edge.source];
  const to = nodes[edge.target];
  if (!a || !b || !from || !to) return null;
  const anchor = cardLayout(a).anchor;
  const target = cardVisualBounds(b);
  const start = { x: from.x + anchor.x, y: from.y + anchor.y };
  const end = {
    x: to.x + target.x,
    y: to.y + target.y + target.height / 2,
  };
  const bend = Math.max(48, Math.abs(end.x - start.x) * 0.45);
  return {
    start,
    end,
    midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    path: `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`,
  };
}

export function deleteConnection(
  edges: CanvasConnection[],
  id: string,
): CanvasConnection[] {
  return edges.filter((edge) => edge.id !== id);
}
export function restoreConnection(
  edges: CanvasConnection[],
  edge: CanvasConnection,
  items: CanvasCollectionItem[],
): CanvasConnection[] {
  const ids = new Set(items.map((item) => item.id));
  return !ids.has(edge.source) ||
    !ids.has(edge.target) ||
    edges.some((current) => current.id === edge.id)
    ? edges
    : [...edges, edge];
}
