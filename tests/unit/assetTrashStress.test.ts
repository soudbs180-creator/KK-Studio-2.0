import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { Asset } from "../../src/domain/assets.ts";

function loadTsxModule(filePath: string) {
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const exports: Record<string, unknown> = {};
  const modules: Record<string, unknown> = {
    react: {
      createElement,
      useState: (init: unknown) => [init, () => {}],
    },
    "react/jsx-runtime": { jsx: createElement, jsxs: createElement },
  };

  runInNewContext(compiled.outputText, {
    exports,
    module: { exports },
    require: (name: string) => {
      if (name in modules) return modules[name];
      throw new Error(`Cannot require ${name}`);
    },
  });

  return exports;
}

// Legacy reference-model cases below do not exercise production persistence.
// Actual hook/port/DOM protection is covered by assetTrashPersistence.test.ts and audit-safety.spec.ts.
function createAssetTrashHarness(
  initial: {
    trashedAssets?: Asset[];
    onRestoreAsset?: (assetId: string) => void;
    onPermanentlyDeleteAsset?: (assetId: string) => void;
    onDeleteAsset?: (assetId: string) => void;
    onAdd?: (assets: Asset[], subject: boolean) => void;
  } = {},
) {
  let localTrash: Asset[] = [];
  let message = "";
  const trashedAssets = initial.trashedAssets ?? [];

  const setMessage = (msg: string) => {
    message = msg;
  };

  const handleSoftDelete = (asset: Asset) => {
    localTrash = [...localTrash.filter((a) => a.id !== asset.id), asset];
    initial.onDeleteAsset?.(asset.id);
    setMessage("素材已移入垃圾箱");
  };

  const handleRestore = (assetId: string) => {
    const inLocal = localTrash.find((a) => a.id === assetId);
    localTrash = localTrash.filter((a) => a.id !== assetId);
    initial.onRestoreAsset?.(assetId);
    if (inLocal && !trashedAssets.some((a) => a.id === assetId)) {
      initial.onAdd?.([inLocal], inLocal.type === "subject");
    }
    setMessage("素材已还原");
  };

  const handlePermanentDelete = (assetId: string) => {
    localTrash = localTrash.filter((a) => a.id !== assetId);
    initial.onPermanentlyDeleteAsset?.(assetId);
    setMessage("素材已彻底删除");
  };

  return {
    getState: () => {
      const trashedIds = new Set([
        ...trashedAssets.map((a) => a.id),
        ...localTrash.map((a) => a.id),
      ]);
      const activeTrash = [
        ...trashedAssets,
        ...localTrash.filter((l) => !trashedAssets.some((t) => t.id === l.id)),
      ];
      return {
        activeTrash,
        trashedIds,
        localTrash,
        message,
      };
    },
    handleSoftDelete,
    handleRestore,
    handlePermanentDelete,
  };
}

const mockAsset1: Asset = {
  id: "asset-1",
  name: "测试图片.png",
  type: "image",
  tag: "产品",
  createdAt: "2026-10-16T12:00:00Z",
};

const mockAsset2: Asset = {
  id: "asset-2",
  name: "测试人物.png",
  type: "subject",
  tag: "人物",
  createdAt: "2026-10-16T12:05:00Z",
};

