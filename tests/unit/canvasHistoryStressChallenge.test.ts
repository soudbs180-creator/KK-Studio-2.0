import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { CanvasConnection } from "../../src/domain/canvasGraph.ts";
import type {
  CanvasHistorySnapshot,
  CanvasHistoryState,
} from "../../src/domain/canvasHistory.ts";
import {
  commitCanvasHistory,
  createCanvasHistory,
  undoCanvasHistory,
  redoCanvasHistory,
} from "../../src/domain/canvasHistory.ts";
import {
  clampHistoryLimit,
  truncateCanvasHistoryPast,
  getEffectiveLimit,
} from "../../src/features/canvas/useCanvasHistory.ts";

function createMockSnapshot(id: number | string, x = 0): CanvasHistorySnapshot {
  const items: CanvasCollectionItem[] = [
    {
      id: `item-${id}`,
      kind: "image",
      title: `Item ${id}`,
      description: `desc-${id}`,
      updatedAt: id.toString(),
    },
  ];
  const edges: CanvasConnection[] = [];
  return {
    items,
    positions: { [`item-${id}`]: { x, y: 100 } },
    edges,
    viewport: { x: Number(id), y: 0, scale: 1 },
  };
}

/** Invariant checker ensuring history stack is never unbounded, corrupted, or NaN */
function assertHistoryInvariants(
  state: CanvasHistoryState,
  expectedMaxLimit?: number,
) {
  assert.ok(state, "History state must exist");
  assert.ok(typeof state.limit === "number", "Limit must be a number");
  assert.ok(!Number.isNaN(state.limit), "Limit must not be NaN");
  assert.ok(Number.isFinite(state.limit), "Limit must be finite");
  assert.ok(state.limit >= 1, `Limit must be >= 1, got ${state.limit}`);
  if (expectedMaxLimit !== undefined) {
    assert.ok(
      state.limit <= expectedMaxLimit,
      `Limit ${state.limit} exceeded expected max ${expectedMaxLimit}`,
    );
  }

  // Past stack boundedness and validity
  assert.ok(Array.isArray(state.past), "Past must be an array");
  assert.ok(
    state.past.length <= state.limit,
    `Past stack length (${state.past.length}) exceeded limit (${state.limit})`,
  );
  for (let i = 0; i < state.past.length; i++) {
    const snap = state.past[i];
    assert.ok(snap, `Past entry at index ${i} must not be null/undefined`);
    assert.ok(
      Array.isArray(snap.items),
      `Past entry ${i} items must be an array`,
    );
    assert.ok(
      snap.positions && typeof snap.positions === "object",
      `Past entry ${i} positions valid`,
    );
    assert.ok(
      snap.viewport && typeof snap.viewport === "object",
      `Past entry ${i} viewport valid`,
    );
  }

  // Present validity
  assert.ok(state.present, "Present snapshot must not be null/undefined");
  assert.ok(
    Array.isArray(state.present.items),
    "Present items must be an array",
  );
  assert.ok(
    state.present.positions && typeof state.present.positions === "object",
    "Present positions valid",
  );

  // Future stack boundedness and validity
  assert.ok(Array.isArray(state.future), "Future must be an array");
  assert.ok(
    state.future.length <= state.limit,
    `Future stack length (${state.future.length}) exceeded limit (${state.limit})`,
  );
  for (let i = 0; i < state.future.length; i++) {
    const snap = state.future[i];
    assert.ok(snap, `Future entry at index ${i} must not be null/undefined`);
    assert.ok(
      Array.isArray(snap.items),
      `Future entry ${i} items must be an array`,
    );
    assert.ok(
      snap.positions && typeof snap.positions === "object",
      `Future entry ${i} positions valid`,
    );
    assert.ok(
      snap.viewport && typeof snap.viewport === "object",
      `Future entry ${i} viewport valid`,
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Extreme Values & Boundary Test for clampHistoryLimit
// ---------------------------------------------------------------------------
test("CHALLENGE 1: clampHistoryLimit handles exhaustive boundary and extreme values", () => {
  // Extreme negatives
  assert.equal(clampHistoryLimit(-1), 5);
  assert.equal(clampHistoryLimit(-10), 5);
  assert.equal(clampHistoryLimit(-999999), 5);
  assert.equal(clampHistoryLimit(Number.MIN_SAFE_INTEGER), 5);

  // Zero
  assert.equal(clampHistoryLimit(0), 5);
  assert.equal(clampHistoryLimit(-0), 5);

  // Sub-boundary positive integers
  assert.equal(clampHistoryLimit(1), 5);
  assert.equal(clampHistoryLimit(2), 5);
  assert.equal(clampHistoryLimit(3), 5);
  assert.equal(clampHistoryLimit(4), 5);

  // Exact bounds
  assert.equal(clampHistoryLimit(5), 5);
  assert.equal(clampHistoryLimit(100), 100);

  // Intermediate values
  assert.equal(clampHistoryLimit(6), 6);
  assert.equal(clampHistoryLimit(20), 20);
  assert.equal(clampHistoryLimit(99), 99);

  // Upper boundary and extreme positives
  assert.equal(clampHistoryLimit(101), 100);
  assert.equal(clampHistoryLimit(1000), 100);
  assert.equal(clampHistoryLimit(999999), 100);
  assert.equal(clampHistoryLimit(Number.MAX_SAFE_INTEGER), 100);

  // Floating point values (should floor)
  assert.equal(clampHistoryLimit(4.999), 5);
  assert.equal(clampHistoryLimit(5.001), 5);
  assert.equal(clampHistoryLimit(5.999), 5);
  assert.equal(clampHistoryLimit(20.7), 20);
  assert.equal(clampHistoryLimit(99.99), 99);
  assert.equal(clampHistoryLimit(100.99), 100);

  // NaN and Infinities
  assert.equal(clampHistoryLimit(NaN), 20);
  assert.equal(clampHistoryLimit(Infinity), 20);
  assert.equal(clampHistoryLimit(-Infinity), 20);

  // Null, undefined, empty string
  assert.equal(clampHistoryLimit(null), 20);
  assert.equal(clampHistoryLimit(undefined), 20);
  assert.equal(clampHistoryLimit(""), 20);

  // Whitespace & Non-numeric strings
  assert.equal(clampHistoryLimit("   "), 5); // Number("   ") is 0 -> clamped to 5
  assert.equal(clampHistoryLimit("foo"), 20);
  assert.equal(clampHistoryLimit("100abc"), 20);

  // Numeric string parsing
  assert.equal(clampHistoryLimit("-50"), 5);
  assert.equal(clampHistoryLimit("0"), 5);
  assert.equal(clampHistoryLimit("5"), 5);
  assert.equal(clampHistoryLimit("42"), 42);
  assert.equal(clampHistoryLimit("100"), 100);
  assert.equal(clampHistoryLimit("1000"), 100);

  // Objects, booleans and arrays
  assert.equal(clampHistoryLimit(true), 5); // Number(true) = 1 -> 5
  assert.equal(clampHistoryLimit(false), 5); // Number(false) = 0 -> 5
  assert.equal(clampHistoryLimit({}), 20); // Number({}) = NaN -> 20
  assert.equal(clampHistoryLimit([]), 5); // Number([]) = 0 -> 5
  assert.equal(clampHistoryLimit([50]), 50); // Number([50]) = 50
  assert.equal(clampHistoryLimit([10, 20]), 20); // Number([10, 20]) = NaN -> 20
});

// ---------------------------------------------------------------------------
// 2. Boundary Test for getEffectiveLimit
// ---------------------------------------------------------------------------
test("CHALLENGE 2: getEffectiveLimit handles boundary inputs safely", () => {
  assert.equal(getEffectiveLimit(1000), 100);
  assert.equal(getEffectiveLimit(50), 50);
  assert.equal(getEffectiveLimit(5), 5);
  assert.equal(getEffectiveLimit(1), 5); // 1 is > 0, clamped to 5

  // 0 and negative numbers fall back to settings/default (20 in node env)
  assert.equal(getEffectiveLimit(0), 20);
  assert.equal(getEffectiveLimit(-10), 20);
  assert.equal(getEffectiveLimit(undefined), 20);
  assert.equal(getEffectiveLimit(NaN), 20);
});

// ---------------------------------------------------------------------------
// 3. Stress Harness: 1000 Rapid Events Interleaved with Commits and Undo/Redo
// ---------------------------------------------------------------------------
test("CHALLENGE 3: 1000 Rapid kk:settings-changed events while committing snapshots", () => {
  let state = createCanvasHistory(createMockSnapshot("init", 0), 20);
  assertHistoryInvariants(state, 100);

  const testLimits = [
    -100,
    -1,
    0,
    1,
    4,
    5,
    6,
    10,
    20,
    45,
    99,
    100,
    101,
    500,
    1000,
    NaN,
    "50",
    "-5",
    "abc",
    null,
    undefined,
  ];
  let commitCount = 0;

  for (let i = 0; i < 1000; i++) {
    // 1. Pick a random extreme or boundary limit
    const rawLimit = testLimits[i % testLimits.length];
    const targetLimit = clampHistoryLimit(rawLimit);

    // 2. Dynamically apply settings change & truncation
    state = truncateCanvasHistoryPast(state, targetLimit);
    assert.equal(state.limit, targetLimit);
    assertHistoryInvariants(state, 100);

    // 3. Commit snapshots (1 to 3 snapshots)
    const commitBatch = (i % 3) + 1;
    for (let c = 0; c < commitBatch; c++) {
      commitCount++;
      state = commitCanvasHistory(
        state,
        createMockSnapshot(`snap-${commitCount}`, commitCount * 10),
      );
      assertHistoryInvariants(state, 100);
      assert.ok(
        state.past.length <= state.limit,
        `Past (${state.past.length}) <= Limit (${state.limit})`,
      );
      assert.equal(
        state.future.length,
        0,
        "Commit must always clear future stack",
      );
    }

    // 4. Interleave undo and redo operations
    if (i % 4 === 0 && state.past.length > 0) {
      const undoSteps = Math.min(state.past.length, 3);
      for (let u = 0; u < undoSteps; u++) {
        state = undoCanvasHistory(state);
        assertHistoryInvariants(state, 100);
      }
      // Redo some of them
      const redoSteps = Math.min(state.future.length, 2);
      for (let r = 0; r < redoSteps; r++) {
        state = redoCanvasHistory(state);
        assertHistoryInvariants(state, 100);
      }
    }

    // 5. Verify invariant again after entire iteration
    assertHistoryInvariants(state, 100);
  }

  // Final sanity check after 1000 stress cycles
  assert.ok(state.past.length <= 100);
  assert.ok(state.future.length <= 100);
  assert.ok(state.past.length <= state.limit);
});

// ---------------------------------------------------------------------------
// 4. History Stack Integrity & Non-corruption Oracle
// ---------------------------------------------------------------------------
test("CHALLENGE 4: Sequential Oracle verifies no corruption, state drift or unboundedness", () => {
  // Start with limit 10
  let state = createCanvasHistory(createMockSnapshot(0, 0), 10);
  assert.equal(state.limit, 10);

  // Commit 15 items: indices 1 to 15
  for (let i = 1; i <= 15; i++) {
    state = commitCanvasHistory(state, createMockSnapshot(i, i * 100));
  }
  // Past should be strictly clamped to the last 10 snapshots: 5..14
  assert.equal(state.past.length, 10);
  assert.deepEqual(
    state.past.map((s) => s.positions[Object.keys(s.positions)[0]].x),
    [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400],
  );
  assert.equal(state.present.positions["item-15"]?.x, 1500);

  // Dynamic shrink to limit = 5
  state = truncateCanvasHistoryPast(state, 5);
  assert.equal(state.limit, 5);
  assert.equal(state.past.length, 5);
  // Must preserve most recent 5 snapshots: 10..14
  assert.deepEqual(
    state.past.map((s) => s.positions[Object.keys(s.positions)[0]].x),
    [1000, 1100, 1200, 1300, 1400],
  );

  // Undo 3 times
  state = undoCanvasHistory(state); // past: 10..13, present: 14, future: [15]
  state = undoCanvasHistory(state); // past: 10..12, present: 13, future: [14, 15]
  state = undoCanvasHistory(state); // past: 10..11, present: 12, future: [13, 14, 15]
  assert.equal(state.past.length, 2);
  assert.equal(state.future.length, 3);
  assert.equal(state.present.positions["item-12"]?.x, 1200);

  // Redo 2 times
  state = redoCanvasHistory(state); // past: 10..12, present: 13, future: [14, 15]
  state = redoCanvasHistory(state); // past: 10..13, present: 14, future: [15]
  assert.equal(state.past.length, 4);
  assert.equal(state.future.length, 1);
  assert.equal(state.present.positions["item-14"]?.x, 1400);

  // Branching commit: committing item-99 resets future to empty
  state = commitCanvasHistory(state, createMockSnapshot(99, 9900));
  assert.equal(state.future.length, 0);
  assert.equal(state.present.positions["item-99"]?.x, 9900);
  assert.equal(state.past.length, 5); // capacity of 5 was maintained
  assert.deepEqual(
    state.past.map((s) => s.positions[Object.keys(s.positions)[0]].x),
    [1000, 1100, 1200, 1300, 1400],
  );
});

// ---------------------------------------------------------------------------
// 5. TopBar Event Bridge Simulation & Edge Boundaries
// ---------------------------------------------------------------------------
test("CHALLENGE 5: TopBar event bridge dispatches correct custom events and handles edge cases", () => {
  const eventTarget = new EventTarget();
  let undoEventsFired = 0;
  let redoEventsFired = 0;

  const undoListener = () => {
    undoEventsFired++;
  };
  const redoListener = () => {
    redoEventsFired++;
  };

  eventTarget.addEventListener("kk:canvas-undo", undoListener);
  eventTarget.addEventListener("kk:canvas-redo", redoListener);

  // Emulate TopBar.tsx logic
  const triggerUndo = (onUndo?: () => void) => {
    if (onUndo) onUndo();
    else eventTarget.dispatchEvent(new CustomEvent("kk:canvas-undo"));
  };
  const triggerRedo = (onRedo?: () => void) => {
    if (onRedo) onRedo();
    else eventTarget.dispatchEvent(new CustomEvent("kk:canvas-redo"));
  };

  // Case A: With explicit props (should bypass CustomEvent)
  let propUndoCalled = false;
  let propRedoCalled = false;
  triggerUndo(() => {
    propUndoCalled = true;
  });
  triggerRedo(() => {
    propRedoCalled = true;
  });
  assert.equal(propUndoCalled, true);
  assert.equal(propRedoCalled, true);
  assert.equal(undoEventsFired, 0);
  assert.equal(redoEventsFired, 0);

  // Case B: Without explicit props (TopBar fallback event bridge)
  triggerUndo(undefined);
  triggerRedo(undefined);
  assert.equal(undoEventsFired, 1);
  assert.equal(redoEventsFired, 1);

  // Case C: Rapid fire 100 undo events on empty history (safe no-op)
  let emptyState = createCanvasHistory(createMockSnapshot("zero", 0), 20);
  for (let i = 0; i < 100; i++) {
    emptyState = undoCanvasHistory(emptyState);
    assertHistoryInvariants(emptyState);
    assert.equal(emptyState.past.length, 0);
    assert.equal(emptyState.future.length, 0);
  }

  // Case D: Rapid fire 100 redo events on empty future (safe no-op)
  for (let i = 0; i < 100; i++) {
    emptyState = redoCanvasHistory(emptyState);
    assertHistoryInvariants(emptyState);
    assert.equal(emptyState.past.length, 0);
    assert.equal(emptyState.future.length, 0);
  }

  // Cleanup listeners
  eventTarget.removeEventListener("kk:canvas-undo", undoListener);
  eventTarget.removeEventListener("kk:canvas-redo", redoListener);
  triggerUndo(undefined);
  assert.equal(
    undoEventsFired,
    1,
    "Listener was removed, counter should not increase",
  );
});

// ---------------------------------------------------------------------------
// 6. Snapshot Immutability & Reference Isolation Barrier
// ---------------------------------------------------------------------------
test("CHALLENGE 6: History snapshots are immutable clones and prevent external corruption", () => {
  const snap1 = createMockSnapshot("mut-1", 100);
  let state = createCanvasHistory(snap1, 10);

  // External mutation to source object
  snap1.positions["item-mut-1"].x = 999999;
  snap1.items[0].title = "Corrupted Title";
  assert.equal(state.present.positions["item-mut-1"].x, 100);
  assert.equal(state.present.items[0].title, "Item mut-1");

  // Commit second snapshot
  const snap2 = createMockSnapshot("mut-2", 200);
  state = commitCanvasHistory(state, snap2);

  // External mutation to snap2 input object
  snap2.positions["item-mut-2"].x = 888888;
  snap2.items[0].title = "Corrupted Snap 2";
  assert.equal(state.present.positions["item-mut-2"].x, 200);
  assert.equal(state.present.items[0].title, "Item mut-2");

  // Undo restores past snapshot as present (cloned)
  const undone = undoCanvasHistory(state);
  assert.equal(undone.present.positions["item-mut-1"].x, 100);

  // Mutating undone.present does not corrupt the future snapshot
  undone.present.positions["item-mut-1"].x = 777777;
  const redone = redoCanvasHistory(undone);
  assert.equal(redone.present.positions["item-mut-2"].x, 200);
});

// ---------------------------------------------------------------------------
// 7. Event Detail Schema Permutations for kk:settings-changed
// ---------------------------------------------------------------------------
test("CHALLENGE 7: kk:settings-changed handles all dispatch formats safely", () => {
  const parseIncoming = (detail: unknown) => {
    const obj =
      typeof detail === "object" && detail !== null
        ? (detail as Record<string, unknown>)
        : undefined;
    const pref =
      typeof obj?.preferences === "object" && obj?.preferences !== null
        ? (obj.preferences as Record<string, unknown>)
        : undefined;
    const rawLimit =
      obj?.historyLimit ??
      pref?.historyLimit ??
      (typeof detail === "number" ? detail : undefined);
    return rawLimit !== undefined
      ? clampHistoryLimit(Number(rawLimit))
      : undefined;
  };

  // Format 1: Direct SettingsPreferences { historyLimit: 45, theme: 'dark' }
  assert.equal(parseIncoming({ historyLimit: 45 }), 45);
  assert.equal(parseIncoming({ historyLimit: 0 }), 5);
  assert.equal(parseIncoming({ historyLimit: -20 }), 5);
  assert.equal(parseIncoming({ historyLimit: 1000 }), 100);
  assert.equal(parseIncoming({ historyLimit: NaN }), 20);

  // Format 2: Nested preferences { preferences: { historyLimit: 60 } }
  assert.equal(parseIncoming({ preferences: { historyLimit: 60 } }), 60);
  assert.equal(parseIncoming({ preferences: { historyLimit: 2 } }), 5);
  assert.equal(parseIncoming({ preferences: { historyLimit: 500 } }), 100);

  // Format 3: Raw numeric payload 75
  assert.equal(parseIncoming(75), 75);
  assert.equal(parseIncoming(0), 5);
  assert.equal(parseIncoming(-1), 5);
  assert.equal(parseIncoming(999), 100);

  // Format 4: Empty or irrelevant events
  assert.equal(parseIncoming({}), undefined);
  assert.equal(parseIncoming(null), undefined);
  assert.equal(parseIncoming(undefined), undefined);
  assert.equal(parseIncoming({ theme: "dark" }), undefined);
});

// ---------------------------------------------------------------------------
// 8. 10,000 Snapshot Unboundedness & Memory Stress Harness
// ---------------------------------------------------------------------------
test("CHALLENGE 8: 10,000 Snapshot commit stress never leaks memory or exceeds limit", () => {
  let state = createCanvasHistory(createMockSnapshot("stress-0", 0), 25);

  const limits = [5, 10, 20, 50, 100];
  for (let i = 1; i <= 10000; i++) {
    // Switch limit every 500 commits
    if (i % 500 === 0) {
      const newLimit = limits[(i / 500) % limits.length];
      state = truncateCanvasHistoryPast(state, newLimit);
    }

    state = commitCanvasHistory(state, createMockSnapshot(`stress-${i}`, i));

    if (i % 1000 === 0) {
      assertHistoryInvariants(state, 100);
      assert.ok(state.past.length <= state.limit);
      assert.equal(state.future.length, 0);
    }
  }

  assert.ok(state.past.length <= 100);
  assert.equal(state.present.positions["item-stress-10000"]?.x, 10000);
});
