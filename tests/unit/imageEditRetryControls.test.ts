import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import {
  createProject,
  createTask,
  type CreationTask,
} from "../../src/features/creation/model.ts";

const bundled = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import RegionRetryList from "./src/features/image-edit/RegionRetryList";
      export const renderFixture = (source, tasks) => renderToStaticMarkup(
        React.createElement(RegionRetryList, { tasks, sourceId: source.id, loading: false, onRetry() {} }),
      );
    `,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  loader: { ".css": "empty" },
  write: false,
  logLevel: "silent",
});
const fixtureModule = {
  exports: {} as {
    renderFixture: (
      source: CanvasCollectionItem,
      tasks: CreationTask[],
    ) => string;
  },
};
new Function("require", "module", "exports", bundled.outputFiles[0].text)(
  createRequire(import.meta.url),
  fixtureModule,
  fixtureModule.exports,
);
const source: CanvasCollectionItem = {
  id: "region-source",
  title: "区域原图",
  description: "静态组件夹具；不读取原件或调用Provider",
  kind: "image",
  assetId: "asset-" + "a".repeat(24),
};
function regionTask(id: string): CreationTask {
  const task = createTask(
    createProject({
      prompt: "改为红色",
      model: "image-test",
      kind: "image",
      attachments: [],
    }),
  );
  return {
    ...task,
    id,
    sourceItemId: source.id,
    status: "failed",
    submissionState: "terminal",
    outputs: task.outputs!.map((output) => ({ ...output, status: "failed" })),
    imageEdit: {
      sourceAssetId: source.assetId!,
      groupId: "region-retry",
      document: {
        width: 4,
        height: 4,
        regions: [{ id: "area", runs: [[0, 0, 1]] }],
      },
      crop: { x: 0, y: 0, width: 4, height: 4, regionIds: ["area"] },
      nativeMask: false,
    },
  };
}

function checkSecondRegion(tasks: CreationTask[], reason: RegExp): void {
  const html = fixtureModule.exports.renderFixture(source, tasks);
  const controls = [...html.matchAll(/<button\b([^>]*)>重试该区域<\/button>/g)];
  assert.equal(
    controls.length,
    2,
    "unavailable regions retain their numbering",
  );
  assert.doesNotMatch(controls[0][1], /\bdisabled=/);
  assert.match(controls[1][1], /\bdisabled=/);
  assert.match(controls[1][1], reason);
  assert.match(html, /区域 1：/);
  assert.match(html, /区域 2：/);
}

for (const [submissionState, reason] of [
  ["unknown", /受理状态不明/],
  ["submitted", /已提交/],
] as const)
  test(`region retry respects ${submissionState} acceptance without renumbering`, () => {
    checkSecondRegion(
      [regionTask("safe"), { ...regionTask("blocked"), submissionState }],
      reason,
    );
  });

for (const status of ["queued", "running"] as const)
  test(`region retry respects a ${status} legacy child outside the source loading lookup`, () => {
    const parent = regionTask("parent");
    const child: CreationTask = {
      ...regionTask("child"),
      sourceItemId: undefined,
      imageEdit: undefined,
      status,
      submissionState: status === "running" ? "submitted" : "intent",
      retryOfTaskId: parent.id,
      retryOutputIndices: [0],
      outputs: [{ ...parent.outputs![0], status: "running" }],
    };
    checkSecondRegion([regionTask("safe"), parent, child], /已有重试任务/);
  });
