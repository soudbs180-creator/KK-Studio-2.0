import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SettingsSidebar from "../../src/components/settings/SettingsSidebar.tsx";
import {
  DEFAULT_SETTINGS_SECTION,
  DEFAULT_SETTINGS_TIER,
  SETTINGS_NAV_GROUPS,
  SETTINGS_SECTIONS,
  SETTINGS_TIER_LABELS,
  getSettingsTier,
  getVisibleSettingsNavGroups,
  resolveSettingsRoute,
  type SettingsSection,
} from "../../src/components/settings/SettingsSectionData.ts";

const TIERS = ["essentials", "advanced", "experimental"] as const;

test("three tiers exist and every real section belongs to exactly one tier", () => {
  assert.deepEqual(
    SETTINGS_NAV_GROUPS.map((group) => group.tier),
    [...TIERS],
  );
  for (const group of SETTINGS_NAV_GROUPS) {
    assert.ok(group.items.length > 0, `${group.tier} is empty`);
    assert.equal(group.label, SETTINGS_TIER_LABELS[group.tier]);
    assert.equal(new Set(group.items.map((item) => item.id)).size, group.items.length);
    for (const item of group.items)
      assert.equal(getSettingsTier(item.id), group.tier);
  }
  const placed = SETTINGS_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => item.id),
  );
  assert.equal(new Set(placed).size, placed.length);
  assert.deepEqual(
    [...placed].sort(),
    SETTINGS_SECTIONS.map((item) => item.id).sort(),
  );
  for (const section of SETTINGS_SECTIONS)
    assert.ok(getSettingsTier(section.id), `${section.id} has no tier`);
});

test("opening settings lands on the essentials tier by default", () => {
  assert.equal(DEFAULT_SETTINGS_TIER, "essentials");
  assert.equal(getSettingsTier(DEFAULT_SETTINGS_SECTION), "essentials");
  for (const route of ["", "default", "home", DEFAULT_SETTINGS_SECTION, "unknown"]) {
    const resolved = resolveSettingsRoute(route);
    assert.equal(resolved.section, DEFAULT_SETTINGS_SECTION);
    assert.equal(getSettingsTier(resolved.section), "essentials");
  }
  assert.equal(SETTINGS_NAV_GROUPS[0].items[0].id, DEFAULT_SETTINGS_SECTION);
});

test("every legacy deep link resolves into a section that exists in a tier", () => {
  const legacyRoutes = [
    "shortcuts",
    "models",
    "memory",
    "data",
    "updates",
    "advanced",
    "profile",
    "account",
    "plans",
    "usage",
    "comfy",
    "comfyui",
    "local",
    "partners",
    "codex",
    "mcp",
    "plugins",
    "skill",
    "skills",
    "general",
    "providers",
    "storage",
    "security",
    "network",
    "extensions",
    "unknown",
    "",
  ];
  const known = new Set<SettingsSection>(
    SETTINGS_SECTIONS.map((item) => item.id),
  );
  for (const route of legacyRoutes) {
    const resolved = resolveSettingsRoute(route);
    assert.ok(known.has(resolved.section), `${route} -> ${resolved.section}`);
    assert.ok(getSettingsTier(resolved.section), `${route} has no tier`);
  }
  assert.equal(resolveSettingsRoute("shortcuts").section, "shortcuts");
  assert.equal(resolveSettingsRoute("models").section, "providers");
  assert.equal(resolveSettingsRoute("memory").section, "memory");
  assert.equal(resolveSettingsRoute("data").section, "storage");
  assert.deepEqual(resolveSettingsRoute("advanced"), {
    section: "general",
    generalDetail: "advanced",
  });
});

test("batch A account entries stay visible with their local-mode copy", () => {
  const visibleIds = getVisibleSettingsNavGroups().flatMap((group) =>
    group.items.map((item) => item.id),
  );
  assert.ok(visibleIds.includes("account"));
  assert.ok(visibleIds.includes("usage"));
  assert.equal(getSettingsTier("account"), "essentials");
  assert.equal(getSettingsTier("usage"), "experimental");
  assert.match(
    SETTINGS_SECTIONS.find((item) => item.id === "account")?.description ?? "",
    /本地登录/,
  );
  assert.match(
    SETTINGS_SECTIONS.find((item) => item.id === "usage")?.description ?? "",
    /本地模式/,
  );
  for (const route of ["profile", "account"])
    assert.equal(resolveSettingsRoute(route).section, "account");
  for (const route of ["plans", "usage"])
    assert.equal(resolveSettingsRoute(route).section, "usage");
});

test("sidebar renders exactly three tier sections and keeps all nav entries", () => {
  const html = renderToStaticMarkup(
    React.createElement(SettingsSidebar, {
      section: DEFAULT_SETTINGS_SECTION,
      busy: false,
      onSelect: () => {},
    }),
  );
  assert.equal((html.match(/data-settings-tier="/g) ?? []).length, 3);
  for (const tier of TIERS)
    assert.match(html, new RegExp(`data-settings-tier="${tier}"`));
  for (const label of Object.values(SETTINGS_TIER_LABELS))
    assert.ok(html.includes(label), `${label} label missing`);
  const expectedEntries = getVisibleSettingsNavGroups().flatMap(
    (group) => group.items,
  ).length;
  assert.equal(
    (html.match(/data-section-id="/g) ?? []).length,
    expectedEntries,
  );
  assert.match(html, /个人主页/);
  assert.match(html, /套餐与积分/);
});
