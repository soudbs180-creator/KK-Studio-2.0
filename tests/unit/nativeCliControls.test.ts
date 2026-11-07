import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
const ts = createRequire(path.resolve("package.json"))(
  "typescript",
) as typeof import("typescript");
type Element = {
  type: unknown;
  props: { children?: unknown; [key: string]: unknown };
};
type Inspection = {
  tool: string;
  installed: boolean;
  complete: boolean;
  nodeAvailable: boolean;
  npmAvailable: boolean;
  message: string;
  version?: string;
};
type Bridge = {
  owned: boolean;
  running: boolean;
  healthy: boolean;
  message: string;
  endpoint?: string;
};
type Options = {
  complete?: boolean;
  deferFirstInspection?: boolean;
  deferBegin?: boolean;
  deferBridge?: boolean;
  bridge?: Bridge;
};

async function harness(options: Options = {}) {
  const slots: unknown[] = [],
    effects: (() => void)[] = [];
  let cursor = 0,
    interval: (() => void) | undefined;
  let tool = "gemini",
    active = true,
    inspectionCalls = 0;
  const inspections: ((value: Inspection) => void)[] = [];
  let finishBegin: ((value: unknown) => void) | undefined;
  let finishStart: ((value: Bridge) => void) | undefined,
    finishStop: ((value: Bridge) => void) | undefined;
  let failStart: ((error: Error) => void) | undefined;
  let finishBridge: ((value: Bridge) => void) | undefined;
  let stopCalls = 0;
  const cancelledIds: string[] = [],
    busyValues: boolean[] = [];
  const initial: Inspection = {
    tool: "gemini",
    installed: Boolean(options.complete),
    complete: Boolean(options.complete),
    nodeAvailable: true,
    npmAvailable: true,
    message: "已检测",
  };
  let operation = {
    operationId: "fixture-install",
    tool: "gemini",
    action: "install",
    phase: "running",
    message: "安装中",
  };
  const stopped: Bridge = {
    owned: false,
    running: false,
    healthy: false,
    message: "本窗口桥已停止",
  };
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value: unknown) => {
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
    useEffect(effect: () => (() => void) | undefined, dependencies: unknown[]) {
      const index = cursor++,
        previous = slots[index] as
          { dependencies: unknown[]; cleanup?: () => void } | undefined;
      if (
        previous &&
        dependencies.every((value, i) =>
          Object.is(value, previous.dependencies[i]),
        )
      )
        return;
      effects.push(() => {
        previous?.cleanup?.();
        slots[index] = { dependencies, cleanup: effect() };
      });
    },
  };
  const jsx = (type: unknown, props: Element["props"]) =>
    typeof type === "function" ? type(props) : { type, props };
  const native = {
    cliPending: (value?: { phase: string }) =>
      value?.phase === "running" || value?.phase === "terminal-opened",
    inspectCli: async (requested: string) => {
      inspectionCalls++;
      if (inspectionCalls === 1 && !options.deferFirstInspection)
        return { ...initial, tool: requested };
      return await new Promise<Inspection>((resolve) =>
        inspections.push(resolve),
      );
    },
    readCliBridge: async () => {
      if (options.deferBridge)
        return await new Promise<Bridge>((resolve) => {
          finishBridge = resolve;
        });
      return options.bridge ?? stopped;
    },
    beginCli: async (requested: string, action: string) => {
      operation = {
        ...operation,
        tool: requested,
        action,
        phase: action === "login" ? "terminal-opened" : "running",
        message: action === "login" ? "终端已打开，登录状态待验证" : "安装中",
      };
      if (options.deferBegin)
        return await new Promise((resolve) => {
          finishBegin = resolve;
        });
      return operation;
    },
    readCliOperation: async () => ({
      ...operation,
      phase: "completed",
      message: "安装结束",
    }),
    cancelCli: async (id: string) => {
      cancelledIds.push(id);
      return {
        ...operation,
        operationId: id,
        phase: "cancelled",
        message: "本窗口操作已取消",
      };
    },
    startCliBridge: async () =>
      await new Promise<Bridge>((resolve, reject) => {
        finishStart = resolve;
        failStart = reject;
      }),
    stopCliBridge: async () => {
      stopCalls++;
      return await new Promise<Bridge>((resolve) => {
        finishStop = resolve;
      });
    },
  };
  const sourceRoot =
    process.env.KK_NATIVE_CLI_SOURCE_ROOT ??
    fileURLToPath(new URL("../..", import.meta.url));
  const cache = new Map<string, Record<string, unknown>>();
  function load(file: string): Record<string, unknown> {
    if (cache.has(file)) return cache.get(file)!;
    const exports: Record<string, unknown> = {};
    cache.set(file, exports);
    runInNewContext(
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      {
        exports,
        URL,
        navigator: { clipboard: { writeText: async () => {} } },
        window: {
          setInterval(callback: () => void) {
            interval = callback;
            return 1;
          },
          clearInterval() {
            interval = undefined;
          },
        },
        require(name: string) {
          if (name === "react") return hooks;
          if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
          if (name.includes("api/core")) return { isTauri: () => true };
          if (name.includes("useSettingsBusy"))
            return { default: (busy: boolean) => busyValues.push(busy) };
          if (name.endsWith("/agent/index.ts"))
            return {
              readGoogleCliPreference: () => ({
                bridgeUrl: "http://127.0.0.1:1424",
              }),
              normalizeGeminiBridgeUrl: (url: string) => url,
            };
          if (name.includes("geminiCliAdapter"))
            return { normalizeGeminiBridgeUrl: (url: string) => url };
          if (name.includes("integrations/nativeCli")) return native;
          const resolved = [".tsx", ".ts"]
            .map((extension) =>
              path.resolve(path.dirname(file), name + extension),
            )
            .find(existsSync);
          assert.ok(resolved, "Unexpected import " + name);
          return load(resolved);
        },
      },
    );
    return exports;
  }
  const exports = load(
    path.join(sourceRoot, "src/components/settings/NativeCliControls.tsx"),
  );
  let view: Element;
  function render() {
    cursor = 0;
    view = (exports.default as (props: unknown) => Element)({
      tool,
      active,
      onBusyChange: () => {},
    });
    while (effects.length) effects.shift()!();
  }
  function nodes(value: unknown): Element[] {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== "object") return [];
    const element = value as Element;
    return [element, ...nodes(element.props?.children)];
  }
  function text(value: unknown): string {
    if (Array.isArray(value)) return value.map(text).join("");
    if (value && typeof value === "object")
      return text((value as Element).props?.children);
    return typeof value === "string" ? value : "";
  }
  function hasButton(label: string) {
    return nodes(view).some(
      (element) =>
        element.type === "button" && text(element.props.children) === label,
    );
  }
  function button(label: string) {
    const result = nodes(view).find(
      (element) =>
        element.type === "button" && text(element.props.children) === label,
    );
    assert.ok(result, "button " + label);
    return result.props as { disabled?: boolean; onClick: () => void };
  }
  async function settle() {
    for (let i = 0; i < 12; i++) await Promise.resolve();
    render();
  }
  render();
  return {
    button,
    hasButton,
    settle,
    cancelledIds,
    async detect() {
      button("检测 Gemini CLI").onClick();
      await settle();
    },
    async finishInstall() {
      await this.detect();
      button("安装 Gemini CLI").onClick();
      await settle();
      assert.ok(interval);
      interval();
      await settle();
      assert.equal(inspectionCalls, 2);
      assert.equal(inspections.length, 1);
    },
    async resolveInspection() {
      const resolve = inspections.shift();
      assert.ok(resolve);
      resolve({
        ...initial,
        installed: true,
        complete: true,
        version: "fixture 1.0",
      });
      await settle();
    },
    async resolveBegin() {
      assert.ok(finishBegin);
      finishBegin(operation);
      await settle();
    },
    async resolveStart() {
      assert.ok(finishStart);
      finishStart({
        owned: true,
        running: true,
        healthy: true,
        endpoint: "http://127.0.0.1:1424",
        message: "桥已启动",
      });
      await settle();
    },
    async resolveStop() {
      assert.ok(finishStop);
      finishStop(stopped);
      await settle();
    },
    async rejectStart() {
      assert.ok(failStart);
      failStart(new Error("迟到的桥启动取消回执"));
      await settle();
    },
    async resolveBridge() {
      assert.ok(finishBridge);
      finishBridge({
        owned: true,
        running: true,
        healthy: true,
        endpoint: "http://127.0.0.1:1424",
        message: "迟到的桥状态",
      });
      await settle();
    },
    async switchTool() {
      tool = "codebuddy";
      await settle();
    },
    async deactivate() {
      active = false;
      await settle();
    },
    get content() {
      return text(view);
    },
    get polling() {
      return Boolean(interval);
    },
    get busy() {
      return busyValues.at(-1);
    },
    get stopCalls() {
      return stopCalls;
    },
  };
}

