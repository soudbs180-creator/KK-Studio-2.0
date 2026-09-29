import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { CanvasConnection } from "../../src/domain/canvasGraph.ts";
import type { CanvasHistorySnapshot } from "../../src/domain/canvasHistory.ts";
import {
  canvasHistoryFingerprint,
  commitCanvasHistory,
  createCanvasHistory,
  redoCanvasHistory,
  undoCanvasHistory,
} from "../../src/domain/canvasHistory.ts";

function snapshot(x: number): CanvasHistorySnapshot {
  const items: CanvasCollectionItem[] = [
    { id: "image", kind: "image", title: `图片 ${x}`, description: "demo" },
  ];
  const edges: CanvasConnection[] = [];
  return {
    items,
    positions: { image: { x, y: 20 } },
    edges,
    viewport: { x: 0, y: 0, scale: 1 },
  };
}

test("canvas history ignores identical snapshots and keeps an immutable present", () => {
  const initial = snapshot(0);
  const state = createCanvasHistory(initial, 2);
  const next = commitCanvasHistory(state, snapshot(10));
  const same = commitCanvasHistory(next, snapshot(10));
  assert.equal(same.past.length, 1);
  assert.equal(same.present.positions.image.x, 10);
  assert.notEqual(same.present, next.present);
  next.present.positions.image.x = 99;
  assert.equal(same.present.positions.image.x, 10);
});

test("canvas history undoes and redoes bounded snapshots", () => {
  let state = createCanvasHistory(snapshot(0), 2);
  state = commitCanvasHistory(state, snapshot(10));
  state = commitCanvasHistory(state, snapshot(20));
  state = commitCanvasHistory(state, snapshot(30));
  assert.deepEqual(
    state.past.map((entry) => entry.positions.image.x),
    [10, 20],
  );
  state = undoCanvasHistory(state);
  assert.equal(state.present.positions.image.x, 20);
  assert.equal(state.future[0]?.positions.image.x, 30);
  state = redoCanvasHistory(state);
  assert.equal(state.present.positions.image.x, 30);
  assert.equal(state.future.length, 0);
});

test("canvas history fingerprint includes items, graph and viewport", () => {
  assert.notEqual(
    canvasHistoryFingerprint(snapshot(1)),
    canvasHistoryFingerprint(snapshot(2)),
  );
  const changed = snapshot(1);
  changed.edges = [{ id: "edge", source: "image", target: "image" }];
  assert.notEqual(
    canvasHistoryFingerprint(snapshot(1)),
    canvasHistoryFingerprint(changed),
  );
});
