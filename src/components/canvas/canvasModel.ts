import { connectionGeometry } from "../../domain/canvasGraph";
import { BASE_CANVAS_ITEMS } from "../../domain/canvasItems";
import {
  MIN_SCALE,
  type Point,
  type ViewTransform,
} from "../../domain/canvasViewport";
export { MIN_SCALE, MAX_SCALE } from "../../domain/canvasViewport";
export type { Point, ViewTransform } from "../../domain/canvasViewport";
export type CanvasNodeId = string;

export type DragState =
  | {
      kind: "pan";
      pointerId: number;
      client: Point;
      transform: ViewTransform;
    }
  | {
      kind: "node";
      pointerId: number;
      client: Point;
      nodeId: CanvasNodeId;
      node: Point;
    };

export const INITIAL_SCALE = 1;
export const INITIAL_TRANSFORM: ViewTransform = {
  x: 0,
  y: 0,
  scale: INITIAL_SCALE,
};

export function placeNodeInViewport(
  kind: "image" | "video",
  viewport: { width: number; height: number },
  current: ViewTransform,
): { position: Point; transform: ViewTransform } {
  const width = 590;
  const height = kind === "image" ? 705 : 471;
  const center = { x: viewport.width / 2, y: (70 + viewport.height - 100) / 2 };
  const worldCenter = {
    x: (center.x - current.x) / current.scale,
    y: (center.y - current.y) / current.scale,
  };
  const scale = Math.max(
    MIN_SCALE,
    Math.min(
      current.scale,
      (viewport.width - 32) / width,
      (viewport.height - 170) / height,
    ),
  );
  return {
    position: {
      x: worldCenter.x - width / 2 + (kind === "video" ? 110 : 0),
      y: worldCenter.y - height / 2,
    },
    transform: {
      scale,
      x: center.x - worldCenter.x * scale,
      y: center.y - worldCenter.y * scale,
    },
  };
}

const INITIAL_NODES: Record<string, Point> = {
  image: { x: 82, y: 107 },
  /* Root y=150 minus the canvas frame y=45. */
  video1: { x: 709, y: 104 },
  video2: { x: 709, y: 397 },
};

export const NODE_LABELS: Record<string, string> = {
  image: "图片创建卡片",
  video1: "上方视频卡片",
  video2: "下方视频卡片",
};

export function copyInitialNodes(): Record<string, Point> {
  return {
    image: { ...INITIAL_NODES.image },
    video1: { ...INITIAL_NODES.video1 },
    video2: { ...INITIAL_NODES.video2 },
  };
}

export function getConnectorPath(
  nodes: Record<string, Point>,
  targetId: "video1" | "video2",
): string {
  return connectionGeometry(
    { id: targetId, source: "image", target: targetId },
    { ...INITIAL_NODES, ...nodes },
    BASE_CANVAS_ITEMS,
  )!.path;
}
