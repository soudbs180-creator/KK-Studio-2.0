export interface Point {
  x: number;
  y: number;
}

export interface ViewTransform extends Point {
  scale: number;
}

export interface ViewportRect extends Point {
  width: number;
  height: number;
}

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;

/** Coarsen the visible lattice at low zoom instead of merging or hiding dots. */
export function canvasPatternPitch(scale: number): number {
  const pitch = 24 * scale;
  return pitch * 2 ** Math.max(0, Math.ceil(Math.log2(12 / pitch)));
}

export function zoomAtPoint(
  current: ViewTransform,
  anchor: Point,
  requestedScale: number,
): ViewTransform {
  if (!Number.isFinite(requestedScale)) return current;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, requestedScale));
  return {
    scale,
    x: anchor.x - ((anchor.x - current.x) / current.scale) * scale,
    y: anchor.y - ((anchor.y - current.y) / current.scale) * scale,
  };
}

export function enclosingRect(rects: ViewportRect[]): ViewportRect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
  };
}

export function fitRects(
  rects: ViewportRect[],
  viewport: ViewportRect,
): ViewTransform {
  const bounds = enclosingRect(rects);
  if (!bounds) return { x: 0, y: 0, scale: 1 };
  const scale = Math.max(
    MIN_SCALE,
    Math.min(
      MAX_SCALE,
      viewport.width / Math.max(1, bounds.width),
      viewport.height / Math.max(1, bounds.height),
    ),
  );
  return {
    scale,
    x: viewport.x + viewport.width / 2 - (bounds.x + bounds.width / 2) * scale,
    y:
      viewport.y + viewport.height / 2 - (bounds.y + bounds.height / 2) * scale,
  };
}
