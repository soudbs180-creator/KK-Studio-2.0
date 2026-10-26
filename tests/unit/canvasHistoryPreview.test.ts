import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as historyDomain from "../../src/domain/canvasHistory.ts";
import { reconcileCanvasConnections } from "../../src/domain/canvasConnections.ts";
import { reconcileProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  parseSettings,
  SETTINGS_STORAGE_KEY,
} from "../../src/domain/settings.ts";
import type { useCanvasHistory } from "../../src/components/canvas/useCanvasHistory.ts";

type Options = Parameters<typeof useCanvasHistory>[0];
type Cleanup = void | (() => void);
type Slot = {
  value?: unknown;
  set?: (value: unknown) => void;
  deps?: readonly unknown[];
  cleanup?: Cleanup;
};

// Run the real hook and domain code; only React scheduling is deterministic.
async function harness(gestureActive = false) {
  const slots: Slot[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0;
  let dirty = false;
  const calls = {
    reconcile: 0,
    connections: 0,
    fingerprint: 0,
    clone: 0,
    commit: 0,
  };
  const changed = (slot: Slot, deps?: readonly unknown[]) =>
    !deps ||
    !slot.deps ||
    deps.some((value, index) => !Object.is(value, slot.deps![index]));
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!slots[index]) {
        const slot: Slot = {
          value: typeof initial === "function" ? initial() : initial,
        };
        slot.set = (value) => {
          const next = typeof value === "function" ? value(slot.value) : value;
          if (!Object.is(slot.value, next)) dirty = true;
          slot.value = next;
        };
        slots[index] = slot;
      }
      return [slots[index].value, slots[index].set];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: { current: initial } };
      return slots[index].value;
    },
    useMemo(factory: () => unknown, deps?: readonly unknown[]) {
      const slot = (slots[cursor++] ??= {});
      if (changed(slot, deps)) {
        slot.value = factory();
        slot.deps = deps;
      }
      return slot.value;
    },
    useCallback(callback: unknown, deps?: readonly unknown[]) {
      return hooks.useMemo(() => callback, deps);
    },
    useEffect(effect: () => Cleanup, deps?: readonly unknown[]) {
      const slot = (slots[cursor++] ??= {});
      if (!changed(slot, deps)) return;
      slot.deps = deps;
      effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = effect();
      });
    },
  };
  const options: Options = {
    items: [
      { id: "a", kind: "image", title: "A", description: "" },
      { id: "b", kind: "image", title: "B", description: "" },
    ],
    positions: { a: { x: 0, y: 0 }, b: { x: 400, y: 0 } },
    edges: [{ id: "ab", source: "a", target: "b" }],
    viewport: { x: 0, y: 0, scale: 1 },
    gestureActive,
    onItemsChange: (value) => update("items", value),
    setPositions: (value) => update("positions", value),
    setEdges: (value) => update("edges", value),
    setViewport: (value) => update("viewport", value),
  };
  function update<Key extends "items" | "positions" | "edges" | "viewport">(
    key: Key,
    value: Options[Key] | ((current: Options[Key]) => Options[Key]),
  ) {
    options[key] = typeof value === "function" ? value(options[key]) : value;
    dirty = true;
  }
  const modules: Record<string, unknown> = {
    react: hooks,
    "../../domain/canvasHistory.ts": {
      ...historyDomain,
      canvasHistoryFingerprint: (
        ...args: Parameters<typeof historyDomain.canvasHistoryFingerprint>
      ) => {
        calls.fingerprint++;
        return historyDomain.canvasHistoryFingerprint(...args);
      },
      cloneCanvasHistorySnapshot: (
        ...args: Parameters<typeof historyDomain.cloneCanvasHistorySnapshot>
      ) => {
        calls.clone++;
        return historyDomain.cloneCanvasHistorySnapshot(...args);
      },
      commitCanvasHistory: (
        ...args: Parameters<typeof historyDomain.commitCanvasHistory>
      ) => {
        calls.commit++;
        return historyDomain.commitCanvasHistory(...args);
      },
    },
    "../../domain/canvasConnections.ts": {
      reconcileCanvasConnections: (
        ...args: Parameters<typeof reconcileCanvasConnections>
      ) => {
        calls.connections++;
        return reconcileCanvasConnections(...args);
      },
    },
    "../../domain/projectCanvas.ts": {
      reconcileProjectCanvas: (
        ...args: Parameters<typeof reconcileProjectCanvas>
      ) => {
        calls.reconcile++;
        return reconcileProjectCanvas(...args);
      },
    },
    "../../domain/settings.ts": { parseSettings, SETTINGS_STORAGE_KEY },
  };
  const exports: { useCanvasHistory?: typeof useCanvasHistory } = {};
  const source = await readFile(
    new URL("../../src/components/canvas/useCanvasHistory.ts", import.meta.url),
    "utf8",
  );
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      structuredClone,
      require: (name: string) => {
        assert(name in modules, `Unexpected hook dependency: ${name}`);
        return modules[name];
      },
    },
  );
  let current!: ReturnType<typeof useCanvasHistory>;
  function render(patch: Partial<Options> = {}) {
    Object.assign(options, patch);
    let iterations = 0;
    do {
      assert(++iterations < 20, "hook must settle without a render loop");
      dirty = false;
      cursor = 0;
      current = exports.useCanvasHistory!(options);
      effects.splice(0).forEach((effect) => effect());
    } while (dirty);
    return current;
  }
  render();
  return {
    options,
    calls,
    render,
    result: () => current,
    move(x: number, active = true) {
      return render({
        positions: { ...options.positions, a: { x, y: 0 } },
        gestureActive: active,
      });
    },
    resetCounts: () =>
      Object.keys(calls).forEach((key) => {
        calls[key as keyof typeof calls] = 0;
      }),
  };
}

