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

/**
 * Background pattern scaling.
 *
 * The dot/grid lattice must grow and shrink continuously with the viewport
 * instead of snapping between discrete densities. The previous implementation
 * multiplied the pitch by the next power of two whenever it fell under 12px,
 * which made the pitch jump from 23.52px to 12px between 49% and 50% zoom.
 *
 * The pitch is now a single linear ramp across BACKGROUND_MIN_SCALE →
 * BACKGROUND_MAX_SCALE, so every zoom step produces a proportional change and
 * no discontinuity. Below the floor the pattern is scaled to its smallest
 * usable size and faded to zero opacity, which reads as hidden while keeping
 * the tile valid (a zero-size tile would drop the background entirely).
 */
export const BACKGROUND_MIN_SCALE = 0.5;
export const BACKGROUND_MAX_SCALE = 4;
const BACKGROUND_PITCH_MIN = 12;
const BACKGROUND_PITCH_MAX = 96;
const BACKGROUND_DOT_MIN = 1;
const BACKGROUND_DOT_MAX = 8;
const BACKGROUND_GRID_MIN = 0.5;
const BACKGROUND_GRID_MAX = 1.5;
/** Zoom at which the pattern is already fully opaque. */
const BACKGROUND_OPAQUE_SCALE = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Normalized 0→1 progress across the supported background zoom range. */
export function backgroundScaleProgress(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return clamp(
    (scale - BACKGROUND_MIN_SCALE) /
      (BACKGROUND_MAX_SCALE - BACKGROUND_MIN_SCALE),
    0,
    1,
  );
}

/** Tile pitch in px. Linear in zoom, so the lattice never jumps. */
export function canvasPatternPitch(scale: number): number {
  const progress = backgroundScaleProgress(scale);
  return (
    BACKGROUND_PITCH_MIN +
    (BACKGROUND_PITCH_MAX - BACKGROUND_PITCH_MIN) * progress
  );
}

/** Dot diameter in px, kept proportional to the pitch so tiling stays even. */
export function canvasPatternDotSize(scale: number): number {
  const progress = backgroundScaleProgress(scale);
  return (
    BACKGROUND_DOT_MIN + (BACKGROUND_DOT_MAX - BACKGROUND_DOT_MIN) * progress
  );
}

/**
 * Grid line width in px. Scales with zoom so the mesh keeps a constant visual
 * weight instead of thinning out to invisible hairlines at high pitch.
 */
export function canvasPatternGridLine(scale: number): number {
  const progress = backgroundScaleProgress(scale);
  return (
    BACKGROUND_GRID_MIN + (BACKGROUND_GRID_MAX - BACKGROUND_GRID_MIN) * progress
  );
}

/**
 * Opacity ramp. Fades in linearly from 0 at the floor to fully opaque at 100%
 * zoom — the default working scale — and stays opaque through 400%. Exactly 0
 * at the floor means the background disappears at 50% instead of lingering at a
 * fixed size, which is what the previous `Math.max(0.2, …)` floor prevented.
 */
export function canvasPatternOpacity(scale: number): number {
  if (!Number.isFinite(scale) || scale <= BACKGROUND_MIN_SCALE) return 0;
  return clamp(
    (scale - BACKGROUND_MIN_SCALE) /
      (BACKGROUND_OPAQUE_SCALE - BACKGROUND_MIN_SCALE),
    0,
    1,
  );
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
  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i];
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    const rx = r.x + r.width;
    const ry = r.y + r.height;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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
