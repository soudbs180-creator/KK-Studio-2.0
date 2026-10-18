import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  CANVAS_SNAP_GRID,
  isInteractiveTarget,
  resolveTargetNodeIds,
  useCanvasPointer,
} from "../../src/components/canvas/useCanvasPointer.ts";
import { shadowEventBus } from "../../src/features/sync/shadowEventBus.ts";

test("CANVAS_SNAP_GRID is 16", () => {
  assert.equal(CANVAS_SNAP_GRID, 16);
});

test("isInteractiveTarget identifies interactive form elements and non-drag elements", () => {
  assert.equal(isInteractiveTarget(null), false);

  const mockTarget = (tag: string, attrs: Record<string, string> = {}) => {
    return {
      closest(selector: string) {
        const selectors = selector.split(",").map((s) => s.trim());
        if (selectors.includes(tag.toLowerCase())) return true;
        for (const [k, v] of Object.entries(attrs)) {
          if (selectors.includes(`[${k}]`) || selectors.includes(`[${k}='${v}']`)) {
            return true;
          }
        }
        return null;
      },
    };
  };

  const originalElement = globalThis.Element;
  try {
    class MockElement {}
    globalThis.Element = MockElement as unknown as typeof Element;

    const btn = Object.setPrototypeOf(mockTarget("button"), MockElement.prototype);
    assert.equal(isInteractiveTarget(btn), true);

    const input = Object.setPrototypeOf(mockTarget("input"), MockElement.prototype);
    assert.equal(isInteractiveTarget(input), true);

    const textarea = Object.setPrototypeOf(mockTarget("textarea"), MockElement.prototype);
    assert.equal(isInteractiveTarget(textarea), true);

    const noDrag = Object.setPrototypeOf(
      mockTarget("div", { "data-no-node-drag": "true" }),
      MockElement.prototype,
    );
    assert.equal(isInteractiveTarget(noDrag), true);

    const plainDiv = Object.setPrototypeOf(mockTarget("div"), MockElement.prototype);
    assert.equal(isInteractiveTarget(plainDiv), false);
  } finally {
    globalThis.Element = originalElement;
  }
});

test("resolveTargetNodeIds resolves target ids based on drag state and selection", () => {
  // Single node drag outside selection
  const d1 = { nodeId: "a", selection: new Set(["b", "c"]) };
  assert.deepEqual([...resolveTargetNodeIds(d1 as unknown as Parameters<typeof resolveTargetNodeIds>[0])], ["a"]);

  // Multi-node drag with nodeId in selection
  const d2 = { nodeId: "a", selection: new Set(["a", "b"]) };
  assert.deepEqual([...resolveTargetNodeIds(d2 as unknown as Parameters<typeof resolveTargetNodeIds>[0])], ["a", "b"]);

  // Gesture with undefined nodeId (e.g. marquee)
  const d3 = { nodeId: undefined, selection: new Set(["x", "y"]) };
  assert.deepEqual([...resolveTargetNodeIds(d3 as unknown as Parameters<typeof resolveTargetNodeIds>[0])], ["x", "y"]);
});

function createTestHarness(initialNodes = { a: { x: 10, y: 20 } }) {
  let hookResult: ReturnType<typeof useCanvasPointer> | null = null;
  let currentNodes = { ...initialNodes };
  let selected: string | null = null;
  const fakeCanvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    focus: () => {},
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
  };

  function TestComponent() {
    hookResult = useCanvasPointer({
      containerRef: { current: fakeCanvas as unknown as HTMLDivElement },
      nodes: currentNodes,
      setNodes: (updater) => {
        currentNodes = typeof updater === "function" ? updater(currentNodes) : updater;
      },
      transform: { x: 0, y: 0, scale: 1 },
      setTransform: () => {},
      selectedNode: selected,
      setSelectedNode: (val) => {
        selected = typeof val === "function" ? val(selected) : val;
      },
      snapEnabled: false,
    });
    return React.createElement("div");
  }

  renderToString(React.createElement(TestComponent));
  return {
    get hook() {
      return hookResult!;
    },
    get nodes() {
      return currentNodes;
    },
    get selected() {
      return selected;
    },
    fakeCanvas,
  };
}

test("useCanvasPointer handles node dragging, RAF throttling, and finishPointer emission", () => {
  const harness = createTestHarness();
  const emitted: unknown[] = [];
  const unsub = shadowEventBus.subscribe((evt) => emitted.push(evt));

  try {
    // 1. Start drag on node 'a' at (100, 100)
    harness.hook.startNodeDrag(
      {
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: harness.fakeCanvas,
        currentTarget: harness.fakeCanvas,
      } as unknown as React.PointerEvent<HTMLDivElement>,
      "a",
    );

    assert.equal(harness.hook.dragRef.current?.nodeId, "a");

    // 2. High frequency moves
    harness.hook.movePointer({
      pointerId: 1,
      clientX: 120,
      clientY: 130,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>);

    harness.hook.movePointer({
      pointerId: 1,
      clientX: 150,
      clientY: 160,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>);

    // 3. Finish drag at (150, 160)
    harness.hook.finishPointer({
      type: "pointerup",
      pointerId: 1,
      clientX: 150,
      clientY: 160,
    } as unknown as React.PointerEvent<HTMLDivElement>);

    // Final position should reflect delta (150 - 100, 160 - 100) = (+50, +60)
    assert.deepEqual(harness.nodes.a, { x: 60, y: 80 });
    assert.equal(emitted.length, 1);
    assert.equal(
      (emitted[0] as { eventType: string }).eventType,
      "canvas.node.moved",
    );
  } finally {
    unsub();
  }
});

test("useCanvasPointer cancels jitter on small click movement", () => {
  const harness = createTestHarness();
  const emitted: unknown[] = [];
  const unsub = shadowEventBus.subscribe((evt) => emitted.push(evt));

  try {
    // Start drag on node 'a' at (100, 100)
    harness.hook.startNodeDrag(
      {
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: harness.fakeCanvas,
        currentTarget: harness.fakeCanvas,
      } as unknown as React.PointerEvent<HTMLDivElement>,
      "a",
    );

    // Jitter of 2px (<= 4px threshold)
    harness.hook.movePointer({
      pointerId: 1,
      clientX: 102,
      clientY: 101,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>);

    // Pointer up
    harness.hook.finishPointer({
      type: "pointerup",
      pointerId: 1,
      clientX: 102,
      clientY: 101,
    } as unknown as React.PointerEvent<HTMLDivElement>);

    // Node must not move, no move event emitted, node selected
    assert.deepEqual(harness.nodes.a, { x: 10, y: 20 });
    assert.equal(emitted.length, 0);
    assert.equal(harness.selected, "a");
  } finally {
    unsub();
  }
});

test("useCanvasPointer reverts gesture on cancelGesture", () => {
  const harness = createTestHarness();

  harness.hook.startNodeDrag(
    {
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {},
      target: harness.fakeCanvas,
      currentTarget: harness.fakeCanvas,
    } as unknown as React.PointerEvent<HTMLDivElement>,
    "a",
  );

  assert.equal(harness.hook.dragRef.current?.nodeId, "a");

  harness.hook.cancelGesture();

  assert.equal(harness.hook.dragRef.current, null);
  assert.deepEqual(harness.nodes.a, { x: 10, y: 20 });
});
