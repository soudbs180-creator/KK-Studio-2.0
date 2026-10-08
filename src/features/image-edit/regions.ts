import {
  maskBounds,
  mergeRuns,
  readMaskDocument,
  type Bounds,
  type MaskDocument,
  type MaskRun,
} from "./mask.ts";
import type { EditCrop } from "../../domain/imageEdit.ts";
export type { EditCrop } from "../../domain/imageEdit.ts";
function intersects(a: Bounds, b: Bounds) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}
function square(runs: MaskRun[], width: number, height: number): Bounds {
  const bounds = maskBounds(runs),
    edge = Math.ceil((Math.max(bounds.width, bounds.height) * 11) / 20) * 2;
  const position = (center: number, limit: number) =>
    edge <= limit
      ? Math.max(0, Math.min(limit - edge, Math.floor(center - edge / 2)))
      : Math.floor((limit - edge) / 2);
  return {
    x: position(bounds.x + bounds.width / 2, width),
    y: position(bounds.y + bounds.height / 2, height),
    width: edge,
    height: edge,
  };
}
export function planEditRegions(input: MaskDocument): {
  mode: "local" | "full";
  crops: EditCrop[];
} {
  const doc = readMaskDocument(input);
  const groups = doc.regions
    .filter((r) => r.runs.length)
    .map((region) => ({ ids: [region.id], runs: mergeRuns(region.runs) }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        if (
          !intersects(
            square(groups[i].runs, doc.width, doc.height),
            square(groups[j].runs, doc.width, doc.height),
          )
        )
          continue;
        groups[i] = {
          ids: [...groups[i].ids, ...groups[j].ids],
          runs: mergeRuns([...groups[i].runs, ...groups[j].runs]),
        };
        groups.splice(j, 1);
        changed = true;
        break outer;
      }
  }
  if (groups.length > 3)
    return {
      mode: "full",
      crops: [
        {
          x: 0,
          y: 0,
          width: doc.width,
          height: doc.height,
          regionIds: doc.regions.map((r) => r.id),
        },
      ],
    };
  return {
    mode: "local",
    crops: groups.map((group) => ({
      ...square(group.runs, doc.width, doc.height),
      regionIds: group.ids,
    })),
  };
}
export function qualityForSide(side: number): "1K" | "2K" | "4K" {
  return side <= 1000 ? "1K" : side <= 2500 ? "2K" : "4K";
}
/** Color instructions always retain a labeled reference alongside the binary mask. */
export function nativeAnnotationOverhead(document: MaskDocument): number {
  return planEditRegions(document).crops.some((crop) =>
    document.regions.some(
      (region) => crop.regionIds.includes(region.id) && region.color,
    ),
  )
    ? 1
    : 0;
}
export function chooseEditSize(
  side: number,
  sizes?: string[],
): string | undefined {
  const target = { "1K": 1024, "2K": 2048, "4K": 4096 }[qualityForSide(side)];
  const squares = (sizes ?? [])
    .filter((size) => {
      const [w, h] = size.split("x").map(Number);
      return w === h && w > 0;
    })
    .sort((a, b) => parseInt(a) - parseInt(b));
  return squares.find((size) => parseInt(size) === target) ?? squares.at(-1);
}
