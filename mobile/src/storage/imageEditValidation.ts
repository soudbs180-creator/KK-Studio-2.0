import {
  array,
  id,
  integer,
  invariant,
  keys,
  object,
  text,
} from "./schemaPrimitives.ts";

export function validateImageEditContext(value: unknown): void {
  object(value);
  keys(value, [
    "originalPrompt",
    "originalAssetId",
    "referenceAssetIds",
    "lastInstruction",
  ]);
  text(value.originalPrompt);
  if (value.originalAssetId !== undefined) id(value.originalAssetId);
  array(value.referenceAssetIds, 32);
  value.referenceAssetIds.forEach(id);
  if (value.lastInstruction !== undefined) text(value.lastInstruction);
}
export function validateImageEditSnapshot(value: unknown): void {
  object(value);
  keys(value, [
    "sourceAssetId",
    "maskAssetId",
    "groupId",
    "document",
    "crop",
    "nativeMask",
  ]);
  id(value.sourceAssetId);
  if (value.maskAssetId !== undefined) id(value.maskAssetId);
  id(value.groupId);
  invariant(typeof value.nativeMask === "boolean", "Corrupt native mask flag");
  object(value.document);
  const d = value.document;
  keys(d, ["width", "height", "regions", "colorCounters"]);
  integer(d.width);
  integer(d.height);
  invariant(
    d.width > 0 && d.height > 0 && d.width <= 16384 && d.height <= 16384,
    "Corrupt mask dimensions",
  );
  array(d.regions, 1000);
  const regions = new Set<string>();
  for (const region of d.regions) {
    object(region);
    keys(region, ["id", "runs", "color", "colorName", "number", "instruction"]);
    id(region.id);
    invariant(!regions.has(region.id), "Corrupt duplicate mask region");
    regions.add(region.id);
    array(region.runs, 1000000);
    for (const run of region.runs) {
      array(run, 3);
      invariant(run.length === 3, "Corrupt mask run");
      run.forEach(integer);
      invariant(
        Number(run[0]) < d.height &&
          Number(run[1]) < Number(run[2]) &&
          Number(run[2]) <= d.width,
        "Corrupt mask run bounds",
      );
    }
    for (const field of ["color", "colorName", "instruction"])
      if (region[field] !== undefined) text(region[field]);
    if (region.number !== undefined) integer(region.number);
  }
  if (d.colorCounters !== undefined) {
    object(d.colorCounters);
    invariant(
      Object.keys(d.colorCounters).length <= 1000,
      "Corrupt color counters",
    );
    Object.values(d.colorCounters).forEach(integer);
  }
  object(value.crop);
  keys(value.crop, ["x", "y", "width", "height", "regionIds"]);
  for (const field of ["x", "y", "width", "height"]) integer(value.crop[field]);
  invariant(
    Number(value.crop.width) > 0 &&
      Number(value.crop.height) > 0 &&
      Number(value.crop.x) + Number(value.crop.width) <= d.width &&
      Number(value.crop.y) + Number(value.crop.height) <= d.height,
    "Corrupt crop bounds",
  );
  array(value.crop.regionIds, 1000);
  for (const regionId of value.crop.regionIds)
    invariant(
      typeof regionId === "string" && regions.has(regionId),
      "Corrupt crop region",
    );
}