test("1. DOM selectors and static markup conformance with verify-all-features.mjs", () => {
  const assetPanelSource = [
    "AssetPanel.tsx",
    "AssetPanelNavigation.tsx",
    "AssetPanelHeader.tsx",
    "AssetActions.tsx",
  ]
    .map((file) =>
      readFileSync(
        resolve(process.cwd(), "src/components/assets", file),
        "utf8",
      ),
    )
    .join("\n");

  // Check data-testid="asset-panel"
  assert.ok(
    assetPanelSource.includes('data-testid="asset-panel"'),
    "AssetPanel must include data-testid='asset-panel'",
  );

  // Check tab selectors and button names
  assert.ok(
    assetPanelSource.includes('className="asset-tabs"'),
    "AssetPanel must contain .asset-tabs container",
  );
  assert.ok(
    assetPanelSource.includes('"垃圾箱"'),
    "AssetPanel tabs must include '垃圾箱'",
  );
  assert.ok(
    assetPanelSource.includes('"画布"'),
    "AssetPanel tabs must include '画布'",
  );
  assert.ok(
    assetPanelSource.includes('"资产"'),
    "AssetPanel tabs must include '资产'",
  );

  // Check empty state text exact match
  assert.ok(
    assetPanelSource.includes('"垃圾箱为空"'),
    "Empty trash title must be '垃圾箱为空'",
  );
  assert.ok(
    assetPanelSource.includes('"已删除的素材会显示在这里，可随时还原。"'),
    "Empty trash description must be '已删除的素材会显示在这里，可随时还原。'",
  );

  // Check close button aria-label
  assert.ok(
    assetPanelSource.includes('aria-label="关闭资产管理"'),
    "AssetPanel must have close button with aria-label='关闭资产管理'",
  );
});

test("2. AssetTrashActions and AssetSoftDeleteAction render correct DOM elements", () => {
  const mod = loadTsxModule(
    resolve(process.cwd(), "src/components/assets/AssetTrashActions.tsx"),
  );
  const AssetTrashActionsComp = mod.default as (
    props: Record<string, unknown>,
  ) => ReactElement;
  const AssetSoftDeleteActionComp = mod.AssetSoftDeleteAction as (
    props: Record<string, unknown>,
  ) => ReactElement;

  const trashMarkup = renderToStaticMarkup(
    createElement(AssetTrashActionsComp, {
      asset: mockAsset1,
      onRestore: () => {},
      onPermanentlyDelete: () => {},
    }),
  );

  assert.ok(trashMarkup.includes('class="asset-trash-actions"'));
  assert.ok(trashMarkup.includes("还原"));
  assert.ok(trashMarkup.includes("彻底删除"));
  assert.ok(trashMarkup.includes("asset-trash-btn"));

  const softDeleteMarkup = renderToStaticMarkup(
    createElement(AssetSoftDeleteActionComp, {
      asset: mockAsset1,
      onDelete: () => {},
    }),
  );

  assert.ok(softDeleteMarkup.includes('class="asset-soft-delete-actions"'));
  assert.ok(softDeleteMarkup.includes("移入垃圾箱"));
  assert.ok(softDeleteMarkup.includes('aria-label="移入垃圾箱 测试图片.png"'));
});

test("3. Line count constraints: AssetPanel <= 300 and AssetTrashActions <= 300", () => {
  const panelLines = readFileSync(
    resolve(process.cwd(), "src/components/assets/AssetPanel.tsx"),
    "utf8",
  ).split("\n").length;
  const actionsLines = readFileSync(
    resolve(process.cwd(), "src/components/assets/AssetTrashActions.tsx"),
    "utf8",
  ).split("\n").length;

  assert.ok(
    panelLines <= 300,
    `AssetPanel.tsx must be <= 300 lines, current: ${panelLines}`,
  );
  assert.ok(
    actionsLines <= 300,
    `AssetTrashActions.tsx must be <= 300 lines, current: ${actionsLines}`,
  );
});

