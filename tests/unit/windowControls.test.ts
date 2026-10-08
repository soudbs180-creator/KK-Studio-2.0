import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Element = {
  type: unknown;
  props: { children?: unknown; [key: string]: unknown };
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

// Execute the real component; replace only React lifecycle and native IO.
// Assertions inspect its rendered controls, not private synchronization state.
async function harness(
  options: {
    holdSubscription?: boolean;
    holdToggle?: boolean;
    stop?: () => void | Promise<void>;
  } = {},
) {
  const slots: unknown[] = [];
  const effects: (() => void | (() => void))[] = [];
  const cleanups: (() => void)[] = [];
  let cursor = 0;
  let alive = true;
  let lateWrites = 0;
  let nativeMaximized = false;
  let resized: (() => void) | undefined;
  const reads: ReturnType<typeof deferred<boolean>>[] = [];
  const subscription = deferred<() => void | Promise<void>>();
  const toggle = deferred<void>();
  const warnings: string[] = [];
  const stop = options.stop ?? (() => {});
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value: unknown) => {
          if (!alive) lateWrites++;
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = callback;
      return slots[index];
    },
    useEffect(effect: () => void | (() => void)) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = true;
        effects.push(effect);
      }
    },
  };
  const jsx = (type: unknown, props: Element["props"]): Element => ({
    type,
    props,
  });
  const modules: Record<string, unknown> = {
    react: hooks,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "./UiIcon": { default: () => null, __esModule: true },
    "@tauri-apps/api/window": {
      getCurrentWindow: () => ({
        isMaximized: () => {
          const read = deferred<boolean>();
          reads.push(read);
          return read.promise;
        },
        onResized: (callback: () => void) => {
          resized = callback;
          if (!options.holdSubscription) subscription.resolve(stop);
          return subscription.promise;
        },
        toggleMaximize: () => {
          nativeMaximized = !nativeMaximized;
          return options.holdToggle ? toggle.promise : Promise.resolve();
        },
        minimize: async () => {},
        close: async () => {},
      }),
    },
  };
  const exports: { default?: () => Element } = {};
  const source = await readFile(
    new URL("../../src/components/WindowControls.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  runInNewContext(compiled.outputText, {
    exports,
    require: (id: string) => {
      assert(id in modules, `Unexpected component dependency: ${id}`);
      return modules[id];
    },
    console: { warn: (message: string) => warnings.push(message) },
  });
  const render = () => {
    cursor = 0;
    return exports.default!();
  };
  const find = (label: string): Element => {
    const visit = (value: unknown): Element | undefined => {
      if (Array.isArray(value)) {
        for (const child of value) {
          const match = visit(child);
          if (match) return match;
        }
      } else if (value && typeof value === "object" && "props" in value) {
        const element = value as Element;
        if (element.props["aria-label"] === label) return element;
        return visit(element.props.children);
      }
      return undefined;
    };
    const match = visit(render());
    assert(match, `Missing rendered control: ${label}`);
    return match;
  };
  render();
  effects.forEach((effect) => {
    const cleanup = effect();
    if (cleanup) cleanups.push(cleanup);
  });
  await flush();
  return {
    reads,
    subscription,
    toggle,
    warnings,
    render,
    find,
    nativeMaximized: () => nativeMaximized,
    lateWrites: () => lateWrites,
    resize: () => {
      assert(resized);
      resized();
    },
    click: (label: string) => {
      const callback = find(label).props.onClick;
      assert.equal(typeof callback, "function");
      (callback as () => void)();
    },
    unmount: () => {
      alive = false;
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}

test("a late initial read cannot undo the successful maximize button state", async () => {
  const fixture = await harness();
  fixture.click("最大化窗口");
  await flush();
  assert.equal(fixture.nativeMaximized(), true);
  fixture.reads[1].resolve(true);
  await flush();
  fixture.reads[0].resolve(false);
  await flush();
  fixture.find("还原窗口");
});

test("resize reads apply the newest state when native responses arrive out of order", async () => {
  const fixture = await harness();
  fixture.reads[0].resolve(false);
  await flush();
  fixture.resize();
  fixture.resize();
  fixture.reads[2].resolve(true);
  await flush();
  fixture.reads[1].resolve(false);
  await flush();
  fixture.find("还原窗口");
});

test("starting a window action invalidates an older failing state read immediately", async () => {
  const fixture = await harness({ holdToggle: true });
  fixture.click("最大化窗口");
  fixture.reads[0].reject(new Error("old read failed"));
  await flush();
  assert.equal(fixture.render().props["aria-busy"], true);
  assert(!JSON.stringify(fixture.render()).includes("无法读取窗口状态"));
  fixture.toggle.resolve();
  await flush();
  fixture.reads[1].resolve(true);
  await flush();
  fixture.find("还原窗口");
});

test("a rejected older resize read does not replace a newer valid state with an error", async () => {
  const fixture = await harness();
  fixture.reads[0].resolve(false);
  await flush();
  fixture.resize();
  fixture.resize();
  fixture.reads[2].resolve(true);
  await flush();
  fixture.reads[1].reject(new Error("superseded native read"));
  await flush();
  fixture.find("还原窗口");
  assert(!JSON.stringify(fixture.render()).includes("无法读取窗口状态"));
});

test("unmount during a pending toggle prevents further queries and state writes", async () => {
  const fixture = await harness({ holdToggle: true });
  fixture.reads[0].resolve(false);
  await flush();
  fixture.click("最大化窗口");
  fixture.unmount();
  fixture.toggle.resolve();
  await flush();
  // Finish any incorrectly issued query so late updates remain observable.
  fixture.reads.slice(1).forEach((read) => read.resolve(true));
  await flush();
  assert.equal(fixture.reads.length, 1);
  assert.equal(fixture.lateWrites(), 0);
});

for (const lateSubscription of [false, true]) {
  test(`asynchronous listener cleanup failure is handled ${lateSubscription ? "after late registration" : "on unmount"}`, async () => {
    const cleanup = deferred<void>();
    // Keep a deliberate native rejection local to this test runner. The actual
    // component must separately handle it and emit the nonsecret diagnostic.
    void cleanup.promise.catch(() => {});
    let stops = 0;
    const fixture = await harness({
      holdSubscription: lateSubscription,
      stop: () => {
        stops++;
        return cleanup.promise;
      },
    });
    fixture.reads[0].resolve(false);
    await flush();
    fixture.unmount();
    if (lateSubscription) {
      fixture.subscription.resolve(() => {
        stops++;
        return cleanup.promise;
      });
      await flush();
    }
    cleanup.reject(new Error("native unregister failed"));
    await flush();
    assert.equal(stops, 1);
    assert.deepEqual(fixture.warnings, ["窗口状态监听清理失败。"]);
    assert.equal(fixture.lateWrites(), 0);
  });
}
