import { test } from "node:test";
import assert from "node:assert/strict";
import { createProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  effectiveTags,
  splitCollectionTags,
} from "../../src/domain/collectionTags.ts";
import {
  normalizeCreationSnapshot,
  createProject,
  emptySnapshot,
} from "../../src/features/creation/model.ts";

test("旧收藏投影保留32个分类标签且不改原数组", () => {
  const tags = Array.from({ length: 32 }, (_, i) => `分类${i}`);
  assert.deepEqual(effectiveTags(tags, true), [...tags, "收藏"]);
  assert.equal(tags.length, 32);
  assert.deepEqual(splitCollectionTags(tags.concat("收藏")), {
    tags,
    favorite: true,
  });
  assert.throws(() => splitCollectionTags(tags.concat("新增")), /32/);
});

test("标签与旧收藏取消保存后重载不复活，喜欢和节点身份保留", () => {
  const project = createProject({
    prompt: "分类",
    model: "m",
    kind: "image",
    attachments: [],
  });
  const id = project.items[0].id;
  project.items[0].tags = ["人物"];
  project.customTags = ["客户A"];
  project.favoriteIds = [id];
  project.likedIds = [id];
  const patch = splitCollectionTags(
    effectiveTags(project.items[0].tags, true).filter((tag) => tag !== "收藏"),
  );
  project.items[0].tags = patch.tags;
  project.favoriteIds = patch.favorite ? [id] : [];
  const restored = normalizeCreationSnapshot({
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
  });
  assert.ok(restored);
  assert.deepEqual(restored.projects[0].items[0].tags, ["人物"]);
  assert.deepEqual(restored.projects[0].favoriteIds, []);
  assert.deepEqual(restored.projects[0].likedIds, [id]);
  assert.deepEqual(restored.projects[0].customTags, ["客户A"]);
});

test("旧插件卡片不补空标签，显式标签仍规范化且内容不变", () => {
  const project = createProject({
    prompt: "插件",
    model: "m",
    kind: "text",
    attachments: [],
  });
  const plugin = {
    type: "sticky-note:note",
    width: 240,
    height: 200,
    metadata: { content: "原始正文" },
  };
  project.items = [
    {
      id: "legacy-plugin",
      kind: "text",
      title: "便利贴",
      description: "",
      plugin,
    },
  ];
  project.canvas = createProjectCanvas(project.items);
  const restore = () =>
    normalizeCreationSnapshot({
      ...emptySnapshot(),
      projects: [project],
      activeProjectId: project.id,
    })!.projects[0].items[0];
  assert.equal(restore().tags, undefined);
  assert.deepEqual(restore().plugin, plugin);
  project.items[0].tags = [" 场景 ", "场景"];
  assert.deepEqual(restore().tags, ["场景"]);
  assert.deepEqual(restore().plugin, plugin);
});
