import assert from "node:assert/strict";
import test from "node:test";
import {
  rectangleMask,
  brushMask,
  floodMask,
  maskBounds,
  nextColorLabel,
  type MaskDocument,
} from "../../src/features/image-edit/mask.ts";
import {
  planEditRegions,
  qualityForSide,
  chooseEditSize,
} from "../../src/features/image-edit/regions.ts";
import {
  compileEditPrompt,
  formatEditPrompt,
} from "../../src/features/image-edit/prompt.ts";
import { blendMaskedPixels } from "../../src/features/image-edit/pixels.ts";

test("continuous edit prompt budgets the total without truncating this round's instructions", () => {
  const current = "改".repeat(2000),
    text = "水".repeat(600),
    prompt = formatEditPrompt({
      current,
      originalPrompt: "初".repeat(1500),
      previous: "旧".repeat(600),
      local: true,
      instructions: [{ regionId: "a", label: "红色-A", text }],
    });
  assert.ok(prompt.length <= 4000);
  assert.ok(prompt.includes(current));
  assert.ok(prompt.includes(text));
  assert.match(prompt, /初始设计约束/);
  assert.match(prompt, /最近已完成/);
  assert.throws(
    () =>
      formatEditPrompt({
        current: "改".repeat(2000),
        local: true,
        instructions: Array.from({ length: 4 }, (_, i) => ({
          regionId: String(i),
          label: "红色-A",
          text,
        })),
      }),
    /合计过长/,
  );
});

