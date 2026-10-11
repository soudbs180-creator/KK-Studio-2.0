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
  // Result cards keep 16px inner padding on both sides; size the shell around
  // the content width so a wide image does not clip the preview.
  return Math.max(222, 32 + 348 / ratio);
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
     endpoints land on the media surface rather than its controls. */
  if (item.kind === "image")
    return {
      x: 60,
      y: 52,
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
      width: hasReferenceComposer ? 590 : 380,
      height: hasReferenceComposer ? visual.height + 247 : visual.height,
      left: hasReferenceComposer ? -105 : 0,
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
      width: 620,
      height: visual.y + visual.height + 270,
      left: 0,
      collapsedHeight: visual.y + visual.height,
      anchor,
    };
  return {
    width: 590,
    height: 471,
    left: -110,
    collapsedHeight: 224,
    anchor,
  };
}

export function connectionGeometry(
  edge: CanvasConnection,
  nodes: Record<string, Point>,
  items: CanvasCollectionItem[],
): { path: string; start: Point; end: Point; midpoint: Point } | null {
  const a = items.find((item) => item.id === edge.source);
  const b = items.find((item) => item.id === edge.target);
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
