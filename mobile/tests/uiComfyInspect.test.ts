import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { build } from "esbuild";

// Mobile React 19 is the runtime here; the root's @types/react-dom is React 18.
const { renderToStaticMarkup } = createRequire(import.meta.url)(
  "react-dom/server",
) as {
  renderToStaticMarkup(element: ReturnType<typeof createElement>): string;
};

// The actual React/RNW View boundary diagnoses raw strings, including ''. Only
// application/network ports and the screen's initial hook values are controlled.
const ports: Record<string, string> = {
  hooks: `import {useState as realUseState} from 'react';export const useState=initial=>{const r=globalThis.inspectRuntime;const i=r.hook++;return realUseState(i===4&&r.folder!==undefined?r.folder:initial)};`,
  application: `export const useApplication=()=>({state:{accountId:'current-account'}});`,
  primitives: `import {createElement} from 'react';import {View,Text,Pressable} from 'react-native-web';export const Card=({children})=>createElement(View,null,children);export const Label=({children})=>createElement(Text,null,children);export const Action=props=>{globalThis.inspectRuntime.actions.push(props);return createElement(Pressable,{onPress:props.onPress,disabled:props.disabled},createElement(Text,null,props.label))};`,
  picker: `export const LocalOptionPicker=()=>null;`,
  comfy: `export const useComfy=()=>globalThis.inspectRuntime.flow;`,
  request: `export const useScopedRequest=()=>globalThis.inspectRuntime.request;`,
};
async function renderInspect(folder?: string) {
  const actions: { label: string; onPress: () => void }[] = [],
    calls: unknown[][] = [];
  const runtime = {
    hook: 0,
    folder,
    actions,
    flow: {
      listModels: async (...args: unknown[]) => {
        calls.push(args);
        return [];
      },
    },
    request: {
      busy: false,
      run: async (operation: (signal: AbortSignal) => Promise<unknown>) =>
        operation(new AbortController().signal),
      stop() {},
    },
  };
  const result = await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/screens/ComfyInspect.tsx", import.meta.url),
      ),
    ],
    write: false,
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    plugins: [
      {
        name: "inspect-boundaries",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path, namespace }) => {
            if (
              path === "react-native-web" ||
              path === "react/jsx-runtime" ||
              (path === "react" && namespace === "port")
            )
              return { path, external: true };
            const key =
              path === "react"
                ? "hooks"
                : path.includes("AppProvider")
                  ? "application"
                  : path.includes("primitives")
                    ? "primitives"
                    : path.includes("LocalOptionPicker")
                      ? "picker"
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
    globalThis: { inspectRuntime: runtime },
  });
  const { ComfyInspect } =
    module.exports as typeof import("../src/screens/ComfyInspect.tsx");
  const markup = renderToStaticMarkup(
    createElement(ComfyInspect, {
      connection: {
        id: "comfy-connection",
        name: "Comfy",
        provider: "ComfyUI",
        protocol: "comfyui",
        baseUrl: "https://comfy.example",
        capabilities: { text: false, image: true },
      },
    }),
  );
  return { markup, actions, calls };
}

test("Comfy initial inspection renders through actual RNW Views without an empty raw text child or network calls", async (context) => {
  const errors: unknown[][] = [];
  context.mock.method(console, "error", (...args: unknown[]) =>
    errors.push(args),
  );
  const result = await renderInspect();
  assert.deepEqual(errors, []);
  assert.match(result.markup, /读取模型目录/);
  assert.equal(result.markup.includes("读取该目录模型"), false);
  assert.deepEqual(result.calls, []);
});

test("Comfy selected folder retains its visible directory and explicit scoped model-read action", async (context) => {
  const errors: unknown[][] = [];
  context.mock.method(console, "error", (...args: unknown[]) =>
    errors.push(args),
  );
  const result = await renderInspect("checkpoints");
  assert.deepEqual(errors, []);
  assert.match(result.markup, /checkpoints/);
  const action = result.actions.find((item) => item.label === "读取该目录模型");
  assert.ok(action);
  assert.equal(result.calls.length, 0);
  action.onPress();
  assert.equal(result.calls.length, 1);
  assert.deepEqual(result.calls[0].slice(0, 3), [
    "comfy-connection",
    "checkpoints",
    "current-account",
  ]);
  assert.ok(result.calls[0][3] instanceof AbortSignal);
});
