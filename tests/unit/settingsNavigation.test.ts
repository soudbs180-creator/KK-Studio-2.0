import assert from "node:assert/strict";
import test from "node:test";
import {
  SETTINGS_NAV_GROUPS,
  SETTINGS_SECTIONS,
  getVisibleSettingsNavGroups,
  resolveSettingsRoute,
} from "../../src/components/settings/SettingsSectionData.ts";

test("settings categories have distinct responsibilities and no duplicate menu entries", () => {
  assert.deepEqual(
    SETTINGS_NAV_GROUPS.map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ]),
    [
      ["常用", ["通用设置", "模型接入", "数据管理", "软件更新", "个人主页"]],
      ["高级", ["快捷键管理", "记忆管理", "扩展与 MCP", "网络与代理"]],
      ["实验", ["安全中心", "套餐与积分"]],
    ],
  );
  assert.deepEqual(
    SETTINGS_NAV_GROUPS.map((group) => group.tier),
    ["essentials", "advanced", "experimental"],
  );
  const ids = SETTINGS_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => item.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, SETTINGS_SECTIONS.length);
});

test("local account and credits stay visible by default feature flags", () => {
  const visible = getVisibleSettingsNavGroups();
  assert.match(
    visible.find((group) => group.tier === "essentials")?.items.map(
      (item) => item.label,
    ).join(",") ?? "",
    /个人主页/,
  );
  assert.match(
    visible.find((group) => group.tier === "experimental")?.items.map(
      (item) => item.label,
    ).join(",") ?? "",
    /套餐与积分/,
  );
  assert.match(
    SETTINGS_SECTIONS.find((item) => item.id === "account")?.description ?? "",
    /本地登录/,
  );
  assert.match(
    SETTINGS_SECTIONS.find((item) => item.id === "usage")?.description ?? "",
    /本地模式/,
  );
});

test("existing account, usage and storage links retain stable identities", () => {
  for (const section of ["account", "usage", "storage"] as const)
    assert.deepEqual(resolveSettingsRoute(section), { section });
  assert.deepEqual(resolveSettingsRoute("updates"), {
    section: "updates",
  });
  assert.deepEqual(resolveSettingsRoute("shortcuts"), {
    section: "shortcuts",
  });
  assert.deepEqual(resolveSettingsRoute("advanced"), {
    section: "general",
    generalDetail: "advanced",
  });
});

test("aliases for profile, plans, models, and data resolve to canonical sections", () => {
  assert.deepEqual(resolveSettingsRoute("profile"), { section: "account" });
  assert.deepEqual(resolveSettingsRoute("plans"), { section: "usage" });
  assert.deepEqual(resolveSettingsRoute("models"), { section: "providers" });
  assert.deepEqual(resolveSettingsRoute("data"), { section: "storage" });
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
