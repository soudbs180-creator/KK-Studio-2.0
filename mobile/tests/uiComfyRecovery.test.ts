import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

type Node = {
  type: string | ((props: Record<string, unknown>) => Node);
  props: Record<string, unknown>;
};
function nodes(node: unknown): Node[] {
  if (!node || typeof node !== "object") return [];
  const item = node as Node;
  return [
    item,
    ...[item.props?.children].flat(Infinity).flatMap((child) => nodes(child)),
  ];
}
const ports: Record<string, string> = {
  react: "export const useState=()=>[undefined,()=>{}];",
  "react/jsx-runtime":
    "export const jsx=(type,props)=>({type,props});export const jsxs=jsx;",
  "expo-router":
    "export const useLocalSearchParams=()=>({id:'old-task'});export const router={push(){}};",
  application: "export const useApplication=()=>globalThis.comfyScreen;",
  primitives:
    "export const Action='Action',Card='Card',Content='Content',Empty='Empty',Header='Header',Label='Label',Screen='Screen';",
  status: "export const Status='Status';export const taskLabels={};",
  comfy: "export const useComfy=()=>globalThis.comfyScreen.flow;",
  request: "export const useScopedRequest=()=>globalThis.comfyScreen.request;",
};

// Run the actual task screen. Rendering and facade ports isolate its UI decision;
// facade legacy/CAS/zero-HTTP behavior is covered in applicationComfyOutputs.
async function fixture(reason?: string, recovering = false, readOnly = false) {
  const lookups: [string, string][] = [],
    requests: string[] = [];
  const snapshot = {
    projects: [
      {
        name: "Retained historical project",
        tasks: [
          {
            id: "old-task",
            status: "partial",
            completedOutputs: 1,
            requestedOutputs: 2,
          },
        ],
        executionReceipts: [
          {
            taskId: "old-task",
            protocol: "comfyui",
            readOnly,
            comfy: {
              promptId: "original-prompt-id",
              promptIdConfirmed: true,
              identity: {
                baseUrl: "https://comfy.example",
                submissionId: "original-submission",
                workflowRevision: 1,
                workflow: { old: { class_type: "SaveImage", inputs: {} } },
              },
            },
          },
        ],
      },
    ],
  };
  const state = { accountId: "current-account", snapshot };
  const globals = globalThis as typeof globalThis & { comfyScreen?: unknown };
  globals.comfyScreen = {
    state,
    flow: {
      canRecover: (id: string, scope: string) => {
        lookups.push([id, scope]);
        return recovering;
      },
      recoveryUnavailableReason: (id: string, scope: string) => {
        lookups.push([id, scope]);
        return reason;
      },
      recover: async () => requests.push("recover"),
      poll: async () => requests.push("poll"),
    },
    request: {
      busy: false,
      run: async (operation: () => Promise<unknown>) => operation(),
      stop() {},
    },
  };
  const output = await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/screens/ComfyTaskScreen.tsx", import.meta.url),
      ),
    ],
    write: false,
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    plugins: [
      {
        name: "screen-ports",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            const key =
              path in ports
                ? path
                : path.includes("AppProvider")
                  ? "application"
                  : path.includes("primitives")
                    ? "primitives"
                    : path.includes("Status")
                      ? "status"
                      : path.includes("useComfy")
                        ? "comfy"
                        : path.includes("useScopedRequest")
                          ? "request"
                          : undefined;
            if (key) return { path: key, namespace: "port" };
          });
          builder.onLoad({ filter: /.*/, namespace: "port" }, ({ path }) => ({
            contents: ports[path],
            loader: "js",
          }));
        },
      },
    ],
  });
  const { default: Screen } = await import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
  );
  const render = () => {
    const child = Screen() as Node;
    return (child.type as (props: Record<string, unknown>) => Node)(
      child.props,
    );
  };
  return {
    state,
    render,
    requests,
    lookups,
    dispose: () => delete globals.comfyScreen,
  };
}

test("legacy partial task recovery is disabled with its actionable reason while original history remains visible", async () => {
  const reason =
      "旧 Comfy 任务已有归档原件但缺少固定输出身份映射，不能自动核对；原任务和素材保留，请人工核对供应商原任务。",
    f = await fixture(reason);
  try {
    const tree = nodes(f.render()),
      action = tree.find((n) => n.type === "Action" && n.props.primary)!;
    assert.ok(action);
    assert.equal(action.props.disabled, true);
    assert.equal(action.props.reason, reason);
    assert.ok(
      tree.some(
        (n) =>
          n.type === "Label" &&
          String(n.props.children).includes("original-prompt-id"),
      ),
    );
    assert.deepEqual(f.requests, []);
    assert.deepEqual(f.lookups, [
      ["old-task", "current-account"],
      ["old-task", "current-account"],
    ]);
  } finally {
    f.dispose();
  }
});

test("mapped recovery remains explicit and restored read-only history stays disabled", async () => {
  const f = await fixture(undefined, true);
  try {
    const action = nodes(f.render()).find(
      (n) => n.type === "Action" && n.props.primary,
    )!;
    assert.equal(action.props.disabled, false);
    assert.equal(action.props.label, "恢复已接收原件并核对原作业");
    assert.deepEqual(f.requests, []);
    await (action.props.onPress as () => Promise<void>)();
    assert.deepEqual(f.requests, ["recover"]);
    f.state.snapshot.projects[0].executionReceipts[0].readOnly = true;
    const readOnly = nodes(f.render());
    assert.equal(
      readOnly.find((n) => n.type === "Action" && n.props.primary)!.props
        .disabled,
      true,
    );
    assert.ok(
      readOnly.some(
        (n) =>
          n.type === "Label" && String(n.props.children).includes("仅供查看"),
      ),
    );
  } finally {
    f.dispose();
  }
});

test("changing accounts removes prior task history and performs no old-scope recovery lookup", async () => {
  const f = await fixture("old-account-only-reason");
  try {
    f.render();
    const before = f.lookups.length;
    f.state.accountId = "new-account";
    f.state.snapshot.projects = [];
    const tree = nodes(f.render());
    assert.ok(
      tree.some(
        (n) => n.type === "Empty" && n.props.title === "作业记录不存在",
      ),
    );
    assert.equal(
      tree.some((n) => n.type === "Action" && n.props.primary),
      false,
    );
    assert.equal(f.lookups.length, before);
    assert.deepEqual(f.requests, []);
  } finally {
    f.dispose();
  }
});
