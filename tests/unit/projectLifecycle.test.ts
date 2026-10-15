import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  emptySnapshot,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { applyProjectLifecycle } from "../../src/features/projects/projectLifecycle.ts";
import { createTask } from "../../src/features/creation/model.ts";
import { collectReferencedAssetIds } from "../../src/features/projects/projectPackage.ts";

function fixture() {
  const project = createProject({
    prompt: "原始名称",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  return {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
  };
}

test("项目分组、手动名称与完整垃圾箱数据经过存储边界后保真，垃圾箱不会成为启动项目", () => {
  const snapshot = fixture();
  const original = snapshot.projects[0];
  const value = {
    ...snapshot,
    projectGroups: [{ id: "group-1", name: "客户项目" }],
    projects: [
      { ...original, nameSource: "manual", groupId: "group-1", trashedAt: 15 },
    ],
  };
  const restored = decodeSnapshot(JSON.parse(JSON.stringify(value)));
  assert.equal(restored.activeProjectId, null);
  assert.deepEqual(restored.projectGroups, value.projectGroups);
  assert.equal(restored.projects[0].nameSource, "manual");
  assert.equal(restored.projects[0].trashedAt, 15);
  assert.deepEqual(
    restored.projects[0].items,
    decodeSnapshot(snapshot).projects[0].items,
  );
});

test("旧项目的名称保守迁移为手动名称；损坏的分组和垃圾箱元数据拒绝读取", () => {
  const snapshot = fixture();
  delete snapshot.projects[0].nameSource;
  assert.equal(decodeSnapshot(snapshot).projects[0].nameSource, "manual");
  for (const extra of [
    {
      projectGroups: [
        { id: "g", name: "客户" },
        { id: "g", name: "重复" },
      ],
    },
    { projectGroups: "broken" },
    { projects: [{ ...snapshot.projects[0], groupId: "missing" }] },
    { projects: [{ ...snapshot.projects[0], trashedAt: -1 }] },
    { projects: [{ ...snapshot.projects[0], nameSource: "invented" }] },
  ])
    assert.throws(() => decodeSnapshot({ ...snapshot, ...extra }));
});

test("移动、手动改名、软删除和恢复保留完整项目身份、草稿、画布和素材引用", () => {
  let snapshot = fixture();
  const original = snapshot.projects[0];
  original.items[0].assetId = "asset-0123456789abcdef01234567";
  original.composerDraft.prompt = "未发送的草稿";
  snapshot = applyProjectLifecycle(
    snapshot,
    { type: "create-group", id: "g", name: "客户", projectId: original.id },
    10,
  );
  snapshot = applyProjectLifecycle(
    snapshot,
    { type: "rename-project", id: original.id, name: "手动名称" },
    11,
  );
  const beforeTrash = structuredClone(snapshot.projects[0]);
  snapshot = applyProjectLifecycle(
    snapshot,
    { type: "trash-project", id: original.id },
    12,
  );
  assert.equal(snapshot.activeProjectId, null);
  assert.equal(snapshot.projects.length, 1);
  assert.equal(snapshot.projects[0].trashedAt, 12);
  assert.deepEqual(collectReferencedAssetIds(snapshot), [
    original.items[0].assetId,
  ]);
  snapshot = decodeSnapshot(JSON.parse(JSON.stringify(snapshot)));
  snapshot = applyProjectLifecycle(
    snapshot,
    { type: "restore-project", id: original.id },
    13,
  );
  assert.equal(snapshot.activeProjectId, null);
  assert.equal(snapshot.projects[0].id, original.id);
  assert.equal(snapshot.projects[0].nameSource, "manual");
  assert.equal(snapshot.projects[0].name, "手动名称");
  assert.equal(snapshot.projects[0].trashedAt, undefined);
  for (const key of [
    "canvas",
    "items",
    "attachments",
    "messages",
    "tasks",
    "composerDraft",
  ] as const)
    assert.deepEqual(
      snapshot.projects[0][key],
      decodeSnapshot({ ...snapshot, projects: [beforeTrash] }).projects[0][key],
    );
});

test("删除分组只解除包括垃圾箱项目的归属，恢复空组不抢回成员", () => {
  let snapshot = fixture();
  const id = snapshot.projects[0].id;
  snapshot = applyProjectLifecycle(snapshot, {
    type: "create-group",
    id: "g",
    name: "组",
    projectId: id,
  });
  snapshot = applyProjectLifecycle(snapshot, { type: "trash-project", id });
  snapshot = applyProjectLifecycle(
    snapshot,
    { type: "delete-group", id: "g" },
    20,
  );
  assert.equal(snapshot.projects[0].groupId, undefined);
  assert.equal(snapshot.projects[0].trashedAt !== undefined, true);
  snapshot = applyProjectLifecycle(decodeSnapshot(snapshot), {
    type: "restore-group",
    id: "g",
  });
  assert.equal(snapshot.projects[0].groupId, undefined);
  assert.equal(snapshot.projectGroups?.[0].deletedAt, undefined);
  assert.equal(snapshot.projects.length, 1);
});

test("未完成或状态不明的任务禁止软删除，失败操作不会修改输入；无效移动不产生空组", () => {
  const snapshot = fixture();
  const project = snapshot.projects[0];
  for (const status of ["queued", "running", "unknown"] as const) {
    project.tasks = [{ ...createTask(project), status }];
    const before = JSON.stringify(snapshot);
    assert.throws(
      () =>
        applyProjectLifecycle(snapshot, {
          type: "trash-project",
          id: project.id,
        }),
      /任务/,
    );
    assert.equal(JSON.stringify(snapshot), before);
  }
  assert.throws(
    () =>
      applyProjectLifecycle(snapshot, {
        type: "move-project",
        id: project.id,
        groupId: "missing",
      }),
    /分组/,
  );
  assert.throws(
    () =>
      applyProjectLifecycle(snapshot, {
        type: "create-group",
        id: "g",
        name: "组",
        projectId: "missing",
      }),
    /项目/,
  );
  assert.equal(snapshot.projectGroups, undefined);
});

test("Google会话仍在执行或结果不明时禁止移入垃圾箱", () => {
  const snapshot = fixture();
  const project = snapshot.projects[0];
  for (const status of ["running", "unknown"] as const) {
    project.googleConversation = {
      id: "google-1",
      identity: "synthetic",
      status,
      messages: [],
      archivedImageIds: [],
    };
    assert.throws(
      () =>
        applyProjectLifecycle(snapshot, {
          type: "trash-project",
          id: project.id,
        }),
      /任务/,
    );
  }
});
