import assert from "node:assert/strict";
import test from "node:test";
import {
  createSkillRegistry,
  applySkillInstructions,
  parseSkillImport,
  serializeSkill,
  SKILL_RECORDS_STORAGE_KEY,
  parseSkillManifest,
  SKILL_REGISTRY_STORAGE_KEY,
  validateSkillManifest,
  type SkillRegistryStorage,
} from "../../src/features/skills/skillRegistry.ts";

const manifest = {
  id: "storyboard-helper",
  name: "Storyboard Helper",
  version: "1.2.3",
  description: "整理分镜与镜头提示词。",
  author: "KK Studio",
  category: "动画",
  permissions: ["canvas:read", "asset:inspect"],
  dependencies: [],
  source: "bundled",
};

class MemoryStorage implements SkillRegistryStorage {
  readonly values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("storage unavailable");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("parseSkillManifest applies metadata defaults and preserves read-only mode", () => {
  const parsed = parseSkillManifest(manifest);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.readOnly, true);
  assert.deepEqual(parsed.permissions, ["canvas:read", "asset:inspect"]);
  assert.equal(parsed.source, "bundled");
});

test("manifest validation rejects executable fields and write permissions", () => {
  const executable = validateSkillManifest({
    ...manifest,
    entry: "./run.js",
  });
  assert.equal(executable.success, false);

  const writable = validateSkillManifest({
    ...manifest,
    permissions: ["filesystem:write"],
  });
  assert.equal(writable.success, false);

  const mutable = validateSkillManifest({
    ...manifest,
    readOnly: false,
  });
  assert.equal(mutable.success, false);
});

test("manifest validation rejects self-dependencies and duplicate permissions", () => {
  const result = validateSkillManifest({
    ...manifest,
    permissions: ["canvas:read", "canvas:read"],
    dependencies: [manifest.id],
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(
      result.error.issues.map((issue) => issue.message).join(" "),
      /不能重复/,
    );
    assert.match(
      result.error.issues.map((issue) => issue.message).join(" "),
      /不能依赖自身/,
    );
  }
});

test("registry installs registered manifests and persists only installed IDs", () => {
  const storage = new MemoryStorage();
  const registry = createSkillRegistry(storage);
  registry.registerManifest(manifest);
  registry.registerManifest({
    ...manifest,
    id: "prompt-reviewer",
    name: "Prompt Reviewer",
  });

  assert.equal(registry.install("storyboard-helper"), true);
  assert.equal(registry.install("missing"), false);
  assert.deepEqual(registry.getInstalledIds(), ["storyboard-helper"]);
  assert.deepEqual(
    registry.getInstalledManifests().map((item) => item.id),
    ["storyboard-helper"],
  );
  assert.deepEqual(
    JSON.parse(storage.getItem(SKILL_REGISTRY_STORAGE_KEY) ?? "null"),
    { version: 1, installedIds: ["storyboard-helper"] },
  );

  const restored = createSkillRegistry(storage);
  restored.registerManifest(manifest);
  assert.equal(restored.isInstalled("storyboard-helper"), true);
  assert.equal(restored.uninstall("storyboard-helper"), true);
  assert.deepEqual(restored.getInstalledIds(), []);
});

test("malformed persisted IDs are ignored and failed writes do not mutate memory", () => {
  const storage = new MemoryStorage();
  storage.values.set(
    SKILL_REGISTRY_STORAGE_KEY,
    '{"version":1,"installedIds":[1]}',
  );
  const registry = createSkillRegistry(storage);
  registry.registerManifest(manifest);
  assert.deepEqual(registry.getInstalledIds(), []);

  storage.failWrites = true;
  assert.equal(registry.install("storyboard-helper"), false);
  assert.equal(registry.isInstalled("storyboard-helper"), false);
  assert.equal(registry.uninstall("unknown"), false);
});

test("imports bounded SKILL.md text, preserves imports, and round trips JSON", () => {
  const source = `---
id: storyboard-helper
name: Storyboard Helper
version: 1.2.3
description: 整理分镜提示
author: 本地作者
category: 动画
imports: prompt-reviewer
---

先拆分主体和镜头，再输出可编辑草稿。`;
  const record = parseSkillImport(source);
  assert.deepEqual(record.imports, ["prompt-reviewer"]);
  assert.equal(record.installed, true);
  const restored = parseSkillImport(JSON.parse(serializeSkill(record)));
  assert.equal(restored.instructions, record.instructions);
  assert.deepEqual(restored.manifest, record.manifest);
  assert.equal(
    applySkillInstructions("  保留原始文字  ", restored),
    "  保留原始文字  \n\n[Skill: Storyboard Helper]\n先拆分主体和镜头，再输出可编辑草稿。",
  );
});

test("rejects malformed imports and secret-like content", () => {
  assert.throws(
    () => parseSkillImport({ manifest, instructions: { run: "script" } }),
    /指令必须是文本/,
  );
  assert.throws(
    () =>
      parseSkillImport({
        manifest,
        instructions: "请使用 api_key: hidden-value",
      }),
    /密钥或凭据/,
  );
  assert.throws(
    () => parseSkillImport(`---\nname: Duplicate\nname: Again\n---\n\n文本`),
    /字段重复/,
  );
  assert.throws(
    () =>
      parseSkillImport({
        manifest: { ...manifest, readOnly: false },
        instructions: "文本",
      }),
    /只读指令模式/,
  );
});

test("persists complete local records and does not silently overwrite on write failure", () => {
  const storage = new MemoryStorage();
  const registry = createSkillRegistry(storage);
  const created = registry.createSkill({
    manifest: {
      id: "local-template",
      name: "Local Template",
      version: "0.1.0",
      description: "本地指令",
      author: "本地",
      category: "文本",
      permissions: ["conversation:read"],
      dependencies: ["storyboard-helper"],
    },
    instructions: "按步骤检查文本。",
    imports: ["storyboard-helper"],
  });
  const persisted = JSON.parse(
    storage.getItem(SKILL_RECORDS_STORAGE_KEY) ?? "null",
  );
  assert.equal(persisted.records[0].instructions, created.instructions);
  assert.deepEqual(persisted.records[0].imports, ["storyboard-helper"]);
  storage.failWrites = true;
  assert.throws(
    () => registry.updateSkill(created.manifest.id, { instructions: "新文本" }),
    /保存失败/,
  );
  assert.equal(
    registry.getRecord(created.manifest.id)?.instructions,
    created.instructions,
  );
});
