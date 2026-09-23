/**
 * Single source of truth for turning the image node's ratio/quality draft
 * parameters into the provider `size` string (`WIDTHxHEIGHT`).
 *
 * Both the browser fetch path and the Desktop Rust task host receive the
 * already-resolved string; Rust never re-maps UI labels. When the user picks
 * "自适应" (adaptive) or the inputs are invalid, we return `undefined` and the
 * request omits `size`, leaving the provider default in effect.
 */

export const IMAGE_QUALITY_LABELS = ["自适应", "1K", "2K", "4K"] as const;
export type ImageQualityLabel = (typeof IMAGE_QUALITY_LABELS)[number];

const QUALITY_LONG_EDGE: Record<
  Exclude<ImageQualityLabel, "自适应">,
  number
> = {
  "1K": 1024,
  "2K": 2048,
  "4K": 4096,
};

const MIN_EDGE = 256;
const MAX_EDGE = 4096;
/** Provider image dimensions are conventionally multiples of 8. */
const EDGE_GRID = 8;

function snapToGrid(value: number): number {
  return Math.round(value / EDGE_GRID) * EDGE_GRID;
}

function clampEdge(value: number): number {
  return Math.min(MAX_EDGE, Math.max(MIN_EDGE, value));
}

/**
 * Resolve a ratio such as "16:9" and a quality label such as "2K" into a
 * concrete `long x short` size, orienting by the ratio. Returns undefined when
 * no explicit size should be sent (adaptive or unparseable inputs).
 */
export function resolveImageSize(
  ratio: string | null | undefined,
  quality: string | null | undefined,
): string | undefined {
  if (!quality || quality === "自适应") return undefined;
  const longEdge =
    QUALITY_LONG_EDGE[quality as Exclude<ImageQualityLabel, "自适应">];
  if (!longEdge) return undefined;

  const match = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(ratio ?? "");
  if (!match) return undefined;
  const ratioWidth = Number(match[1]);
  const ratioHeight = Number(match[2]);
  if (!Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight))
    return undefined;
  if (ratioWidth <= 0 || ratioHeight <= 0) return undefined;

  const landscape = ratioWidth >= ratioHeight;
  const rawShort =
    (longEdge * Math.min(ratioWidth, ratioHeight)) /
    Math.max(ratioWidth, ratioHeight);
  const shortEdge = clampEdge(snapToGrid(rawShort));

  const width = landscape ? longEdge : shortEdge;
  const height = landscape ? shortEdge : longEdge;
  return `${width}x${height}`;
}
