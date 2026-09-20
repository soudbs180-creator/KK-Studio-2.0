import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCreationSnapshot } from "../../src/features/creation/model.ts";
import { projectCanvasFingerprint } from "../../src/domain/projectCanvas.ts";

test("native JSON key ordering is not a canvas edit; geometry changes are", () => {
  const canvas = normalizeCreationSnapshot(snapshot)!.projects[0].canvas;
  const reordered = {
    viewport: {
      scale: canvas.viewport.scale,
      y: canvas.viewport.y,
      x: canvas.viewport.x,
    },
    edges: canvas.edges.map((edge) => ({
      kind: edge.kind,
      target: edge.target,
      source: edge.source,
      id: edge.id,
    })),
    positions: Object.fromEntries(
      Object.entries(canvas.positions)
        .reverse()
        .map(([id, point]) => [id, { y: point.y, x: point.x }]),
    ),
    version: canvas.version,
  };
  assert.equal(
    projectCanvasFingerprint(canvas),
    projectCanvasFingerprint(reordered),
  );
  reordered.viewport.x += 1;
  assert.notEqual(
    projectCanvasFingerprint(canvas),
    projectCanvasFingerprint(reordered),
  );
});

const snapshot = {
  version: 2,
  revision: 4,
  activeProjectId: "a",
  homeDraft: {},
  projects: [
    {
      id: "a",
      items: [
        { id: "image", kind: "image", title: "图", description: "" },
        { id: "video1", kind: "video", title: "视频", description: "" },
      ],
      canvas: {
        version: 1,
        positions: { image: { x: 146, y: 107 }, video1: { x: 702, y: 98 } },
        edges: [
          {
            id: "edge-1",
            source: "image",
            target: "video1",
            kind: "reference",
          },
        ],
        viewport: { x: 72, y: -30, scale: 0.75 },
      },
    },
  ],
};
test("project normalization preserves edited positions, edges and viewport", () => {
  const loaded = normalizeCreationSnapshot(snapshot);
  assert.deepEqual(loaded?.projects[0]?.canvas, snapshot.projects[0].canvas);
});
test("a future graph version is not silently replaced by the default layout", () => {
  const future = structuredClone(snapshot);
  future.projects[0].canvas.version = 99;
  assert.throws(() => normalizeCreationSnapshot(future), /unsupported/);
});
