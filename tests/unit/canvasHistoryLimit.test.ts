import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { CanvasConnection } from "../../src/domain/canvasGraph.ts";
import type { CanvasHistorySnapshot } from "../../src/domain/canvasHistory.ts";
import {
  commitCanvasHistory,
  createCanvasHistory,
  undoCanvasHistory,
} from "../../src/domain/canvasHistory.ts";
import {
  clampHistoryLimit,
  truncateCanvasHistoryPast,
  getEffectiveLimit,
} from "../../src/features/canvas/useCanvasHistory.ts";

function createMockSnapshot(x: number): CanvasHistorySnapshot {
  const items: CanvasCollectionItem[] = [
    { id: `item-${x}`, kind: "image", title: `图片 ${x}`, description: `demo-${x}` },
  ];
  const edges: CanvasConnection[] = [];
  return {
    items,
    positions: { [`item-${x}`]: { x, y: 10 } },
    edges,
    viewport: { x: 0, y: 0, scale: 1 },
  };
}

test("clampHistoryLimit correctly clamps values between 5 and 100 with default 20", () => {
  // Lower bound clamping (< 5)
  assert.equal(clampHistoryLimit(0), 5);
  assert.equal(clampHistoryLimit(-10), 5);
  assert.equal(clampHistoryLimit(1), 5);
  assert.equal(clampHistoryLimit(4), 5);
  assert.equal(clampHistoryLimit(4.9), 5);

  // Upper bound clamping (> 100)
  assert.equal(clampHistoryLimit(101), 100);
  assert.equal(clampHistoryLimit(200), 100);
  assert.equal(clampHistoryLimit(9999), 100);

  // Exact boundaries
  assert.equal(clampHistoryLimit(5), 5);
  assert.equal(clampHistoryLimit(100), 100);

  // Valid values within range
  assert.equal(clampHistoryLimit(20), 20);
  assert.equal(clampHistoryLimit(45), 45);
  assert.equal(clampHistoryLimit(50), 50);

  // Floats are floored
  assert.equal(clampHistoryLimit(25.8), 25);

  // Invalid / non-numeric fallbacks to default 20
  assert.equal(clampHistoryLimit(NaN), 20);
  assert.equal(clampHistoryLimit(null), 20);
  assert.equal(clampHistoryLimit(undefined), 20);
  assert.equal(clampHistoryLimit("invalid"), 20);

  // String numeric conversions
  assert.equal(clampHistoryLimit("45"), 45);
  assert.equal(clampHistoryLimit("2"), 5);
  assert.equal(clampHistoryLimit("150"), 100);
});

test("getEffectiveLimit returns customLimit clamped or default 20", () => {
  assert.equal(getEffectiveLimit(30), 30);
  assert.equal(getEffectiveLimit(2), 5);
  assert.equal(getEffectiveLimit(200), 100);
  // Undefined in Node environment without window falls back to default 20
  assert.equal(getEffectiveLimit(undefined), 20);
});

