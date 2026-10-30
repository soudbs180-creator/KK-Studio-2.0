import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
type Element = {
  type: unknown;
  props: { children?: unknown; [key: string]: unknown };
};
async function harness(loadFails = false) {
  const slots: unknown[] = [],
    effects: (() => void)[] = [],
    feedback: string[] = [],
    saves: string[] = [];
  let cursor = 0;
  let confirmation: ((confirmed: boolean) => void) | undefined;
  let pending:
    { signal: AbortSignal; resolve: (value: unknown) => void } | undefined;
  const connection = {
    status: "connected",
    connectionRevision: 1,
    endpoint: "http://127.0.0.1:1",
    token: "fixture",
    clientId: "fixture",
  };
  const jsx = (type: unknown, props: Element["props"]) => ({ type, props });
  const hooks = {
    useState(initial: unknown) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value: unknown) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef(initial: unknown) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useSyncExternalStore(_subscribe: unknown, getState: () => unknown) {
      return getState();
    },
    useEffect(effect: () => (() => void) | undefined, deps: unknown[]) {
      const i = cursor++,
        previous = slots[i] as
          { deps: unknown[]; cleanup?: () => void } | undefined;
      if (
        previous &&
        deps.every((value, index) => Object.is(value, previous.deps[index]))
      )
        return;
      effects.push(() => {
        previous?.cleanup?.();
        slots[i] = { deps, cleanup: effect() };
      });
    },
  };
  const exports: Record<string, unknown> = {};
  const source = await readFile(
    new URL(
      "../../src/components/settings/CodeBuddyConnectionSettings.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      AbortController,
      require(name: string) {
        if (name === "react") return hooks;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name.includes("useSettingsBusy")) return { default: () => {} };
        if (name.includes("confirmAction"))
          return {
            confirmAction: () =>
              new Promise<boolean>((resolve) => {
                confirmation = resolve;
              }),
          };
        if (name.endsWith("/agent/index.ts"))
          return {
            agentConnection: {
              subscribe: () => () => {},
              getState: () => connection,
            },
            createAgentApi: (options: { signal?: AbortSignal }) => ({
              codebuddyConfig: async () => {
                if (loadFails) throw new Error("fixture read failure");
                return {
                  configured: true,
                  cliPath: "C:\\complete\\codebuddy.js",
                };
              },
              saveCodebuddyConfig: async (cliPath: string) => {
                saves.push(cliPath);
                return { configured: Boolean(cliPath), cliPath };
              },
              probeCodebuddy: () =>
                new Promise((resolve) => {
                  pending = { signal: options.signal!, resolve };
                }),
            }),
          };
        throw new Error("Unexpected import " + name);
      },
    },
  );
  let view: Element;
  function render() {
    cursor = 0;
    view = (exports.default as (props: unknown) => Element)({
      onFeedback: (text: string) => feedback.push(text),
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
    settle,
    button,
    render,
    connection,
    feedback,
    saves,
    confirm(confirmed: boolean) {
      assert.ok(confirmation, "removal confirmation must be pending");
      confirmation(confirmed);
      confirmation = undefined;
    },
    changePath(value: string) {
      const input = nodes(view).find(
        (element) => element.props?.id === "codebuddy-cli-path",
      )!;
      (input.props.onChange as (event: unknown) => void)({ target: { value } });
      render();
    },
    get pending() {
      return pending!;
    },
    get content() {
      return text(view);
    },
    get path() {
      return nodes(view).find(
        (element) => element.props?.id === "codebuddy-cli-path",
      )?.props.value;
    },
    failLoad(value: boolean) {
      loadFails = value;
    },
    unmount() {
      for (const slot of slots)
        if (slot && typeof slot === "object" && "cleanup" in slot)
          (slot as { cleanup?: () => void }).cleanup?.();
    },
  };
}
test("CodeBuddy config read failure blocks empty overwrite and retry restores the original path", async () => {
  const h = await harness(true);
  await h.settle();
  assert.equal(h.button("保存 CodeBuddy 路径").disabled, true);
  h.button("保存 CodeBuddy 路径").onClick();
  await h.settle();
  assert.deepEqual(h.saves, []);
  assert.match(h.content, /无法读取配置/);
  h.failLoad(false);
  h.button("重试读取 CodeBuddy 配置").onClick();
  await h.settle();
  await h.settle();
  assert.equal(h.path, "C:\\complete\\codebuddy.js");
  assert.equal(h.button("保存 CodeBuddy 路径").disabled, false);
});
test("CodeBuddy probe cancellation aborts transport, preserves the saved path and ignores a late result", async () => {
  const h = await harness();
  await h.settle();
  h.button("测试 CodeBuddy 连接").onClick();
  h.render();
  const pending = h.pending;
  assert.ok(pending.signal);
  h.button("取消 CodeBuddy 测试").onClick();
  assert.equal(pending.signal.aborted, true);
  pending.resolve({ model: "late-model" });
  await h.settle();
  assert.match(h.content, /已取消/);
  assert.equal(h.path, "C:\\complete\\codebuddy.js");
  assert.deepEqual(h.feedback, []);
  assert.deepEqual(h.saves, []);
});
test("closing CodeBuddy settings aborts probe and rejects a late verified result", async () => {
  const h = await harness();
  await h.settle();
  h.button("测试 CodeBuddy 连接").onClick();
  const pending = h.pending;
  h.unmount();
  assert.equal(pending.signal.aborted, true);
  pending.resolve({ model: "late-model" });
  for (let i = 0; i < 12; i++) await Promise.resolve();
  assert.deepEqual(h.feedback, []);
  assert.deepEqual(h.saves, []);
});

test("cancelling removal keeps the saved CodeBuddy path and sends no write", async () => {
  const h = await harness();
  await h.settle();
  h.changePath("   ");
  h.button("保存 CodeBuddy 路径").onClick();
  h.render();
  assert.deepEqual(h.saves, []);
  assert.equal(h.button("保存 CodeBuddy 路径").disabled, true);
  h.confirm(false);
  await h.settle();
  assert.deepEqual(h.saves, []);
  assert.equal(h.path, "C:\\complete\\codebuddy.js");
  assert.match(h.content, /已保存，尚未测试/);
  assert.equal(h.button("保存 CodeBuddy 路径").disabled, false);
});

test("confirming removal sends one empty CodeBuddy path only after confirmation", async () => {
  const h = await harness();
  await h.settle();
  h.changePath("");
  h.button("保存 CodeBuddy 路径").onClick();
  h.render();
  assert.deepEqual(h.saves, []);
  h.button("保存 CodeBuddy 路径").onClick();
  h.confirm(true);
  await h.settle();
  assert.deepEqual(h.saves, [""]);
  assert.equal(h.path, "");
  assert.match(h.content, /尚未配置/);
});

test("a late CodeBuddy removal confirmation cannot write after connection replacement", async () => {
  const h = await harness();
  await h.settle();
  h.changePath("");
  h.button("保存 CodeBuddy 路径").onClick();
  h.render();
  assert.deepEqual(h.saves, []);
  h.connection.connectionRevision++;
  await h.settle();
  await h.settle();
  h.confirm(true);
  await h.settle();
  assert.deepEqual(h.saves, []);
  assert.equal(h.path, "C:\\complete\\codebuddy.js");
  assert.equal(h.button("保存 CodeBuddy 路径").disabled, false);
});

test("saving a replacement CodeBuddy path proceeds without removal confirmation", async () => {
  const h = await harness();
  await h.settle();
  h.changePath(" C:/replacement/codebuddy.js ");
  h.button("保存 CodeBuddy 路径").onClick();
  await h.settle();
  assert.deepEqual(h.saves, ["C:/replacement/codebuddy.js"]);
  assert.equal(h.path, "C:/replacement/codebuddy.js");
});

test("a CodeBuddy removal confirmation cannot write after settings unmount", async () => {
  const h = await harness();
  await h.settle();
  h.changePath("");
  h.button("保存 CodeBuddy 路径").onClick();
  h.render();
  h.unmount();
  h.confirm(true);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  assert.deepEqual(h.saves, []);
  assert.deepEqual(h.feedback, []);
});
