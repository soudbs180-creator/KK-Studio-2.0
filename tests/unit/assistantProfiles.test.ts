import assert from "node:assert/strict";
import test from "node:test";
import {
  createSkillRegistry,
  SKILL_RECORDS_STORAGE_KEY,
} from "../../src/features/skills/skillRegistry.ts";
import { ensureTemplates } from "../../src/features/skills/templateSkills.ts";
import {
  listAssistantProfiles,
  saveAssistantProfile,
  composeAssistantPrompt,
} from "../../src/features/assistants/assistantProfiles.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  let failed = false;
  return {
    values,
    fail() {
      failed = true;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (failed) throw new Error("write denied");
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

test("curated assistants reuse the skill registry and retain existing bundled skills", () => {
  const storage = memoryStorage();
  const registry = createSkillRegistry(storage);
  ensureTemplates(registry);
  const assistants = listAssistantProfiles(registry.listRecords());
  assert.equal(assistants.length, 5);
  assert.deepEqual(
    new Set(assistants.map((record) => record.manifest.category)),
    new Set(["助手 · 编程", "助手 · 图片", "助手 · 视频"]),
  );
  assert.ok(registry.getRecord("shot-planner"));
  assert.ok(registry.getRecord("product-prompt-review"));
  assert.ok(
    assistants.every((record) => record.manifest.permissions.length === 0),
  );
  assert.ok(storage.values.has(SKILL_RECORDS_STORAGE_KEY));
  const keys = [...storage.values.keys()];
  assert.ok(keys.every((key) => key.includes("skills")));
  ensureTemplates(registry);
  assert.equal(listAssistantProfiles(registry.listRecords()).length, 5);
});

test("a custom assistant restores through the existing skill store with a stable identity", () => {
  const storage = memoryStorage();
  const registry = createSkillRegistry(storage);
  const record = saveAssistantProfile(registry, {
    name: "前端代码审查",
    category: "编程",
    instructions: "检查用户体验与实际调用链。",
  });
  assert.match(record.manifest.id, /^assistant-/);
  assert.equal(record.manifest.source, "local");
  const restored = createSkillRegistry(storage);
  const update = saveAssistantProfile(restored, {
    id: record.manifest.id,
    name: "前端复核",
    category: "编程",
    instructions: "检查异步竞态和回归证据。",
  });
  assert.equal(update.manifest.id, record.manifest.id);
  assert.equal(update.createdAt, record.createdAt);
  assert.equal(
    listAssistantProfiles(createSkillRegistry(storage).listRecords())[0]
      .instructions,
    "检查异步竞态和回归证据。",
  );
});

test("failed custom assistant persistence does not replace the previous record", () => {
  const storage = memoryStorage();
  const registry = createSkillRegistry(storage);
  const original = saveAssistantProfile(registry, {
    name: "图片助手",
    category: "图片",
    instructions: "保留主体和原件。",
  });
  const persisted = storage.getItem(SKILL_RECORDS_STORAGE_KEY);
  storage.fail();
  assert.throws(
    () =>
      saveAssistantProfile(registry, {
        id: original.manifest.id,
        name: "新名称",
        category: "图片",
        instructions: "新的指令",
      }),
    /保存失败/,
  );
  assert.equal(
    registry.getRecord(original.manifest.id)?.instructions,
    original.instructions,
  );
  assert.equal(storage.getItem(SKILL_RECORDS_STORAGE_KEY), persisted);
});

test("assistant editing cannot overwrite an unrelated skill or accept embedded credentials", () => {
  const registry = createSkillRegistry(memoryStorage());
  ensureTemplates(registry);
  assert.throws(
    () =>
      saveAssistantProfile(registry, {
        id: "shot-planner",
        name: "覆盖",
        category: "视频",
        instructions: "不同指令",
      }),
    /助手/,
  );
  assert.throws(
    () =>
      saveAssistantProfile(registry, {
        name: "错误配置",
        category: "编程",
        instructions: "api_key=fixture-secret",
      }),
    /密钥|凭据/,
  );
  assert.equal(
    registry.getRecord("shot-planner")?.manifest.name,
    "镜头规划助手",
  );
  assert.throws(
    () =>
      saveAssistantProfile(registry, {
        id: "assistant-code-builder",
        name: "覆盖内置",
        category: "编程",
        instructions: "修改",
      }),
    /内置/,
  );
});

test("custom assistant instructions leave room for the user's task", () => {
  const registry = createSkillRegistry(memoryStorage());
  assert.throws(
    () =>
      saveAssistantProfile(registry, {
        name: "过长指令",
        category: "编程",
        instructions: "字".repeat(4100),
      }),
    /3000|指令/,
  );
  const assistant = saveAssistantProfile(registry, {
    name: "长指令",
    category: "编程",
    instructions: "字".repeat(3000),
  });
  assert.ok(composeAssistantPrompt("检查代码", assistant).includes("检查代码"));
});
test("assistant composition follows existing prompt bounds and never enables disabled profiles", () => {
  const registry = createSkillRegistry(memoryStorage());
  const record = saveAssistantProfile(registry, {
    name: "代码助手",
    category: "编程",
    instructions: "先检查现有实现，再提出修改。",
  });
  const composed = composeAssistantPrompt("修复表单取消", record);
  assert.ok(composed.includes(record.instructions));
  assert.ok(composed.includes("修复表单取消"));
  assert.equal(composeAssistantPrompt("原文", undefined), "原文");
  registry.setEnabled(record.manifest.id, false);
  assert.throws(
    () =>
      composeAssistantPrompt("请求", registry.getRecord(record.manifest.id)),
    /禁用|启用/,
  );
  assert.throws(
    () => composeAssistantPrompt("字".repeat(4000), record),
    /4000|过长|超过/,
  );
});
