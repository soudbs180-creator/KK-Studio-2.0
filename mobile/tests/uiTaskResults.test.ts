import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { build } from "esbuild";
import type { CreationTask } from "@kk-studio/creation-contracts";
import {
  emptyMobileSnapshot,
  newMobileDraft,
} from "../src/core/mobileModel.ts";
import type { MobileSnapshot } from "../src/core/mobileModel.ts";
import { parseSnapshot } from "../src/storage/validation.ts";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup(element: ReturnType<typeof createElement>): string;
};
const ports: Record<string, string> = {
  router: `export const router={push(){},replace(){}};export const useLocalSearchParams=()=>({id:globalThis.resultRuntime.taskId});export const useFocusEffect=()=>{};`,
  application: `export const useApplication=()=>globalThis.resultRuntime.application;`,
  primitives: `import {createElement} from 'react';import {View,Text,Pressable} from 'react-native-web';export const Card=({children})=>createElement(View,null,children);export const Content=Card,Screen=Card,Row=Card;export const Label=({children})=>createElement(Text,null,children);export const Header=({title})=>createElement(Text,null,title);export const Empty=({title,description})=>createElement(View,null,createElement(Text,null,title),createElement(Text,null,description));export const Field=()=>null;export const Action=({label,reason,disabled})=>createElement(View,null,createElement(Pressable,{disabled,accessibilityLabel:label},createElement(Text,null,label)),reason?createElement(Text,null,reason):null);`,
  action: `export const useAction=()=>({busy:false,run(){throw new Error('render must not dispatch actions')}});`,
  sheet: `export const Sheet=()=>null;`,
  players: `export const LocalAudioPlayer=()=>null,LocalVideoPlayer=()=>null;`,
};

function task(overrides: Partial<CreationTask> = {}): CreationTask {
  return {
    id: "retained-task",
    idempotencyKey: "retained-submission",
    prompt: "The original creation instructions",
    model: "retained-model",
    kind: "text",
    status: "succeeded",
    submissionState: "terminal",
    createdAt: 1,
    updatedAt: 2,
    attempt: 1,
    attachments: [],
    requestedOutputs: 1,
    completedOutputs: 1,
    privacyMode: "byok_local",
    outputs: [
      {
        index: 0,
        status: "succeeded",
        text: "The actual saved answer",
        model: "retained-model",
        createdAt: 2,
      },
    ],
    ...overrides,
  };
}

