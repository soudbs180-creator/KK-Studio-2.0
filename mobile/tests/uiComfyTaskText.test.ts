import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { build } from "esbuild";
import {
  asReceipt,
  comfyFixture,
  submissionId,
} from "./storageComfyFixture.ts";
import { parseSnapshot } from "../src/storage/validation.ts";
import type { MobileSnapshot } from "../src/core/mobileModel.ts";

const { renderToStaticMarkup } = createRequire(import.meta.url)(
  "react-dom/server",
) as {
  renderToStaticMarkup(element: ReturnType<typeof createElement>): string;
};
const ports: Record<string, string> = {
  router: `export const useLocalSearchParams=()=>({id:globalThis.taskRuntime.id});export const router={push(){}};`,
  application: `export const useApplication=()=>({state:{accountId:'alice',snapshot:globalThis.taskRuntime.snapshot}});`,
  primitives: `import {createElement} from 'react';import {View,Text,Pressable} from 'react-native-web';export const Card=({children})=>createElement(View,null,children);export const Content=Card,Screen=Card;export const Label=({children})=>createElement(Text,null,children);export const Header=({title})=>createElement(Text,null,title);export const Empty=({title})=>createElement(Text,null,title);export const Action=({label,reason,onPress,disabled})=>createElement(View,null,createElement(Pressable,{onPress,disabled},createElement(Text,null,label)),reason?createElement(Text,null,reason):null);`,
  status: `export const Status=()=>null;export const taskLabels={unknown:'须核对'};`,
  comfy: `export const useComfy=()=>({canRecover:()=>false,recoveryUnavailableReason:()=>undefined});`,
  request: `export const useScopedRequest=()=>({busy:false,run:()=>globalThis.taskRuntime.requests++,stop(){}});`,
};

// Use a valid SQLite-persisted legacy task, the actual TSX and actual RNW View.
// Only app/router/network UI ports are deterministic; no service is contacted.
async function renderTask(snapshot: MobileSnapshot) {
  const runtime = { snapshot, id: submissionId, requests: 0 };
  const result = await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/screens/ComfyTaskScreen.tsx", import.meta.url),
      ),
    ],
    write: false,
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    plugins: [
      {
        name: "task-render-boundaries",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            if (
              ["react", "react/jsx-runtime", "react-native-web"].includes(path)
            )
              return { path, external: true };
            const key =
              path === "expo-router"
                ? "router"
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
  const module = { exports: {} };
  runInNewContext(result.outputFiles[0].text, {
    module,
    exports: module.exports,
    require: createRequire(import.meta.url),
    globalThis: { taskRuntime: runtime },
  });
  const { default: Screen } =
    module.exports as typeof import("../src/screens/ComfyTaskScreen.tsx");
  return {
    markup: renderToStaticMarkup(createElement(Screen)),
    requests: runtime.requests,
  };
}

for (const error of ["", undefined, "已有原件保留，请核对服务原任务。"])
  test(`valid persisted Comfy task error ${JSON.stringify(error)} renders without a raw View text child and retains history`, async (context) => {
    const f = comfyFixture();
    try {
      const { repo, projectId } = await f.ready();
      let project = (await repo.load()).projects[0];
      project = (
        await repo.saveExecutionReceipt(
          projectId,
          asReceipt(f.receipt(projectId)),
          project.revision,
        )
      ).projects[0];
      await repo.updateTask(
        projectId,
        {
          ...project.tasks[0],
          status: "unknown",
          submissionState: "unknown",
          error,
        },
        project.revision,
      );
      const snapshot = parseSnapshot(f.raw()),
        before = f.raw(),
        errors: unknown[][] = [];
      assert.equal(snapshot.projects[0].tasks[0].error, error);
      context.mock.method(console, "error", (...args: unknown[]) =>
        errors.push(args),
      );
      const rendered = await renderTask(snapshot);
      assert.deepEqual(errors, []);
      assert.match(rendered.markup, /Workflow/);
      assert.match(rendered.markup, new RegExp(submissionId));
      assert.match(rendered.markup, /SaveImage/);
      if (error) assert.ok(rendered.markup.includes(error));
      assert.equal(rendered.requests, 0);
      assert.equal(f.raw(), before);
    } finally {
      f.close();
    }
  });
