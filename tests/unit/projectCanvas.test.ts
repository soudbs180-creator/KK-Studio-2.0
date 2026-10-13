import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCreationSnapshot } from "../../src/features/creation/model.ts";
import {
  projectCanvasFingerprint,
  mergeCanvasPositions,
  mergeCanvasEdges,
} from "../../src/domain/projectCanvas.ts";
import type { CanvasConnection } from "../../src/domain/canvasGraph.ts";

test("external positions update untouched nodes and keep local drag/add/undo positions", () => {
  const previous = {
    a: { x: 10, y: 20 },
    b: { x: 30, y: 40 },
    removed: { x: 0, y: 0 },
  };
  const local = { ...previous, a: { x: 11, y: 21 }, added: { x: 500, y: 600 } };
  const incoming = {
    a: { x: 100, y: 200 },
    b: { x: 300, y: 400 },
    added: { x: 82, y: 107 },
    agent: { x: 160, y: 180 },
  };
  assert.deepEqual(mergeCanvasPositions(local, previous, incoming), {
    a: local.a,
    b: incoming.b,
    added: local.added,
    agent: incoming.agent,
  });
  assert.deepEqual(local.removed, { x: 0, y: 0 });
  assert.equal(
    mergeCanvasPositions(local, previous, structuredClone(previous)),
    local,
  );
});

test("external edges add references/results, delete and replace IDs while preserving local edits", () => {
  const old: CanvasConnection = {
    id: "old",
    source: "a",
    target: "b",
    kind: "reference",
  };
  const changed: CanvasConnection = {
    id: "changed",
    source: "a",
    target: "c",
    kind: "reference",
  };
  const deletedLocally: CanvasConnection = {
    id: "local-delete",
    source: "b",
    target: "c",
  };
  const addedLocally: CanvasConnection = {
    id: "local-add",
    source: "c",
    target: "d",
  };
  const replacement: CanvasConnection = { ...changed, target: "d" };
  const reference: CanvasConnection = {
    id: "reference",
    source: "a",
    target: "e",
    kind: "reference",
  };
  const result: CanvasConnection = {
    id: "result",
    source: "a",
    target: "f",
    kind: "result",
  };
  const previous = [old, changed, deletedLocally];
  const local = [old, changed, addedLocally];
  const incoming = [replacement, deletedLocally, reference, result];
  assert.deepEqual(mergeCanvasEdges(local, previous, incoming), [
    replacement,
    addedLocally,
    reference,
    result,
  ]);
  assert.equal(
    mergeCanvasEdges(local, previous, structuredClone(previous)),
    local,
  );
  assert.deepEqual(local, [old, changed, addedLocally]);
  assert.deepEqual(
    mergeCanvasEdges(
      [addedLocally],
      [],
      [{ ...addedLocally, id: "remote-same-pair" }],
    ),
    [addedLocally],
  );
});

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
