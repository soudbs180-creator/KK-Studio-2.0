import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Children, isValidElement, type ReactElement } from "react";
import ts from "typescript";
import type { Asset } from "../../src/domain/assets.ts";

function createCard(asset: Asset, loadPreview?: () => Promise<string | null>) {
  const source = new URL(
    "../../src/components/assets/AssetCard.tsx",
    import.meta.url,
  );
  const slots: unknown[] = [];
  const effects: Array<() => void> = [];
  let cursor = 0;
  const hooks = {
    useState<T>(initial: T) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (next: T | ((value: T) => T)) => {
          slots[index] =
            typeof next === "function"
              ? (next as (value: T) => T)(slots[index] as T)
              : next;
        },
      ];
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useEffect(callback: () => void | (() => void), dependencies: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as
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
        slots[index] = { dependencies, cleanup: callback() };
      });
    },
  };
  const exports =
    {} as typeof import("../../src/components/assets/AssetCard.tsx");
  runInNewContext(
    ts.transpileModule(readFileSync(source, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      AbortController,
      require: (name: string) =>
        name === "react" ? hooks : createRequire(source)(name),
    },
  );
  return () => {
    cursor = 0;
    const tree = exports.default({
      asset,
      selected: false,
      onSelect() {},
      onOpen() {},
      loadPreview,
    });
    effects.splice(0).forEach((effect) => effect());
    return tree;
  };
}

function image(tree: ReactElement): ReactElement | undefined {
  if (tree.type === "img" && tree.props.src !== "/design/figma/asset-image.svg")
    return tree;
  for (const child of Children.toArray(tree.props.children)) {
    if (!isValidElement(child)) continue;
    const found = image(child);
    if (found) return found;
  }
}

test("direct-src retry recreates a failed image request", () => {
  const render = createCard({
    id: "direct",
    name: "原件",
    type: "image",
    src: "https://example.invalid/preview.png",
  });
  const first = image(render());
  assert.ok(first);
  first.props.onError();
  const failed = render();
  assert.equal(image(failed), undefined);
  failed.props.onClick();
  const retried = image(render());
  assert.ok(retried);
  assert.equal(retried.props.src, first.props.src);
  assert.notEqual(retried.key, first.key);
});

test("lazy retry keeps the failure view until preview loading succeeds", async () => {
  let resolve!: (value: string) => void;
  let attempts = 0;
  const render = createCard(
    { id: "archive", name: "原件", type: "image", sha256: "synthetic" },
    () => {
      attempts++;
      return attempts === 1
        ? Promise.reject(new Error("offline"))
        : new Promise((done) => {
            resolve = done;
          });
    },
  );
  render();
  await new Promise((done) => setImmediate(done));
  const failed = render();
  assert.match(failed.props.title, /预览读取失败/);
  failed.props.onClick();
  const pending = render();
  assert.equal(image(pending), undefined);
  assert.equal(pending.props.title, failed.props.title);
  assert.equal(attempts, 2);
  resolve("blob:restored-preview");
  await new Promise((done) => setImmediate(done));
  const restored = render();
  assert.equal(restored.props.title, undefined);
  assert.equal(image(restored)?.props.src, "blob:restored-preview");
});