test("CLI completion refreshes installation after the phase effect is cleaned up", async () => {
  const h = await harness();
  await h.finishInstall();
  assert.equal(h.polling, false, "terminal phase cleans up the running poll");
  await h.resolveInspection();
  assert.match(h.content, /完整安装/);
  assert.match(h.content, /fixture 1.0/);
  assert.equal(h.button("登录 Gemini CLI").disabled, false);
});
test("CLI completion inspection cannot publish into another tool or inactive panel", async () => {
  for (const change of ["switchTool", "deactivate"] as const) {
    const h = await harness();
    await h.finishInstall();
    await h[change]();
    await h.resolveInspection();
    assert.doesNotMatch(h.content, /完整安装|fixture 1\.0/);
  }
});
test("inspection exposes loading, cancellation only ends waiting, and late data is discarded", async () => {
  const h = await harness({ deferFirstInspection: true });
  await h.detect();
  assert.equal(h.busy, true);
  assert.match(h.content, /正在检测 Gemini CLI…/);
  const cancel = h.button("取消等待检测");
  assert.equal(cancel.disabled, false);
  cancel.onClick();
  await h.settle();
  assert.equal(h.busy, false);
  assert.match(h.content, /本机检测是否结束尚未确认/);
  await h.resolveInspection();
  assert.doesNotMatch(h.content, /完整安装|fixture 1\.0/);
});
test("bridge startup cancellation calls owned stop and cannot clear busy before stop receipt", async () => {
  const h = await harness({ complete: true });
  await h.detect();
  h.button("启动已保存地址的 CLI 桥").onClick();
  await h.settle();
  assert.equal(h.busy, true);
  assert.match(h.content, /正在启动 CLI 桥…/);
  const cancel = h.button("取消桥启动");
  assert.equal(cancel.disabled, false);
  cancel.onClick();
  await h.settle();
  assert.equal(h.stopCalls, 1);
  assert.equal(h.busy, true);
  assert.match(h.content, /正在取消 CLI 桥启动…/);
  await h.resolveStart();
  assert.equal(h.busy, true);
  assert.doesNotMatch(h.content, /桥已启动|桥地址/);
  assert.match(h.content, /正在取消 CLI 桥启动…/);
  await h.resolveStop();
  assert.equal(h.busy, false);
  assert.match(h.content, /本窗口桥已停止/);
});
test("install/login cannot cancel only waiting before the owned operation ID exists", async () => {
  for (const action of ["安装", "登录"]) {
    const h = await harness({ complete: true, deferBegin: true });
    await h.detect();
    h.button(action + " Gemini CLI").onClick();
    await h.settle();
    assert.equal(h.busy, true);
    assert.equal(h.hasButton("取消等待检测"), false);
    assert.equal(h.hasButton("取消当前 CLI 操作"), false);
    await h.resolveBegin();
    if (action === "登录") {
      assert.equal(h.busy, true);
      assert.match(h.content, /终端已打开，登录状态待验证/);
      assert.doesNotMatch(h.content, /已登录|登录成功/);
    }
    const cancel = h.button("取消当前 CLI 操作");
    assert.equal(cancel.disabled, false);
    cancel.onClick();
    await h.settle();
    assert.deepEqual(h.cancelledIds, ["fixture-install"]);
  }
});
test("late begin receipt cannot publish and uses the returned owned ID for cleanup", async () => {
  for (const change of ["switchTool", "deactivate"] as const) {
    const h = await harness({ complete: true, deferBegin: true });
    await h.detect();
    h.button("安装 Gemini CLI").onClick();
    await h.settle();
    await h[change]();
    await h.resolveBegin();
    assert.doesNotMatch(h.content, /安装中|本窗口操作已取消/);
    assert.deepEqual(h.cancelledIds, ["fixture-install"]);
  }
});
test("Gemini bridge facts are hidden after switching to CodeBuddy", async () => {
  const h = await harness({
    bridge: {
      owned: true,
      running: true,
      healthy: true,
      endpoint: "http://127.0.0.1:1424",
      message: "",
    },
  });
  await h.detect();
  assert.match(h.content, /桥地址：http:\/\/127\.0\.0\.1:1424/);
  await h.switchTool();
  assert.doesNotMatch(h.content, /桥地址|1424/);
});

test("a late bridge-start rejection cannot replace stop progress or clear its busy lock", async () => {
  const h = await harness({ complete: true });
  await h.detect();
  h.button("启动已保存地址的 CLI 桥").onClick();
  await h.settle();
  h.button("取消桥启动").onClick();
  await h.settle();
  await h.rejectStart();
  assert.equal(h.busy, true);
  assert.match(h.content, /正在取消 CLI 桥启动…/);
  assert.doesNotMatch(h.content, /迟到的桥启动取消回执/);
  await h.resolveStop();
  assert.equal(h.busy, false);
  assert.match(h.content, /本窗口桥已停止/);
});

test("bridge inspection received after a tool/active change cannot publish endpoint or message", async () => {
  for (const change of ["switchTool", "deactivate"] as const) {
    const h = await harness({ complete: true, deferBridge: true });
    await h.detect();
    await h[change]();
    await h.resolveBridge();
    assert.doesNotMatch(h.content, /桥地址|1424|迟到的桥状态/);
  }
});