test("4. useAssetTrash soft delete -> restore cycle", () => {
  const restoredItems: Asset[] = [];
  const addedItems: Asset[] = [];
  const deletedIds: string[] = [];

  const harness = createAssetTrashHarness({
    onDeleteAsset: (id) => deletedIds.push(id),
    onRestoreAsset: (id) => restoredItems.push(id),
    onAdd: (assets) => addedItems.push(...assets),
  });

  // Initially empty trash
  let state = harness.getState();
  assert.equal(state.activeTrash.length, 0);
  assert.equal(state.trashedIds.size, 0);

  // Soft delete mockAsset1
  harness.handleSoftDelete(mockAsset1);
  state = harness.getState();
  assert.equal(state.activeTrash.length, 1);
  assert.equal(state.activeTrash[0].id, "asset-1");
  assert.ok(state.trashedIds.has("asset-1"));
  assert.equal(state.message, "素材已移入垃圾箱");
  assert.deepEqual(deletedIds, ["asset-1"]);

  // Soft delete mockAsset2
  harness.handleSoftDelete(mockAsset2);
  state = harness.getState();
  assert.equal(state.activeTrash.length, 2);
  assert.ok(state.trashedIds.has("asset-1"));
  assert.ok(state.trashedIds.has("asset-2"));

  // Restore mockAsset1
  harness.handleRestore("asset-1");
  state = harness.getState();
  assert.equal(state.activeTrash.length, 1);
  assert.equal(state.activeTrash[0].id, "asset-2");
  assert.ok(!state.trashedIds.has("asset-1"));
  assert.ok(state.trashedIds.has("asset-2"));
  assert.equal(state.message, "素材已还原");
  assert.deepEqual(restoredItems, ["asset-1"]);
  assert.deepEqual(
    addedItems.map((a) => a.id),
    ["asset-1"],
  );

  // Restore mockAsset2
  harness.handleRestore("asset-2");
  state = harness.getState();
  assert.equal(state.activeTrash.length, 0);
  assert.equal(state.trashedIds.size, 0);
  assert.equal(state.message, "素材已还原");
  assert.deepEqual(restoredItems, ["asset-1", "asset-2"]);
  assert.deepEqual(
    addedItems.map((a) => a.id),
    ["asset-1", "asset-2"],
  );
});

test("5. useAssetTrash permanent delete logic", () => {
  const permDeletedIds: string[] = [];
  const harness = createAssetTrashHarness({
    onPermanentlyDeleteAsset: (id) => permDeletedIds.push(id),
  });

  harness.handleSoftDelete(mockAsset1);
  harness.handleSoftDelete(mockAsset2);
  let state = harness.getState();
  assert.equal(state.activeTrash.length, 2);

  // Permanently delete mockAsset1
  harness.handlePermanentDelete("asset-1");
  state = harness.getState();
  assert.equal(state.activeTrash.length, 1);
  assert.equal(state.activeTrash[0].id, "asset-2");
  assert.ok(!state.trashedIds.has("asset-1"));
  assert.ok(state.trashedIds.has("asset-2"));
  assert.equal(state.message, "素材已彻底删除");
  assert.deepEqual(permDeletedIds, ["asset-1"]);

  // Permanently delete mockAsset2
  harness.handlePermanentDelete("asset-2");
  state = harness.getState();
  assert.equal(state.activeTrash.length, 0);
  assert.equal(state.trashedIds.size, 0);
  assert.equal(state.message, "素材已彻底删除");
  assert.deepEqual(permDeletedIds, ["asset-1", "asset-2"]);
});

test("6. Merging external trashedAssets prop with localTrash", () => {
  const externalTrashed: Asset = {
    id: "external-1",
    name: "外部已删除.png",
    type: "image",
    tag: "产品",
    createdAt: "2026-10-15T10:00:00Z",
  };

  const harness = createAssetTrashHarness({
    trashedAssets: [externalTrashed],
  });

  let state = harness.getState();
  assert.equal(state.activeTrash.length, 1);
  assert.equal(state.activeTrash[0].id, "external-1");
  assert.ok(state.trashedIds.has("external-1"));

  // Add local trash
  harness.handleSoftDelete(mockAsset1);
  state = harness.getState();
  assert.equal(state.activeTrash.length, 2);
  assert.ok(state.trashedIds.has("external-1"));
  assert.ok(state.trashedIds.has("asset-1"));

  // Soft-deleting an already externally trashed item does not duplicate
  harness.handleSoftDelete(externalTrashed);
  state = harness.getState();
  assert.equal(state.activeTrash.length, 2);
  assert.equal(
    state.activeTrash.filter((a) => a.id === "external-1").length,
    1,
  );
});