// Render the actual screens and results through RNW. App/navigation/native media
// ports prevent dispatch; browser fixtures separately exercise real local media.
async function render(
  screen: "TasksScreen" | "TaskDetailScreen",
  current: CreationTask,
  history = false,
) {
  const snapshot: MobileSnapshot = {
    ...emptyMobileSnapshot(),
    activeProjectId: "retained-project",
    projects: [
      {
        id: "retained-project",
        name: "Retained project",
        revision: 0,
        createdAt: 1,
        updatedAt: 2,
        composerDraft: newMobileDraft(1),
        tasks: [current],
        messages: [],
        assetIds: [],
        canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      },
    ],
  };
  const before = JSON.stringify(snapshot);
  parseSnapshot(before);
  const runtime = {
    taskId: current.id,
    application: {
      state: {
        auth: "local",
        accountId: "local-browser-v1",
        snapshot,
        busyTaskIds: [],
        recoverableTaskIds: [],
      },
      app: {
        allTasks: () => [{ projectId: "retained-project", task: current }],
      },
    },
  };
  const result = await build({
    entryPoints: [
      fileURLToPath(new URL(`../src/screens/${screen}.tsx`, import.meta.url)),
    ],
    write: false,
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    plugins: [
      {
        name: "task-screen-boundaries",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            if (
              ["react", "react/jsx-runtime", "react-native-web"].includes(path)
            )
              return { path, external: true };
            if (path === "react-native")
              return { path: "react-native-web", external: true };
            if (path.endsWith("/MediaOriginalPreviewSource"))
              return {
                path: fileURLToPath(
                  new URL(
                    "../src/ui/MediaOriginalPreviewSource.web.ts",
                    import.meta.url,
                  ),
                ),
              };
            const key =
              path === "expo-router"
                ? "router"
                : path.includes("AppProvider")
                  ? "application"
                  : path.includes("primitives")
                    ? "primitives"
                    : path.includes("useAction")
                      ? "action"
                      : path.endsWith("/Sheet.tsx")
                        ? "sheet"
                        : path.includes("MediaOriginalPreviewPlayers")
                          ? "players"
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
  const module = { exports: {} };
  runInNewContext(result.outputFiles[0].text, {
    module,
    exports: module.exports,
    require,
    globalThis: { resultRuntime: runtime },
  });
  const Component = (
    module.exports as {
      default: (props: {
        history?: boolean;
      }) => ReturnType<typeof createElement>;
    }
  ).default;
  const markup = renderToStaticMarkup(createElement(Component, { history }));
  assert.equal(
    JSON.stringify(snapshot),
    before,
    "reading results must preserve the snapshot",
  );
  return markup;
}

for (const history of [false, true])
  test(`${history ? "generation history" : "default task list"} presents the saved answer instead of repeating its prompt`, async () => {
    const markup = await render("TasksScreen", task(), history);
    assert.ok(markup.includes("The actual saved answer"));
    assert.ok(!markup.includes("The original creation instructions"));
    assert.match(markup, /已保存/);
  });

test("task detail places its saved answer before the prompt and collapses technical receipt details", async () => {
  const markup = await render("TaskDetailScreen", task());
  assert.ok(markup.indexOf("The actual saved answer") >= 0);
  assert.ok(
    markup.indexOf("The actual saved answer") <
      markup.indexOf("The original creation instructions"),
  );
  assert.match(markup, /更多详情/);
  assert.ok(!markup.includes("retained-submission"));
});

test("partial results keep successful content, unresolved output state, failure reason and progress visible", async () => {
  const current = task({
    status: "partial",
    requestedOutputs: 3,
    error: "One output still requires provider confirmation",
    outputs: [
      ...task().outputs!,
      { index: 1, status: "unknown", model: "retained-model", createdAt: 2 },
      {
        index: 2,
        status: "failed",
        model: "retained-model",
        createdAt: 2,
        error: "One output was rejected",
      },
    ],
  });
  for (const screen of ["TasksScreen", "TaskDetailScreen"] as const) {
    const markup = await render(screen, current);
    for (const text of [
      "The actual saved answer",
      "部分完成",
      "待核对",
      "失败",
      "One output was rejected",
      "One output still requires provider confirmation",
    ])
      assert.ok(markup.includes(text), `${screen}: ${text}`);
    assert.match(markup, /1\/3/);
  }
});

for (const [status, label] of [
  ["queued", "排队中"],
  ["running", "生成中"],
  ["unknown", "待核对"],
  ["failed", "失败"],
  ["offline", "离线"],
  ["interrupted", "已中断"],
  ["cancelled", "已确认取消"],
] as const)
  test(`a ${status} task without a saved result retains its prompt and explicit state`, async () => {
    const outputStatus =
      status === "running"
        ? "running"
        : status === "failed"
          ? "failed"
          : status === "cancelled"
            ? "cancelled"
            : status === "queued"
              ? "waiting"
              : "unknown";
    const current = task({
      status,
      completedOutputs: 0,
      outputs: [
        {
          index: 0,
          status: outputStatus,
          model: "retained-model",
          createdAt: 2,
        },
      ],
      error: "Retained actionable explanation",
    });
    const markup = await render("TasksScreen", current);
    assert.match(markup, /The original creation instructions/);
    assert.match(markup, /Retained actionable explanation/);
    assert.match(markup, /0\/1/);
    assert.ok(markup.includes(label));
  });
