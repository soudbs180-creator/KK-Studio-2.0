import type {
  Point,
  MaskRun,
  MaskDocument,
  Bounds,
} from "../../domain/imageEdit.ts";
export type {
  Point,
  MaskRun,
  MaskRegion,
  MaskDocument,
  Bounds,
} from "../../domain/imageEdit.ts";
export const MAX_EDIT_PIXELS = 64 * 1024 * 1024;

export function assertImageDimensions(width: number, height: number): void {
  if (
    ![width, height].every(
      (v) => Number.isSafeInteger(v) && v > 0 && v <= 16384,
    ) ||
    width * height > MAX_EDIT_PIXELS
  )
    throw new Error("图片尺寸超过编辑上限（64M 像素），请先缩小原图。");
}
export function maskBounds(runs: MaskRun[]): Bounds {
  let left = Infinity,
    top = Infinity,
    right = 0,
    bottom = 0;
  for (const [y, x, end] of runs) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, end);
    bottom = Math.max(bottom, y + 1);
  }
  return runs.length
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : { x: 0, y: 0, width: 0, height: 0 };
}
export function rectangleMask(
  width: number,
  height: number,
  a: Point,
  b: Point,
): MaskRun[] {
  assertImageDimensions(width, height);
  const x = Math.max(0, Math.floor(Math.min(a.x, b.x))),
    end = Math.min(width, Math.ceil(Math.max(a.x, b.x)));
  const y = Math.max(0, Math.floor(Math.min(a.y, b.y))),
    bottom = Math.min(height, Math.ceil(Math.max(a.y, b.y)));
  if (end <= x || bottom <= y) return [];
  return Array.from({ length: bottom - y }, (_, row) => [row + y, x, end]);
}
export function mergeRuns(runs: MaskRun[]): MaskRun[] {
  const sorted = runs
    .map((run) => [...run] as MaskRun)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: MaskRun[] = [];
  for (const run of sorted) {
    const last = merged.at(-1);
    if (last && last[0] === run[0] && last[2] >= run[1])
      last[2] = Math.max(last[2], run[2]);
    else merged.push(run);
  }
  return merged;
}
export function brushMask(
  width: number,
  height: number,
  points: Point[],
  diameter: number,
): MaskRun[] {
  assertImageDimensions(width, height);
  if (!points.length || !Number.isFinite(diameter) || diameter <= 0) return [];
  const radius = Math.min(2048, diameter / 2),
    runs: MaskRun[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy),
      nx = length ? (-dy / length) * radius : 0,
      ny = length ? (dx / length) * radius : 0,
      corners = [
        { x: a.x + nx, y: a.y + ny },
        { x: b.x + nx, y: b.y + ny },
        { x: b.x - nx, y: b.y - ny },
        { x: a.x - nx, y: a.y - ny },
      ];
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius)),
      maxY = Math.min(height, Math.ceil(Math.max(a.y, b.y) + radius));
    for (let y = minY; y < maxY; y++) {
      const row = y + 0.5,
        xs: number[] = [];
      for (const center of [a, b]) {
        const delta = row - center.y;
        if (Math.abs(delta) <= radius) {
          const half = Math.sqrt(Math.max(0, radius * radius - delta * delta));
          xs.push(center.x - half, center.x + half);
        }
      }
      for (let edge = 0; edge < 4; edge++) {
        const from = corners[edge],
          to = corners[(edge + 1) % 4];
        if (row < Math.min(from.y, to.y) || row > Math.max(from.y, to.y))
          continue;
        if (from.y === to.y) xs.push(from.x, to.x);
        else
          xs.push(
            from.x + ((row - from.y) * (to.x - from.x)) / (to.y - from.y),
          );
      }
      if (!xs.length) continue;
      const start = Math.max(0, Math.ceil(Math.min(...xs) - 0.5 - 1e-10)),
        end = Math.min(width, Math.floor(Math.max(...xs) - 0.5 + 1e-10) + 1);
      if (end > start) runs.push([y, start, end]);
    }
  }
  return mergeRuns(runs);
}
export function containsMask(runs: MaskRun[], point: Point): boolean {
  const x = Math.floor(point.x),
    y = Math.floor(point.y);
  return runs.some((run) => run[0] === y && run[1] <= x && run[2] > x);
}
export function floodMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  point: Point,
  tolerance = 30,
): MaskRun[] {
  assertImageDimensions(width, height);
  if (pixels.length !== width * height * 4)
    throw new Error("原图像素读取失败。");
  const sx = Math.floor(point.x),
    sy = Math.floor(point.y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return [];
  const seed = (sy * width + sx) * 4,
    visited = new Uint8Array(width * height),
    queue = [sy * width + sx],
    runs: MaskRun[] = [];
  let count = 0;
  const matches = (index: number) => {
    if (visited[index]) return false;
    const i = index * 4;
    return (
      (pixels[i] - pixels[seed]) ** 2 +
        (pixels[i + 1] - pixels[seed + 1]) ** 2 +
        (pixels[i + 2] - pixels[seed + 2]) ** 2 <=
        tolerance * tolerance * 3 &&
      Math.abs(pixels[i + 3] - pixels[seed + 3]) <= tolerance
    );
  };
  while (queue.length) {
    const index = queue.pop()!;
    if (!matches(index)) continue;
    const y = Math.floor(index / width);
    let left = index % width,
      right = left + 1;
    while (left > 0 && matches(y * width + left - 1)) left--;
    while (right < width && matches(y * width + right)) right++;
    count += right - left;
    if (count > width * height * 0.35)
      throw new Error("识别区域过大，边界不可靠；请改用框选或画笔。");
    for (let x = left; x < right; x++) visited[y * width + x] = 1;
    runs.push([y, left, right]);
    for (const adjacent of [y - 1, y + 1])
      if (adjacent >= 0 && adjacent < height) {
        let active = false;
        for (let x = left; x < right; x++) {
          const match = matches(adjacent * width + x);
          if (match && !active) queue.push(adjacent * width + x);
          active = match;
        }
      }
  }
  return mergeRuns(runs);
}
export function nextColorLabel(color: string, number: number): string {
  return `${color}-${number <= 26 ? String.fromCharCode(64 + number) : number}`;
}
/** Invalid edit documents must not silently become ordinary generation. */
export function readMaskDocument(input: unknown): MaskDocument {
  const doc = input as MaskDocument;
  if (!doc || !Array.isArray(doc.regions))
    throw new Error("编辑蒙版数据损坏，原件已保留。");
  assertImageDimensions(doc.width, doc.height);
  if (
    doc.colorCounters &&
    (typeof doc.colorCounters !== "object" ||
      Array.isArray(doc.colorCounters) ||
      Object.keys(doc.colorCounters).length > 200 ||
      Object.entries(doc.colorCounters).some(
        ([key, value]) =>
          key.length > 40 || !Number.isSafeInteger(value) || value < 0,
      ))
  )
    throw new Error("色块编号记录无效。");
  if (doc.regions.length > 200)
    throw new Error("编辑区域超过 200 个，请分批编辑。");
  const ids = new Set<string>();
  let total = 0;
  for (const region of doc.regions) {
    if (
      !region ||
      typeof region.id !== "string" ||
      !region.id ||
      region.id.length > 160 ||
      ids.has(region.id) ||
      !Array.isArray(region.runs)
    )
      throw new Error("编辑区域标识无效。");
    ids.add(region.id);
    total += region.runs.length;
    if (total > 500000) throw new Error("蒙版过于复杂，请分批编辑。");
    if (
      region.color !== undefined &&
      (!/^#[a-f\d]{6}$/i.test(region.color) ||
        typeof region.colorName !== "string" ||
        region.colorName.length > 40 ||
        !Number.isSafeInteger(region.number) ||
        region.number! <= 0)
    )
      throw new Error("色块标记数据无效。");
    if (
      region.instruction !== undefined &&
      (typeof region.instruction !== "string" ||
        region.instruction.length > 2000)
    )
      throw new Error("色块指令数据无效。");
    for (const run of region.runs)
      if (
        !Array.isArray(run) ||
        run.length !== 3 ||
        !run.every(Number.isSafeInteger) ||
        run[0] < 0 ||
        run[0] >= doc.height ||
        run[1] < 0 ||
        run[2] > doc.width ||
        run[1] >= run[2]
      )
        throw new Error("蒙版坐标无效，原件已保留。");
  }
  return structuredClone(doc);
}
