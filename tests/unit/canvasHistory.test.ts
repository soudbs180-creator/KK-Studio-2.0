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

test("tag-only edits update the present without adding an undo step, and survive deletion undo", () => {
  const initial = snapshot(0);
  const tagged = {
    ...initial,
    items: initial.items.map((item) => ({ ...item, tags: ["人物"] })),
  };
  assert.equal(
    canvasHistoryFingerprint(initial),
    canvasHistoryFingerprint(tagged),
  );
  let state = commitCanvasHistory(createCanvasHistory(initial), tagged);
  assert.deepEqual(state.present.items[0].tags, ["人物"]);
  assert.equal(state.past.length, 0, "tags are not a canvas undo step");
  state = commitCanvasHistory(state, { ...tagged, items: [], positions: {} });
  tagged.items[0].tags.push("外部变更");
  const restored = undoCanvasHistory(state);
  assert.deepEqual(restored.present.items[0].tags, ["人物"]);
  assert.equal(restored.present.items[0].title, initial.items[0].title);
  assert.deepEqual(restored.present.positions, initial.positions);
  assert.equal(redoCanvasHistory(restored).present.items.length, 0);
  assert.equal(initial.items[0].tags, undefined, "input stays immutable");
});

test("tag changes and clearing survive old past/future frames without consuming redo", () => {
  const initial = snapshot(0);
  const moved = snapshot(10);
  const beforeTags = commitCanvasHistory(createCanvasHistory(initial), moved);
  let state = undoCanvasHistory(beforeTags);
  const tagged = {
    ...state.present,
    items: state.present.items.map((item) => ({ ...item, tags: ["人物"] })),
  };
  state = commitCanvasHistory(state, tagged);
  assert.equal(state.future.length, 1, "metadata preserves redo");
  state = redoCanvasHistory(state);
  assert.deepEqual(state.present.items[0].tags, ["人物"]);
  assert.deepEqual(state.present.positions, moved.positions);
  const cleared = {
    ...state.present,
    items: state.present.items.map((item) => ({ ...item, tags: [] })),
  };
  state = commitCanvasHistory(state, cleared);
  state = undoCanvasHistory(state);
  assert.deepEqual(state.present.items[0].tags, []);
  assert.deepEqual(state.present.positions, initial.positions);
  assert.deepEqual(redoCanvasHistory(state).present.items[0].tags, []);
  assert.equal(
    beforeTags.present.items[0].tags,
    undefined,
    "history input stays immutable",
  );
});
