import assert from "node:assert/strict";
import test from "node:test";
import { createSkillRegistry } from "../../src/features/skills/skillRegistry.ts";
import { ensureTemplates } from "../../src/features/skills/templateSkills.ts";
import { saveAssistantProfile } from "../../src/features/assistants/assistantProfiles.ts";

function registryWithStorage() {
  const values = new Map<string, string>();
  const registry = createSkillRegistry({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  });
  ensureTemplates(registry);
  return { registry, values };
}

test("generic Skill editing cannot overwrite a bundled assistant or disguise it as local", () => {
  const { registry, values } = registryWithStorage();
  const before = [...values];
  const original = registry.getRecord("assistant-code-reviewer");
  assert.throws(
    () =>
      registry.updateSkill("assistant-code-reviewer", {
        instructions: "被技能编辑器覆盖的指令",
      }),
    /只读/,
  );
  assert.throws(
    () =>
      registry.updateSkill("assistant-code-reviewer", {
        manifest: { source: "local", name: "伪装成本地" },
        instructions: "改写内置助手",
      }),
    /只读/,
  );
  assert.deepEqual(registry.getRecord("assistant-code-reviewer"), original);
  assert.deepEqual([...values], before);
});

test("manifest registration cannot replace an existing bundled assistant", () => {
  const { registry, values } = registryWithStorage();
  const original = registry.getRecord("assistant-code-reviewer")!;
  const before = [...values];
  const replacement = {
    ...original.manifest,
    source: "local",
    name: "覆盖内置助手",
  };
  assert.throws(() => registry.registerManifest(replacement), /只读/);
  assert.deepEqual(registry.getRecord(original.manifest.id), original);
  assert.deepEqual([...values], before);
});

test("imports cannot replace an existing bundled assistant", () => {
  const { registry, values } = registryWithStorage();
  const original = registry.getRecord("assistant-code-reviewer")!;
  const before = [...values];
  const replacement = {
    ...original.manifest,
    source: "local",
    name: "覆盖内置助手",
  };
  assert.throws(
    () =>
      registry.importSkill({
        manifest: replacement,
        instructions: "导入覆盖的指令",
      }),
    /只读/,
  );
  assert.deepEqual(registry.getRecord(original.manifest.id), original);
  assert.deepEqual([...values], before);
});

test("the read-only guard preserves ordinary bundled Skill editing and custom assistant editing", () => {
  const { registry } = registryWithStorage();
  assert.equal(
    registry.updateSkill("product-prompt-review", {
      instructions: "普通内置 Skill 原有编辑行为",
    }).instructions,
    "普通内置 Skill 原有编辑行为",
  );
  const ordinary = registry.getRecord("product-prompt-review")!;
  assert.equal(
    registry.registerManifest({ ...ordinary.manifest, name: "普通 Skill 更新" })
      .name,
    "普通 Skill 更新",
  );
  assert.equal(
    registry.importSkill({ ...ordinary, instructions: "普通 Skill 导入" })
      .instructions,
    "普通 Skill 导入",
  );
  const custom = saveAssistantProfile(registry, {
    name: "我的编程助手",
    category: "编程",
    instructions: "当前自定义指令",
  });
  assert.equal(
    registry.updateSkill(custom.manifest.id, {
      instructions: "更新自定义指令",
    }).instructions,
    "更新自定义指令",
  );
  assert.equal(
    registry.registerManifest({ ...custom.manifest, name: "自定义助手更新" })
      .name,
    "自定义助手更新",
  );
  assert.equal(
    registry.importSkill({ ...custom, instructions: "自定义助手导入" })
      .instructions,
    "自定义助手导入",
  );
  assert.equal(registry.setEnabled("assistant-code-reviewer", false), true);
  assert.equal(registry.getRecord("assistant-code-reviewer")?.enabled, false);
});
