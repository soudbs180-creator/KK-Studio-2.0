import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  Children,
  createElement,
  isValidElement,
  type ReactElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { Asset } from "../../src/domain/assets.ts";

const exports =
  {} as typeof import("../../src/components/assets/AssetTrashActions.tsx");
const compiled = ts.transpileModule(
  readFileSync(
    new URL(
      "../../src/components/assets/AssetTrashActions.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
);
runInNewContext(compiled.outputText, {
  exports,
  require: createRequire(import.meta.url),
});
const asset = { id: "synthetic", name: "原始素材", type: "image" } as Asset;

function loadComponent<T>(file: URL): T {
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (!name.startsWith(".")) return createRequire(file)(name);
      const extension = existsSync(new URL(`${name}.tsx`, file))
        ? ".tsx"
        : ".ts";
      return loadComponent(new URL(`${name}${extension}`, file));
    },
  });
  return exports as T;
}

function findElement(
  element: ReactElement,
  matches: (element: ReactElement) => boolean,
): ReactElement | undefined {
  if (matches(element)) return element;
  for (const child of Children.toArray(element.props.children)) {
    if (!isValidElement(child)) continue;
    const found = findElement(child, matches);
    if (found) return found;
  }
}

test("real trash hook and controls refuse operations without durable ports", async () => {
  const messages: string[] = [];
  let mutations = 0;
  let trash: ReturnType<typeof exports.useAssetTrash>;
  function Harness() {
    trash = exports.useAssetTrash({
      onRestoreAsset: () => {
        mutations++;
      },
      setMessage: (message) => messages.push(message),
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  await trash!.handleSoftDelete(asset);
  await trash!.handleRestore(asset.id);
  await trash!.handlePermanentDelete(asset.id);
  assert.equal(mutations, 0);
  assert.ok(
    messages.every(
      (message) =>
        !message.includes("已移入") &&
        !message.includes("已还原") &&
        !message.includes("已彻底"),
    ),
  );
  assert.deepEqual(Array.from(trash!.trashedIds), []);
  const controls = renderToStaticMarkup(
    createElement(exports.AssetSoftDeleteAction, {
      asset,
      onDelete: trash!.handleSoftDelete,
      disabledReason: (trash! as typeof trash & { disabledReason?: string })
        .disabledReason,
    }),
  );
  assert.match(controls, /disabled=""/);
  assert.match(controls, /持久/);
});

test("real trash hook waits for the persistence acknowledgement and reports failed writes", async () => {
  const messages: string[] = [];
  let acknowledge!: () => void;
  const saved = new Promise<void>((resolve) => {
    acknowledge = resolve;
  });
  let trash: ReturnType<typeof exports.useAssetTrash>;
  function Harness() {
    trash = exports.useAssetTrash({
      setMessage: (message) => messages.push(message),
      onDeleteAsset: () => saved,
      onRestoreAsset: () => {
        throw new Error("synthetic write failure");
      },
      onPermanentlyDeleteAsset: () => {},
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  const pending = trash!.handleSoftDelete(asset);
  assert.deepEqual(messages, []);
  acknowledge();
  await pending;
  assert.equal(messages.at(-1), "素材已移入垃圾箱");
  await trash!.handleRestore(asset.id);
  assert.match(messages.at(-1)!, /失败/);
  assert.deepEqual(Array.from(trash!.trashedIds), []);
});

test("asset navigation preserves accessible state, filters and file-opening callbacks", () => {
  const { default: Navigation } = loadComponent<
    typeof import("../../src/components/assets/AssetPanelNavigation.tsx")
  >(
    new URL(
      "../../src/components/assets/AssetPanelNavigation.tsx",
      import.meta.url,
    ),
  );
  const events: unknown[] = [];
  const source = Array.from({ length: 5 }, (_, index) => ({
    ...asset,
    id: `asset-${index}`,
    name: `素材 ${index}`,
    tag: "人物",
  }));
  const props = {
    compact: true,
    tab: "trash" as const,
    view: "list" as const,
    filter: { query: "原始", type: "all", tag: "all", days: 0 },
    sourceFilter: "collection",
    source,
    selected: "asset-1",
    onClose: () => events.push("close"),
    onToggleCompact: () => events.push("compact"),
    onTab: (tab: string) => events.push(tab),
    onView: (view: string) => events.push(view),
    onFilter: (patch: unknown) => events.push(patch),
    onSource: (source: string) => events.push(source),
    onOpen: (asset: Asset) => events.push(asset.id),
  };
  const markup = renderToStaticMarkup(createElement(Navigation, props));
  assert.match(
    markup,
    /class="asset-tabs" role="tablist" aria-label="资源范围"/,
  );
  assert.match(
    markup,
    /aria-label="垃圾箱" title="垃圾箱" aria-selected="true"/,
  );
  assert.match(markup, /aria-label="列表视图" aria-pressed="true"/);
  assert.match(markup, /aria-label="网格视图" aria-pressed="false"/);
  assert.match(markup, /aria-label="搜索文件"[^>]+value="原始"/);
  for (const label of ["类型筛选", "标签筛选", "时间筛选", "来源筛选"])
    assert.ok(markup.includes(`aria-label="${label}"`));
  assert.match(
    markup,
    /<option value="collection" selected="">本地集合<\/option>/,
  );
  assert.equal((markup.match(/<span class="file-square"/g) ?? []).length, 4);
  assert.doesNotMatch(markup, /素材 4/);
  assert.match(
    markup,
    /aria-pressed="true"><span class="file-square"><\/span>素材 1/,
  );

  const tree = Navigation(props);
  for (const label of ["展开资产管理", "关闭资产管理", "垃圾箱", "网格视图"])
    findElement(
      tree,
      (element) => element.props["aria-label"] === label,
    )!.props.onClick();
  findElement(
    tree,
    (element) => element.props["aria-label"] === "搜索文件",
  )!.props.onChange({
    target: { value: "新查询" },
  });
  const fileNav = findElement(
    tree,
    (element) => element.props.className === "asset-file-nav",
  )!;
  const fileButton = Children.toArray(fileNav.props.children)[1];
  assert.ok(isValidElement(fileButton));
  fileButton.props.onClick();
  assert.deepEqual(events.slice(0, 4), ["compact", "close", "trash", "grid"]);
  assert.equal((events[4] as { query: string }).query, "新查询");
  assert.equal(events[5], "asset-1");
});

test("asset footer retains import controls and archive loading, failure and retry feedback", async () => {
  const { default: Actions } = loadComponent<
    typeof import("../../src/components/assets/AssetActions.tsx")
  >(new URL("../../src/components/assets/AssetActions.tsx", import.meta.url));
  const events: string[] = [];
  const props = {
    showSubjectActions: false,
    busy: false,
    onCreate: () => events.push("create"),
    input: {
      current: { click: () => events.push("import") } as HTMLInputElement,
    },
    onImportFiles: async (files: FileList | null) => {
      events.push(files ? "files" : "cancel");
    },
    message: "保留反馈",
    archive: {
      loading: false,
      error: "素材库读取失败",
      retry: () => events.push("retry"),
      hasMore: false,
      loadMore: () => {},
      loadPreview: async () => null,
    },
  };
  const markup = renderToStaticMarkup(createElement(Actions, props));
  assert.doesNotMatch(markup, /asset-bottom-actions/);
  assert.match(markup, /tabindex="-1" type="file" multiple=""/);
  assert.match(
    markup,
    /accept="image\/png,image\/jpeg,image\/webp,image\/gif,\.json"/,
  );
  assert.match(markup, /class="asset-feedback" role="alert"/);
  assert.match(markup, /素材库读取失败/);
  assert.match(markup, /重新读取素材库/);
  assert.match(markup, /保留反馈/);
  const tree = Actions(props);
  findElement(
    tree,
    (element) => element.props.className === "ui-button",
  )!.props.onClick();
  await findElement(
    tree,
    (element) => element.props.type === "file",
  )!.props.onChange({ target: { files: null } });
  const subjectActions = Actions({ ...props, showSubjectActions: true });
  for (const className of [
    "kk-button kk-button--primary",
    "kk-button kk-button--secondary",
  ])
    findElement(
      subjectActions,
      (element) => element.props.className === className,
    )!.props.onClick();
  assert.deepEqual(events, ["retry", "cancel", "create", "import"]);
  const loading = renderToStaticMarkup(
    createElement(Actions, {
      ...props,
      showSubjectActions: true,
      busy: true,
      archive: { ...props.archive, loading: true, error: "" },
    }),
  );
  assert.match(loading, /asset-bottom-actions/);
  assert.match(loading, /disabled=""/);
  assert.match(loading, /正在导入/);
  assert.match(loading, /role="status"/);
  assert.match(loading, /正在读取本地素材库…/);
});
