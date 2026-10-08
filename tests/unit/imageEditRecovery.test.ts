import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  emptySnapshot,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import {
  reconcileNativeTasks,
  validateNativeTaskRecord,
  type NativeTaskHostRecord,
} from "../../src/features/creation/nativeTaskHost.ts";
import { formatEditPrompt } from "../../src/features/image-edit/prompt.ts";

const sourceId = "asset-" + "a".repeat(24);
const cropId = "asset-" + "b".repeat(24);
const rawId = "asset-" + "c".repeat(24);
function fixture(local: boolean) {
  const project = createProject({
    prompt: "保持原设计",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.items[0].assetId = sourceId;
  const instruction = local
    ? "改为红色"
    : "保留文案：只修改蒙版指定区域；标注图仅用于定位，颜色与编号不属于最终画面。保持区域外主体、背景、构图和像素位置不变。";
  const task = {
    ...createTask(project),
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
    prompt: formatEditPrompt({
      current: instruction,
      originalPrompt: "保持原设计",
      previous: "上次已完成",
      local,
      instructions: [],
    }),
    imageEditContext: {
      originalPrompt: "保持原设计",
      originalAssetId: sourceId,
      referenceAssetIds: [],
      lastInstruction: instruction,
    },
    attachments: [
      {
        id: cropId,
        assetId: cropId,
        name: "当前编辑原图",
        mime: "image/png",
        size: 1,
        dataUrl: `kk-asset:${cropId}`,
      },
    ],
  };
  project.tasks = [task];
  const snapshot = decodeSnapshot({
    ...emptySnapshot(),
    activeProjectId: project.id,
    projects: [project],
  });
  const receipt: NativeTaskHostRecord = {
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    status: "succeeded",
    outputIndices: [0],
    outputs: [{ index: 0, status: "succeeded", assetId: rawId }],
    updatedAt: 42,
  };
  return { task, receipt, snapshot };
}
async function restore(local: boolean, marker?: unknown) {
  const { receipt, snapshot } = fixture(local);
  const calls: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          calls.push(command);
          if (command === "task_host_list" || command === "task_host_get")
            return command === "task_host_list"
              ? [{ ...receipt, imageEditRequired: marker }]
              : { ...receipt, imageEditRequired: marker };
          if (command === "asset_read")
            return {
              metadata: {
                assetId: rawId,
                sha256: "c".repeat(64),
                mime: "image/png",
                tags: ["编辑输入"],
                provenance: { generatedAt: "2026-10-08T00:00:00.000Z" },
              },
              dataBase64: "AQID",
            };
          throw new Error("Recovery must not resubmit or read credentials");
        },
      },
    },
  });
  try {
    return { recovered: await reconcileNativeTasks(snapshot), calls, snapshot };
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
}

test("native required edit receipt cannot publish a crop when its entire snapshot is missing", async () => {
  for (const local of [false, true]) {
    const { recovered, calls, snapshot } = await restore(local, true);
    const task = recovered.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.submissionState, "unknown");
    assert.equal(task.resultItemId, undefined);
    assert.equal(task.outputs?.[0].assetId, undefined);
    assert.deepEqual(
      recovered.projects[0].items.map((i) => i.id),
      snapshot.projects[0].items.map((i) => i.id),
    );
    assert.ok(!calls.includes("asset_read"));
    assert.match(task.error ?? "", /编辑.*(缺失|无效)/);
  }
});

test("legacy compiled local edit without metadata is quarantined without reading raw assets", async () => {
  const { recovered, calls } = await restore(true);
  assert.equal(recovered.projects[0].tasks[0].status, "unknown");
  assert.equal(recovered.projects[0].tasks[0].resultItemId, undefined);
  assert.ok(!calls.includes("asset_read"));
});

test("legacy and marked whole-image edits accept literal local instructions and inherited asset tags", async () => {
  for (const marker of [undefined, false]) {
    const { recovered, calls } = await restore(false, marker);
    assert.equal(recovered.projects[0].tasks[0].status, "succeeded");
    assert.equal(recovered.projects[0].items.at(-1)?.assetId, rawId);
    assert.ok(calls.includes("asset_read"));
  }
});

test("invalid edit snapshot and malformed required marker quarantine the live receipt", () => {
  const { task, receipt } = fixture(true);
  const invalid = {
    ...task,
    imageEdit: { sourceAssetId: sourceId },
  } as unknown as typeof task;
  const guarded = validateNativeTaskRecord(
    { ...receipt, imageEditRequired: true } as NativeTaskHostRecord,
    invalid,
  );
  assert.equal(guarded.status, "unknown");
  assert.equal(guarded.outputs[0].assetId, undefined);
});

test("malformed composition marker cannot normalize to a successful ordinary receipt", async () => {
  for (const marker of ["true", 0, null]) {
    const { recovered, calls } = await restore(false, marker);
    assert.equal(recovered.projects[0].tasks[0].status, "unknown");
    assert.ok(!calls.includes("asset_read"));
  }
});
