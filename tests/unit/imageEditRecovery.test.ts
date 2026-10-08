import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { crc32, deflateSync } from "node:zlib";
import {
  createProject,
  createTask,
  emptySnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import {
  reconcileNativeTasks,
  validateNativeTaskRecord,
  type NativeTaskHostRecord,
} from "../../src/features/creation/nativeTaskHost.ts";
import {
  compileEditPrompt,
  formatEditPrompt,
} from "../../src/features/image-edit/prompt.ts";

const sourceId = "asset-" + "a".repeat(24);
const cropId = "asset-" + "b".repeat(24);
function rawPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(4, 0);
  header.writeUInt32BE(4, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc(4 * (1 + 4 * 4));
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      pixels.set([255, 0, 0, 255], y * 17 + 1 + x * 4);
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type),
      size = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([size, name, data, checksum]);
  };
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const rawBytes = rawPng();
const rawSha = createHash("sha256").update(rawBytes).digest("hex");
const rawId = `asset-${rawSha.slice(0, 24)}`;
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
async function restore(
  local: boolean,
  marker?: unknown,
  configure?: (snapshot: CreationSnapshot) => void,
) {
  const { receipt, snapshot: initial } = fixture(local);
  configure?.(initial);
  const snapshot = decodeSnapshot(initial);
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
                sha256: rawSha,
                mime: "image/png",
                tags: ["编辑输入"],
                provenance: { generatedAt: "2026-10-08T00:00:00.000Z" },
              },
              dataBase64: rawBytes.toString("base64"),
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

test("a real local compiler's quoted whole-image suffix cannot publish its raw crop", async () => {
  for (const previous of [undefined, "上次已完成", " "]) {
    const { recovered, calls, snapshot } = await restore(
      true,
      undefined,
      (snapshot) => {
        const task = snapshot.projects[0].tasks[0];
        const wholeBody = formatEditPrompt({
          current: task.imageEditContext!.lastInstruction!,
          local: false,
          instructions: [],
        });
        const opinion = wholeBody.slice(0, wholeBody.lastIndexOf("\n"));
        task.imageEdit = {
          sourceAssetId: sourceId,
          maskAssetId: "asset-" + "d".repeat(24),
          groupId: "legacy-local-edit",
          document: {
            width: 8,
            height: 8,
            regions: [
              {
                id: "red-area",
                runs: [
                  [3, 3, 5],
                  [4, 3, 5],
                ],
                color: "#ff0000",
                colorName: "红色",
                number: 1,
                instruction: opinion,
              },
            ],
          },
          crop: { x: 2, y: 2, width: 4, height: 4, regionIds: ["red-area"] },
          nativeMask: true,
        };
        const compiled = compileEditPrompt(
          task.imageEditContext!.lastInstruction!,
          task.imageEdit.document,
        );
        task.prompt = formatEditPrompt({
          current: compiled.prompt,
          originalPrompt: task.imageEditContext!.originalPrompt,
          previous,
          local: true,
          instructions: compiled.instructions,
        });
        assert.ok(task.prompt.endsWith(wholeBody));
        assert.ok(task.prompt.length <= 4000);
        assert.ok(decodeSnapshot(snapshot).projects[0].tasks[0].imageEdit);
        delete task.imageEdit;
      },
    );
    const task = recovered.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.submissionState, "unknown");
    assert.equal(task.resultItemId, undefined);
    assert.equal(task.outputs?.[0].assetId, undefined);
    assert.deepEqual(
      recovered.projects[0].items.map(({ id, assetId }) => ({ id, assetId })),
      snapshot.projects[0].items.map(({ id, assetId }) => ({ id, assetId })),
    );
    assert.ok(!calls.includes("asset_read"));
    assert.ok(!calls.includes("task_host_submit"));
  }
});

test("legacy whole-image recovery accepts template text in its known root and current instruction", async () => {
  const quoted = formatEditPrompt({
    current: "示例文字",
    local: true,
    instructions: [],
  });
  const { recovered, calls } = await restore(false, undefined, (snapshot) => {
    const task = snapshot.projects[0].tasks[0];
    task.imageEditContext!.originalPrompt = `照原样保留教程\n${quoted}`;
    task.imageEditContext!.lastInstruction = `保留以下引用\n${quoted}`;
    task.prompt = formatEditPrompt({
      current: task.imageEditContext!.lastInstruction,
      originalPrompt: task.imageEditContext!.originalPrompt,
      previous: "此前修改",
      local: false,
      instructions: [],
    });
  });
  assert.equal(recovered.projects[0].tasks[0].status, "succeeded");
  assert.equal(recovered.projects[0].items.at(-1)?.assetId, rawId);
  assert.ok(calls.includes("asset_read"));
});

test("legacy whole-image recovery preserves both recent-instruction budgets and truncation", async () => {
  for (const long of [false, true])
    for (const previous of [undefined, " ", "上次修改", "长".repeat(700)]) {
      const { recovered, calls } = await restore(
        false,
        undefined,
        (snapshot) => {
          const task = snapshot.projects[0].tasks[0];
          task.imageEditContext!.originalPrompt = long
            ? "原".repeat(4000)
            : "保持原设计";
          task.imageEditContext!.lastInstruction = long
            ? "改".repeat(3000)
            : "改为红色";
          task.prompt = formatEditPrompt({
            current: task.imageEditContext!.lastInstruction,
            originalPrompt: task.imageEditContext!.originalPrompt,
            previous,
            local: false,
            instructions: [],
          });
          assert.ok(task.prompt.length <= 4000);
          if (!long && previous === " ")
            assert.ok(
              task.prompt.includes("最近已完成的修改（当前原图已体现）： \n"),
            );
        },
      );
      assert.equal(recovered.projects[0].tasks[0].status, "succeeded");
      assert.equal(recovered.projects[0].items.at(-1)?.assetId, rawId);
      assert.ok(calls.includes("asset_read"));
    }
});

test("legacy ambiguous recent compiler bodies are quarantined while an explicit whole-image role is accepted", async () => {
  const quoted = formatEditPrompt({
    current: "示例文字",
    local: false,
    instructions: [],
  });
  for (const marker of [undefined, false]) {
    const { recovered, calls } = await restore(false, marker, (snapshot) => {
      const task = snapshot.projects[0].tasks[0];
      task.prompt = formatEditPrompt({
        current: task.imageEditContext!.lastInstruction!,
        originalPrompt: task.imageEditContext!.originalPrompt,
        previous: `用户保存的教程\n${quoted}`,
        local: false,
        instructions: [],
      });
    });
    assert.equal(
      recovered.projects[0].tasks[0].status,
      marker === false ? "succeeded" : "unknown",
    );
    assert.equal(calls.includes("asset_read"), marker === false);
  }
});

test("legacy whole-image recovery rejects an unbound prefix or missing current instruction", async () => {
  for (const missingInstruction of [false, true]) {
    const { recovered, calls } = await restore(false, undefined, (snapshot) => {
      const task = snapshot.projects[0].tasks[0];
      if (missingInstruction) delete task.imageEditContext!.lastInstruction;
      else task.prompt = `无法证明的前缀\n${task.prompt}`;
    });
    assert.equal(recovered.projects[0].tasks[0].status, "unknown");
    assert.equal(recovered.projects[0].tasks[0].resultItemId, undefined);
    assert.ok(!calls.includes("asset_read"));
  }
});
