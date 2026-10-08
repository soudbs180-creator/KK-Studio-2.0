import {
  maskBounds,
  mergeRuns,
  nextColorLabel,
  type MaskDocument,
  type MaskRun,
} from "./mask.ts";
import { EDIT_COLORS } from "./palette.ts";
type Edge = [number, number, number, number];
type Interval = [number, number];

/** Only exposed pixel edges are rendered; adjacent scanlines share no border. */
export function* maskEdges(runs: MaskRun[]): Generator<Edge> {
  const rows = new Map<number, Interval[]>();
  for (const [y, x, end] of mergeRuns(runs)) {
    const row = rows.get(y) ?? [];
    row.push([x, end]);
    rows.set(y, row);
  }
  function* horizontal(
    row: Interval[],
    covered: Interval[],
    y: number,
  ): Generator<Edge> {
    let index = 0;
    for (const [x, end] of row) {
      let start = x;
      while (index < covered.length && covered[index][1] <= start) index++;
      for (let i = index; i < covered.length && covered[i][0] < end; i++) {
        const [a, b] = covered[i];
        if (a > start) yield [start, y, Math.min(a, end), y];
        start = Math.max(start, b);
        if (start >= end) break;
      }
      if (start < end) yield [start, y, end, y];
    }
  }
  for (const [y, row] of rows) {
    for (const [x, end] of row) {
      yield [x, y, x, y + 1];
      yield [end, y, end, y + 1];
    }
    yield* horizontal(row, rows.get(y - 1) ?? [], y);
    yield* horizontal(row, rows.get(y + 1) ?? [], y + 1);
  }
}

/** Display and model references use the same filled contours and stable labels. */
export function drawMaskAnnotation(
  ctx: CanvasRenderingContext2D,
  document: MaskDocument,
  scale = 1,
  regionIds?: string[],
) {
  ctx.save();
  for (const region of document.regions) {
    if (regionIds && !regionIds.includes(region.id)) continue;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = region.color ?? EDIT_COLORS[1].color;
    for (const [y, x, end] of region.runs) ctx.fillRect(x, y, end - x, 1);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    for (const [x, y, a, b] of maskEdges(region.runs)) {
      ctx.moveTo(x, y);
      ctx.lineTo(a, b);
    }
    ctx.stroke();
    if (region.color) {
      const bounds = maskBounds(region.runs),
        x = bounds.x + bounds.width / 2,
        y = bounds.y + bounds.height / 2;
      ctx.font = `bold ${Math.max(12 / scale, Math.min(24 / scale, Math.min(bounds.width, bounds.height) / 4))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = "black";
      ctx.fillStyle = "white";
      const label = nextColorLabel(region.colorName!, region.number!);
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();
}
