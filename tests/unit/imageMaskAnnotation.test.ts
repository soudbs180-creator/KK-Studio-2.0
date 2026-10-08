import assert from "node:assert/strict";
import test from "node:test";
import { maskEdges } from "../../src/features/image-edit/maskAnnotation.ts";
import { nativeAnnotationOverhead } from "../../src/features/image-edit/regions.ts";

test("a mask contour excludes internal scanline edges and retains a hole boundary", () => {
  const edges = [
    ...maskEdges([
      [0, 0, 3],
      [1, 0, 1],
      [1, 2, 3],
      [2, 0, 3],
    ]),
  ];
  const length = edges.reduce(
    (n, [x, y, a, b]) => n + Math.abs(x - a) + Math.abs(y - b),
    0,
  );
  assert.equal(length, 16);
  assert(edges.some((edge) => JSON.stringify(edge) === "[1,1,2,1]"));
  assert(!edges.some((edge) => JSON.stringify(edge) === "[0,1,3,1]"));
});

test("even one colored native region retains its labeled reference image", () => {
  assert.equal(
    nativeAnnotationOverhead({
      width: 20,
      height: 20,
      regions: [
        {
          id: "a",
          runs: [[3, 2, 8]],
          color: "#e44747",
          colorName: "红色",
          number: 1,
          instruction: "水流",
        },
      ],
    }),
    1,
  );
});