test("capsule brush raster matches pixel-center distances for diagonal, clipped and fractional segments", () => {
  for (const [a, b] of [
    [
      { x: 2.2, y: 3.7 },
      { x: 25.7, y: 20.3 },
    ],
    [
      { x: -10, y: 6 },
      { x: 20, y: 6 },
    ],
    [
      { x: 9, y: 9 },
      { x: 9, y: 9 },
    ],
    [
      { x: 1, y: 27 },
      { x: 29, y: 1 },
    ],
  ]) {
    const runs = brushMask(32, 32, [a, b], 7.5),
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = dx * dx + dy * dy;
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const t = length
          ? Math.max(
              0,
              Math.min(
                1,
                ((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / length,
              ),
            )
          : 0;
        assert.equal(
          runs.some((run) => run[0] === y && run[1] <= x && x < run[2]),
          Math.hypot(x + 0.5 - a.x - t * dx, y + 0.5 - a.y - t * dy) <= 3.75,
        );
      }
  }
});

test("rectangles and continuous brushes share clipped original pixel runs", () => {
  const rect = rectangleMask(100, 80, { x: -5, y: 10 }, { x: 20, y: 30 });
  assert.deepEqual(maskBounds(rect), { x: 0, y: 10, width: 20, height: 20 });
  const brush = brushMask(
    100,
    80,
    [
      { x: 10, y: 20 },
      { x: 70, y: 20 },
    ],
    10,
  );
  assert.deepEqual(maskBounds(brush), { x: 5, y: 15, width: 70, height: 10 });
  assert.ok(brush.some((run) => run[0] === 20 && run[1] <= 10 && run[2] >= 70));
});

test("crop uses 5 percent each side, rounds upward even and shifts at edges", () => {
  const document: MaskDocument = {
    width: 500,
    height: 300,
    regions: [
      {
        id: "a",
        runs: rectangleMask(500, 300, { x: 1, y: 20 }, { x: 102, y: 70 }),
      },
    ],
  };
  assert.deepEqual(planEditRegions(document).crops[0], {
    x: 0,
    y: 0,
    width: 112,
    height: 112,
    regionIds: ["a"],
  });
  const thin = planEditRegions({
    width: 40,
    height: 200,
    regions: [
      {
        id: "a",
        runs: rectangleMask(40, 200, { x: 0, y: 20 }, { x: 40, y: 120 }),
      },
    ],
  }).crops[0];
  assert.deepEqual(
    { x: thin.x, y: thin.y, width: thin.width, height: thin.height },
    { x: -35, y: 15, width: 110, height: 110 },
  );
});

test("expanded-square merging iterates until later overlaps are included", () => {
  const regions = [0, 110, 218].map((x, i) => ({
    id: String(i),
    runs: rectangleMask(1000, 1000, { x, y: 100 }, { x: x + 100, y: 200 }),
  }));
  const plan = planEditRegions({ width: 1000, height: 1000, regions });
  assert.equal(plan.crops.length, 1);
  assert.deepEqual(plan.crops[0].regionIds, ["0", "1", "2"]);
});

test("final independent region count controls local versus full-image strategy", () => {
  const regions = [0, 300, 600, 900].map((x, i) => ({
    id: String(i),
    runs: rectangleMask(1200, 800, { x, y: 100 }, { x: x + 50, y: 150 }),
  }));
  assert.equal(
    planEditRegions({ width: 1200, height: 800, regions: regions.slice(0, 3) })
      .mode,
    "local",
  );
  const plan = planEditRegions({ width: 1200, height: 800, regions });
  assert.equal(plan.mode, "full");
  assert.deepEqual(plan.crops[0], {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    regionIds: ["0", "1", "2", "3"],
  });
});

test("resolution thresholds and model size fallback never invent unsupported parameters", () => {
  assert.deepEqual([1000, 1001, 2500, 2501].map(qualityForSide), [
    "1K",
    "2K",
    "2K",
    "4K",
  ]);
  assert.equal(chooseEditSize(1001, ["1024x1024", "2048x2048"]), "2048x2048");
  assert.equal(
    chooseEditSize(3000, ["1024x1024", "2048x2048", "1536x1024"]),
    "2048x2048",
  );
  assert.equal(chooseEditSize(900, undefined), undefined);
});

test("fill rejects uncontrolled backgrounds and recognizes a bounded island", () => {
  const pixels = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  for (let y = 5; y < 10; y++)
    for (let x = 5; x < 10; x++) {
      const i = (y * 20 + x) * 4;
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
    }
  assert.deepEqual(maskBounds(floodMask(pixels, 20, 20, { x: 6, y: 6 })), {
    x: 5,
    y: 5,
    width: 5,
    height: 5,
  });
  assert.throws(
    () => floodMask(pixels, 20, 20, { x: 0, y: 0 }),
    /区域过大|边界/,
  );
});

test("color identities remain stable past 26 and ambiguous references cannot be sent", () => {
  assert.equal(nextColorLabel("红色", 27), "红色-27");
  assert.equal(nextColorLabel("红色", 2), "红色-B");
  const document: MaskDocument = {
    width: 20,
    height: 20,
    regions: [
      {
        id: "r1",
        runs: [[1, 1, 3]],
        color: "#ff0000",
        colorName: "红色",
        number: 1,
        instruction: "水流",
      },
      {
        id: "r2",
        runs: [[5, 5, 7]],
        color: "#ff0000",
        colorName: "红色",
        number: 2,
        instruction: "",
      },
    ],
  };
  assert.throws(() => compileEditPrompt("@红色 改成水", document), /多个/);
  assert.throws(() => compileEditPrompt("@蓝色-A 金属", document), /不存在/);
  const compiled = compileEditPrompt("@红色-A 改成透明水流", document);
  assert.deepEqual(compiled.instructions, [
    { regionId: "r1", label: "红色-A", text: "改成透明水流" },
  ]);
  assert.deepEqual(compiled.regionIds, ["r1"]);
  assert.equal(
    compileEditPrompt("", { ...document, regions: [document.regions[1]] })
      .regionIds.length,
    0,
  );
});

test("composition feathers inside mask while all unselected RGBA bytes stay identical", () => {
  const original = new Uint8ClampedArray(7 * 7 * 4).fill(20);
  const generated = new Uint8ClampedArray(7 * 7 * 4).fill(220);
  const mask = new Uint8Array(49);
  for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) mask[y * 7 + x] = 255;
  const output = blendMaskedPixels(original, generated, mask, 7, 7, 2);
  assert.deepEqual([...output.slice(0, 8)], [20, 20, 20, 20, 20, 20, 20, 20]);
  assert.equal(output[(2 * 7 + 2) * 4], 120);
  assert.equal(output[(3 * 7 + 3) * 4], 220);
  assert.equal(original[(3 * 7 + 3) * 4], 20);
});
