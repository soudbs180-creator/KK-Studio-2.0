import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

type JsxRuntime = {
  Fragment: typeof React.Fragment;
  jsx: (
    type: unknown,
    props: Record<string, unknown>,
    key?: string,
  ) => React.ReactElement;
  jsxs: (
    type: unknown,
    props: Record<string, unknown>,
    key?: string,
  ) => React.ReactElement;
  jsxDEV: (
    type: unknown,
    props: Record<string, unknown>,
    key?: string,
    isStaticChildren?: boolean,
  ) => React.ReactElement;
};

async function loadRuntime(file: string, jsxRuntime?: Partial<JsxRuntime>) {
  const source = await readFile(
    new URL(`../../vendor/canvas-plugins/sdk/src/${file}`, import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports: Partial<JsxRuntime> = {};
  runInNewContext(output, {
    exports,
    require(id: string) {
      if (id === "./runtime") return { getReact: () => React };
      if (id === "./jsx-runtime" && jsxRuntime) return jsxRuntime;
      throw new Error(`Unexpected runtime dependency: ${id}`);
    },
  });
  return exports as JsxRuntime;
}

function childValidation(element: React.ReactElement) {
  // React 18 validates static positional children before DOM reconciliation.
  // SSR alone does not perform the DOM list warning checked by our dev guard.
  const props = element.props as {
    children: Array<React.ReactElement & { _store: { validated: boolean } }>;
  };
  return Array.from(props.children, (child) => child._store.validated);
}

test("plugin jsxs preserves static child validation, Fragment and element key", async () => {
  const runtime = await loadRuntime("jsx-runtime.ts");
  const element = runtime.jsxs(
    runtime.Fragment,
    {
      children: [
        runtime.jsx("span", { children: "one" }),
        runtime.jsx("span", { children: "two" }),
      ],
    },
    "static-fragment",
  );
  assert.equal(element.type, React.Fragment);
  assert.equal(element.key, "static-fragment");
  assert.equal(
    renderToStaticMarkup(element),
    "<span>one</span><span>two</span>",
  );
  assert.deepEqual(childValidation(element), [true, true]);
});

test("plugin jsx retains validation for genuinely dynamic unkeyed lists", async () => {
  const runtime = await loadRuntime("jsx-runtime.ts");
  const element = runtime.jsx("ul", {
    children: [
      runtime.jsx("li", { children: "one" }),
      runtime.jsx("li", { children: "two" }),
    ],
  });
  assert.equal(
    renderToStaticMarkup(element),
    "<ul><li>one</li><li>two</li></ul>",
  );
  assert.deepEqual(childValidation(element), [false, false]);
});

test("plugin jsxDEV preserves the compiler's static-child distinction", async () => {
  const runtime = await loadRuntime("jsx-runtime.ts");
  const development = await loadRuntime("jsx-dev-runtime.ts", runtime);
  const element = development.jsxDEV(
    "section",
    {
      children: [
        runtime.jsx("span", { children: "one" }),
        runtime.jsx("span", { children: "two" }),
      ],
    },
    "static-development",
    true,
  );
  assert.equal(
    renderToStaticMarkup(element),
    "<section><span>one</span><span>two</span></section>",
  );
  assert.deepEqual(childValidation(element), [true, true]);
});