test("7. Idempotency and out-of-order calls", () => {
  const harness = createAssetTrashHarness();

  // Restoring non-existent item does not throw
  assert.doesNotThrow(() => harness.handleRestore("non-existent"));
  assert.equal(harness.getState().message, "素材已还原");

  // Permanently deleting non-existent item does not throw
  assert.doesNotThrow(() => harness.handlePermanentDelete("non-existent"));
  assert.equal(harness.getState().message, "素材已彻底删除");
});

test("8. App.tsx isolation analysis: soft delete without onDeleteAsset vs with onDeleteAsset", () => {
  // Case A: When parent does NOT provide onDeleteAsset (current App.tsx behavior due to worker constraint)
  let parentAssets = [mockAsset1, mockAsset2];
  let parentTrashed: Asset[] = [];

  const harnessA = createAssetTrashHarness({
    trashedAssets: parentTrashed,
    onRestoreAsset: (id) => {
      parentTrashed = parentTrashed.filter((a) => a.id !== id);
    },
    onPermanentlyDeleteAsset: (id) => {
      parentTrashed = parentTrashed.filter((a) => a.id !== id);
    },
    // onDeleteAsset is omitted
  });

  // Soft delete mockAsset1
  harnessA.handleSoftDelete(mockAsset1);
  let stateA = harnessA.getState();
  // Within AssetPanel, source filters by !trashedIds.has(a.id)
  const visibleCanvasAssetsA = parentAssets.filter(
    (a) => !stateA.trashedIds.has(a.id),
  );
  assert.equal(visibleCanvasAssetsA.length, 1);
  assert.equal(visibleCanvasAssetsA[0].id, "asset-2");
  assert.equal(stateA.activeTrash.length, 1);

  // Permanently delete mockAsset1
  harnessA.handlePermanentDelete("asset-1");
  stateA = harnessA.getState();
  assert.equal(stateA.activeTrash.length, 0);
  assert.equal(stateA.trashedIds.size, 0);

  // Notice: Because parentAssets was not pruned and trashedIds is now empty,
  // visibleCanvasAssetsA would resurface mockAsset1 if parentAssets is unchanged!
  const visibleAfterPermanentDelete = parentAssets.filter(
    (a) => !stateA.trashedIds.has(a.id),
  );
  assert.equal(
    visibleAfterPermanentDelete.length,
    2,
    "Highlighting architecture edge case: item resurfaces if parent doesn't prune assets",
  );

  // Case B: When parent DOES provide onDeleteAsset (ideal contract)
  parentAssets = [mockAsset1, mockAsset2];
  parentTrashed = [];

  const harnessB = createAssetTrashHarness({
    trashedAssets: parentTrashed,
    onDeleteAsset: (id) => {
      const found = parentAssets.find((a) => a.id === id);
      if (found) {
        parentAssets = parentAssets.filter((a) => a.id !== id);
        parentTrashed.push(found);
      }
    },
    onRestoreAsset: (id) => {
      const found = parentTrashed.find((a) => a.id === id);
      if (found) {
        parentTrashed = parentTrashed.filter((a) => a.id !== id);
        parentAssets.push(found);
      }
    },
    onPermanentlyDeleteAsset: (id) => {
      parentTrashed = parentTrashed.filter((a) => a.id !== id);
      parentAssets = parentAssets.filter((a) => a.id !== id);
    },
  });

  harnessB.handleSoftDelete(mockAsset1);
  assert.equal(parentAssets.length, 1);
  assert.equal(parentTrashed.length, 1);

  harnessB.handlePermanentDelete("asset-1");
  assert.equal(parentAssets.length, 1);
  assert.equal(parentTrashed.length, 0);
});