test("truncateCanvasHistoryPast truncates history past stack when new limit is smaller", () => {
  let state = createCanvasHistory(createMockSnapshot(0), 30);
  for (let i = 1; i <= 25; i++) {
    state = commitCanvasHistory(state, createMockSnapshot(i));
  }
  assert.equal(state.past.length, 25);
  assert.equal(state.limit, 30);

  // Truncate past stack to new limit of 10
  const truncated = truncateCanvasHistoryPast(state, 10);
  assert.equal(truncated.limit, 10);
  assert.equal(truncated.past.length, 10);
  // Verify that it retained the most recent 10 snapshots (from 15 to 24)
  assert.deepEqual(
    truncated.past.map((s) => s.positions[Object.keys(s.positions)[0]].x),
    [15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  );
  // Present remains unaffected
  assert.equal(truncated.present.positions["item-25"]?.x, 25);
});

test("truncateCanvasHistoryPast clamps out-of-bounds new limit", () => {
  let state = createCanvasHistory(createMockSnapshot(0), 20);
  for (let i = 1; i <= 15; i++) {
    state = commitCanvasHistory(state, createMockSnapshot(i));
  }
  assert.equal(state.past.length, 15);

  // Requesting limit of 2 clamps to 5
  const clampedLow = truncateCanvasHistoryPast(state, 2);
  assert.equal(clampedLow.limit, 5);
  assert.equal(clampedLow.past.length, 5);
  assert.deepEqual(
    clampedLow.past.map((s) => s.positions[Object.keys(s.positions)[0]].x),
    [10, 11, 12, 13, 14],
  );

  // Requesting limit of 500 clamps to 100
  const clampedHigh = truncateCanvasHistoryPast(clampedLow, 500);
  assert.equal(clampedHigh.limit, 100);
  assert.equal(clampedHigh.past.length, 5); // Doesn't create items, retains existing
});

test("truncateCanvasHistoryPast handles future stack truncation on limit shrink", () => {
  let state = createCanvasHistory(createMockSnapshot(0), 20);
  for (let i = 1; i <= 10; i++) {
    state = commitCanvasHistory(state, createMockSnapshot(i));
  }
  // Undo 8 times to populate future stack
  for (let i = 0; i < 8; i++) {
    state = undoCanvasHistory(state);
  }
  assert.equal(state.future.length, 8);
  assert.equal(state.past.length, 2);

  // Shrink limit to 5
  const truncated = truncateCanvasHistoryPast(state, 5);
  assert.equal(truncated.limit, 5);
  assert.equal(truncated.future.length, 5);
  assert.equal(truncated.past.length, 2);
});

test("subsequent commits after dynamic limit update respect the new limit", () => {
  let state = createCanvasHistory(createMockSnapshot(0), 20);
  for (let i = 1; i <= 15; i++) {
    state = commitCanvasHistory(state, createMockSnapshot(i));
  }
  assert.equal(state.past.length, 15);

  // Update limit to 6
  state = truncateCanvasHistoryPast(state, 6);
  assert.equal(state.past.length, 6);

  // Committing new snapshot with updated state.limit keeps past at 6
  state = commitCanvasHistory(state, createMockSnapshot(16));
  assert.equal(state.past.length, 6);
  assert.deepEqual(
    state.past.map((s) => s.positions[Object.keys(s.positions)[0]].x),
    [10, 11, 12, 13, 14, 15],
  );
  assert.equal(state.present.positions["item-16"]?.x, 16);

  // Expand limit to 8
  state = truncateCanvasHistoryPast(state, 8);
  assert.equal(state.limit, 8);
  state = commitCanvasHistory(state, createMockSnapshot(17));
  assert.equal(state.past.length, 7);
  state = commitCanvasHistory(state, createMockSnapshot(18));
  assert.equal(state.past.length, 8);
  state = commitCanvasHistory(state, createMockSnapshot(19));
  assert.equal(state.past.length, 8); // At capacity of 8
});

test("kk:settings-changed event adjusts limit and truncates past stack", () => {
  const target = new EventTarget();
  let history = createCanvasHistory(createMockSnapshot(0), 30);
  for (let i = 1; i <= 20; i++) {
    history = commitCanvasHistory(history, createMockSnapshot(i));
  }
  assert.equal(history.past.length, 20);

  const onSettingsChanged = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const rawLimit = detail?.historyLimit ?? detail?.preferences?.historyLimit;
    const nextLimit = clampHistoryLimit(rawLimit);
    history = truncateCanvasHistoryPast(history, nextLimit);
  };

  target.addEventListener("kk:settings-changed", onSettingsChanged);

  target.dispatchEvent(
    new CustomEvent("kk:settings-changed", {
      detail: { historyLimit: 8 },
    }),
  );

  assert.equal(history.limit, 8);
  assert.equal(history.past.length, 8);
});

