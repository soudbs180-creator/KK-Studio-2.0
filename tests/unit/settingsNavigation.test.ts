import assert from "node:assert/strict";
import test from "node:test";
import {
  SETTINGS_NAV_GROUPS,
  resolveSettingsRoute,
} from "../../src/components/settings/SettingsSectionData.ts";

test("settings categories have distinct responsibilities and no duplicate menu entries", () => {
  assert.deepEqual(
    SETTINGS_NAV_GROUPS.map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ]),
    [
      ["设置", ["通用", "个人主页", "套餐与积分", "快捷键"]],
      ["功能", ["记忆", "模型接入", "扩展", "网络"]],
      ["数据与安全", ["数据管理", "安全中心"]],
    ],
  );
  const ids = SETTINGS_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => item.id),
  );
  assert.equal(new Set(ids).size, ids.length);
});

test("existing account, usage and storage links retain stable identities", () => {
  for (const section of ["account", "usage", "storage"] as const)
    assert.deepEqual(resolveSettingsRoute(section), { section });
  assert.deepEqual(resolveSettingsRoute("updates"), {
    section: "general",
    generalDetail: "updates",
  });
  assert.deepEqual(resolveSettingsRoute("advanced"), {
    section: "general",
    generalDetail: "advanced",
  });
});

test("legacy local and extension links reach the appropriate consolidated section", () => {
  for (const route of ["comfy", "comfyui", "local"])
    assert.deepEqual(resolveSettingsRoute(route), {
      section: "providers",
      modelMethod: "local",
    });
  for (const route of ["mcp", "plugins"])
    assert.deepEqual(resolveSettingsRoute(route), {
      section: "extensions",
      extensionsTab: "plugins",
    });
  for (const route of ["skill", "skills"])
    assert.deepEqual(resolveSettingsRoute(route), {
      section: "extensions",
      extensionsTab: "skills",
    });
  for (const route of ["partners", "codex"])
    assert.deepEqual(resolveSettingsRoute(route), { section: "providers" });
  assert.deepEqual(resolveSettingsRoute("unknown"), { section: "general" });
});