test("100 drag previews do no history scans, then commit one undo step", async () => {
  const app = await harness();
  app.resetCounts();
  for (let x = 1; x <= 100; x++) app.move(x);
  assert.deepEqual(app.calls, {
    reconcile: 0,
    connections: 0,
    fingerprint: 0,
    clone: 0,
    commit: 0,
  });
  app.render({ gestureActive: false });
  assert.equal(app.calls.reconcile, 1);
  assert.equal(app.calls.commit, 1);
  assert.equal(app.result().canUndo, true);
  app.result().undo();
  app.render();
  assert.equal(app.options.positions.a.x, 0);
  assert.equal(app.result().canUndo, false);
  app.result().redo();
  app.render();
  assert.equal(app.options.positions.a.x, 100);
});

test("cancelled previews preserve redo and completed previews include external edits", async () => {
  const app = await harness();
  app.move(10, false);
  app.result().undo();
  app.render();
  app.move(25);
  app.move(0, false);
  assert.equal(app.result().canRedo, true);
  app.result().redo();
  app.render();
  assert.equal(app.options.positions.a.x, 10);
  app.move(40);
  app.render({ positions: { ...app.options.positions, b: { x: 500, y: 20 } } });
  app.render({ gestureActive: false });
  assert.equal(app.options.positions.b.x, 500);
  app.result().undo();
  app.render();
  assert.equal(app.options.positions.a.x, 10);
  assert.equal(app.options.positions.b.x, 400);
});

test("cancelling only the dragged node retains an external update to another node", async () => {
  const app = await harness();
  app.move(40);
  app.render({ positions: { ...app.options.positions, b: { x: 500, y: 20 } } });
  app.move(0, false);
  assert.equal(app.options.positions.a.x, 0);
  assert.equal(app.options.positions.b.x, 500);
  app.result().undo();
  app.render();
  assert.equal(app.options.positions.a.x, 0);
  assert.equal(app.options.positions.b.x, 400);
});

test("settling a generated result during previews does not revive pending content on redo", async () => {
  const app = await harness();
  const pending = {
    id: "pending",
    kind: "video" as const,
    title: "Pending",
    description: "",
    generationStatus: "pending" as const,
    generationIndex: 0,
  };
  app.render({ items: [...app.options.items, pending] });
  app.move(10, false);
  app.result().undo();
  app.render();
  app.move(40);
  app.result().settleLocalGeneration([
    {
      ...pending,
      generationStatus: "ready",
      title: "Completed",
      result: {
        id: "completed",
        kind: "video",
        title: "Completed",
        description: "",
        source: "demo",
      },
    },
  ]);
  app.render();
  app.move(0, false);
  assert.equal(app.result().canRedo, true);
  app.result().redo();
  app.render();
  assert.equal(
    app.options.items.find((item) => item.id === pending.id)?.generationStatus,
    "ready",
  );
});

test("initial active gesture and overlapping undo acknowledgement still initialize and settle", async () => {
  const app = await harness(true);
  app.render({ gestureActive: false });
  assert.equal(app.result().canUndo, false);
  app.move(10, false);
  app.result().undo();
  app.render({ gestureActive: true });
  app.move(50);
  app.render({ gestureActive: false });
  app.result().undo();
  app.render();
  assert.equal(app.options.positions.a.x, 0);
  assert.equal(app.result().canUndo, false);
  app.result().redo();
  app.render();
  assert.equal(app.options.positions.a.x, 50);
});
