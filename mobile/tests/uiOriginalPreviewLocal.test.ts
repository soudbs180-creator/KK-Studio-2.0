import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup(element: ReturnType<typeof createElement>): string;
};
interface ImageCallbacks {
  onLoad(event: unknown): void;
  onError(): void;
  style: { aspectRatio: number };
}

async function preview(auth: "local" | "ready" = "local") {
  const runtime = {
    hook: 0,
    current: { auth: auth as string, accountId: "local-browser-v1" },
    values: ["blob:verified-original", undefined, undefined, 1] as unknown[],
    writes: [] as { index: number; value: unknown }[],
    images: [] as ImageCallbacks[],
  };
  // Start at the already-read URI boundary; exercise the real component's image
  // callbacks and render through React 19/RNW without testing a browser decoder.
  const ports: Record<string, string> = {
    hooks: `import {useState as realUseState} from 'react';export {useEffect} from 'react';export const useState=initial=>{const r=globalThis.previewRuntime,i=r.hook++;const [value]=realUseState(r.values[i]??initial);return [value,next=>{r.values[i]=next;r.writes.push({index:i,value:next})}]};`,
    application: `export const useApplication=()=>{const r=globalThis.previewRuntime;return {state:{...r.current},app:{getState:()=>r.current}}};`,
    native: `import {createElement} from 'react';import {Image as ActualImage} from 'react-native-web';export {View,ActivityIndicator} from 'react-native-web';export function Image(props){globalThis.previewRuntime.images.push(props);return createElement(ActualImage,props)};Image.getSize=ActualImage.getSize;`,
    primitives: `import {createElement} from 'react';import {Text} from 'react-native-web';export const Label=({children})=>createElement(Text,null,children);`,
    source: `export const createLocalPreviewSource=()=>{throw new Error('resource read is outside callback scope')};`,
  };
  const result = await build({
    entryPoints: [
      fileURLToPath(new URL("../src/ui/OriginalPreview.tsx", import.meta.url)),
    ],
    write: false,
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    plugins: [
      {
        name: "preview-callback-boundaries",
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
                : path === "react-native"
                  ? "native"
                  : path.includes("AppProvider")
                    ? "application"
                    : path.includes("primitives")
                      ? "primitives"
                      : path.endsWith("/MediaOriginalPreviewSource")
                        ? "source"
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
    globalThis: { previewRuntime: runtime },
  });
  const { OriginalPreview } =
    module.exports as typeof import("../src/ui/OriginalPreview.tsx");
  const asset = {
    id: "original",
    name: "Retained PNG",
    mime: "image/png",
    size: 733,
    sha256: "a".repeat(64),
    provenance: { source: "import" as const },
    createdAt: 1,
  };
  const render = () => {
    runtime.hook = 0;
    runtime.images.length = 0;
    return renderToStaticMarkup(createElement(OriginalPreview, { asset }));
  };
  return { runtime, render };
}

test("a local original image load updates its actual component ratio", async () => {
  const { runtime, render } = await preview();
  render();
  const image = runtime.images[0];
  assert.equal(image.style.aspectRatio, 1);
  image.onLoad({ nativeEvent: { source: { width: 900, height: 600 } } });
  assert.equal(runtime.writes.length, 1);
  assert.equal(runtime.writes[0].index, 3);
  assert.equal(runtime.writes[0].value, 1.5);
  render();
  assert.equal(runtime.images[0].style.aspectRatio, 1.5);
});

test("a local preview decode error visibly preserves the original and offers sharing", async () => {
  const { runtime, render } = await preview();
  render();
  runtime.images[0].onError();
  assert.match(render(), /当前平台无法预览该图片格式，原件仍可分享。/);
  assert.equal(runtime.images.length, 0);
});

test("an account switch or unavailable session rejects stale image load and error callbacks", async () => {
  for (const current of [
    { auth: "local", accountId: "other-local-realm" },
    { auth: "ready", accountId: "realm-v1-other" },
    { auth: "signedOut", accountId: "local-browser-v1" },
  ]) {
    const { runtime, render } = await preview();
    render();
    const image = runtime.images[0];
    runtime.current = current;
    image.onLoad({ nativeEvent: { source: { width: 800, height: 200 } } });
    image.onError();
    assert.deepEqual(runtime.writes, []);
  }
});

test("authenticated image preview callbacks retain the existing native account behavior", async () => {
  const { runtime, render } = await preview("ready");
  render();
  runtime.images[0].onLoad({
    nativeEvent: { source: { width: 400, height: 800 } },
  });
  assert.equal(runtime.writes.length, 1);
  assert.equal(runtime.writes[0].index, 3);
  assert.equal(runtime.writes[0].value, 0.5);
  runtime.images[0].onError();
  assert.match(render(), /原件仍可分享/);
});
