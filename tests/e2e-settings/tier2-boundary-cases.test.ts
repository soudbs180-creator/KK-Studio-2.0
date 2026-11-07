import assert from "node:assert/strict";
import test from "node:test";
import {
  isRadiusCompliant,
  parseCssTokens,
  resolveCssVar,
  InsetCardGroupModel,
  SlidingPillMachine,
  formatFriendlyStatus,
  auditTextForMechanicalPhrases,
  SettingsNavigationRouter,
  AppUpdateStateMachine,
  TokenUsageStore,
  ShortcutsRegistry,
  normalizeKeyCombination,
  classifyProviderPreset,
  CCSWITCH_5_CHANNELS,
  executeLatencyProbe,
  ModelCatalogManager,
  UnifiedCapabilityScheduler,
  lintUiSourceCode,
} from "./harness.ts";

/* ============================================================================
 * Tier 2: Boundary Value Analysis & Edge Cases for Features F1 - F12
 *
 * 60 Tests (5 tests per feature across 12 features)
 * Derived from ORIGINAL_REQUEST.md (R1 - R5, AC1 - AC4)
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * F1: Radius Boundaries - Tests 01 to 05
 * ------------------------------------------------------------------------- */

test("F1-T2-01: 0px radius is not compliant for standard button or card controls", () => {
  assert.equal(isRadiusCompliant("button", 0).compliant, false);
  assert.equal(isRadiusCompliant("card", 0).compliant, false);
  assert.equal(isRadiusCompliant("menu", 0).compliant, false);
});

test("F1-T2-02: 15px and 21px are strictly outside the 16px-20px card boundary", () => {
  assert.equal(isRadiusCompliant("card", 15).compliant, false);
  assert.equal(isRadiusCompliant("card", 16).compliant, true); // Lower boundary
  assert.equal(isRadiusCompliant("card", 20).compliant, true); // Upper boundary
  assert.equal(isRadiusCompliant("card", 21).compliant, false);
});

test("F1-T2-03: negative and NaN radius values fail compliance safely", () => {
  assert.equal(isRadiusCompliant("button", -8).compliant, false);
  assert.equal(isRadiusCompliant("card", Number.NaN).compliant, false);
  assert.equal(
    isRadiusCompliant("menu", Number.NEGATIVE_INFINITY).compliant,
    false,
  );
});

test("F1-T2-04: fractional radius values (7.9px, 8.1px) strictly fail 8px control compliance", () => {
  assert.equal(isRadiusCompliant("button", 7.9).compliant, false);
  assert.equal(isRadiusCompliant("button", 8.0).compliant, true);
  assert.equal(isRadiusCompliant("button", 8.1).compliant, false);
});

test("F1-T2-05: resolveCssVar handles nonexistent tokens and deep resolution gracefully", () => {
  const tokens = parseCssTokens(
    "--kk-radius-sm: 8px; --kk-radius-control: var(--kk-radius-sm);",
  );
  assert.equal(resolveCssVar("--kk-radius-control", tokens), "8px");
  assert.equal(resolveCssVar("--kk-non-existent", tokens), "");
});

/* ----------------------------------------------------------------------------
 * F2: Inset Card Group Boundaries - Tests 06 to 10
 * ------------------------------------------------------------------------- */

test("F2-T2-01: empty card group with 0 rows renders valid container with 0 dividers", () => {
  const group = new InsetCardGroupModel({
    id: "empty-group",
    radiusPx: 16,
    rows: [],
  });
  assert.equal(group.rowCount, 0);
  assert.equal(group.hasRowDivider(0), false);
  const html = group.renderHtmlStructure();
  assert.match(html, /kk-inset-card-group/);
  assert.doesNotMatch(html, /kk-card-divider/);
});

test("F2-T2-02: single-row card group has exactly 0 dividers", () => {
  const group = new InsetCardGroupModel({
    id: "single-row",
    radiusPx: 20,
    rows: [{ id: "row-1", label: "单行选项", controlType: "switch" }],
  });
  assert.equal(group.rowCount, 1);
  assert.equal(group.hasRowDivider(0), false);
  const html = group.renderHtmlStructure();
  assert.doesNotMatch(html, /kk-card-divider/);
});

test("F2-T2-03: large card group with 100 rows maintains correct divider count (99 dividers)", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({
    id: `row-${i}`,
    label: `选项 ${i}`,
    controlType: "switch" as const,
  }));
  const group = new InsetCardGroupModel({
    id: "big-group",
    radiusPx: 16,
    rows,
  });
  assert.equal(group.rowCount, 100);
  assert.equal(group.hasRowDivider(98), true);
  assert.equal(group.hasRowDivider(99), false);
});

test("F2-T2-04: extreme text length (1000+ chars) in label and description renders safely", () => {
  const longText = "A".repeat(1200);
  const group = new InsetCardGroupModel({
    id: "long-text",
    radiusPx: 16,
    rows: [
      {
        id: "r1",
        label: longText,
        description: longText,
        controlType: "input",
      },
    ],
  });
  const html = group.renderHtmlStructure();
  assert.ok(html.length > 2400);
});

test("F2-T2-05: special control values (null, undefined, boolean, object) serialize cleanly", () => {
  const group = new InsetCardGroupModel({
    id: "special-vals",
    radiusPx: 16,
    rows: [
      {
        id: "r-null",
        label: "Null",
        controlType: "custom",
        controlValue: null,
      },
      {
        id: "r-undef",
        label: "Undefined",
        controlType: "custom",
        controlValue: undefined,
      },
      {
        id: "r-bool",
        label: "Bool",
        controlType: "switch",
        controlValue: true,
      },
      {
        id: "r-obj",
        label: "Obj",
        controlType: "custom",
        controlValue: { foo: "bar" },
      },
    ],
  });
  const html = group.renderHtmlStructure();
  assert.match(html, /data-row-id="r-null"/);
  assert.match(html, /data-row-id="r-bool"/);
});

/* ----------------------------------------------------------------------------
 * F3: Sliding Pill Boundaries - Tests 11 to 15
 * ------------------------------------------------------------------------- */

test("F3-T2-01: transition with identical start and target rects produces 0px distance", () => {
  const machine = new SlidingPillMachine({
    left: 50,
    top: 10,
    width: 80,
    height: 32,
  });
  const result = machine.slideTo(0, {
    left: 50,
    top: 10,
    width: 80,
    height: 32,
  });
  assert.equal(result.distancePx, 0);
  assert.equal(machine.isTransitioning, true);
  machine.settle();
  assert.equal(machine.isTransitioning, false);
});

test("F3-T2-02: large coordinate jump (5000px) calculates distance accurately without numerical overflow", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 60,
    height: 28,
  });
  const result = machine.slideTo(5, {
    left: 3000,
    top: 4000,
    width: 60,
    height: 28,
  });
  assert.equal(result.distancePx, 5000); // 3-4-5 triangle
});

test("F3-T2-03: rapid successive transitions update target and active index without losing state", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 40,
    height: 20,
  });
  machine.slideTo(1, { left: 50, top: 0, width: 40, height: 20 });
  machine.slideTo(2, { left: 100, top: 0, width: 40, height: 20 });
  machine.slideTo(3, { left: 150, top: 0, width: 40, height: 20 });
  assert.equal(machine.activeIndex, 3);
  machine.settle();
  assert.deepEqual(machine.currentRect, {
    left: 150,
    top: 0,
    width: 40,
    height: 20,
  });
});

test("F3-T2-04: zero-width or zero-height element geometry handles safely", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  assert.equal(machine.currentRect.width, 0);
  const result = machine.slideTo(1, {
    left: 20,
    top: 0,
    width: 40,
    height: 20,
  });
  assert.equal(result.distancePx, 20);
});

test("F3-T2-05: negative coordinates handle correctly during sliding calculation", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 50,
    height: 30,
  });
  const result = machine.slideTo(0, {
    left: -60,
    top: -80,
    width: 50,
    height: 30,
  });
  assert.equal(result.distancePx, 100);
});

/* ----------------------------------------------------------------------------
 * F4: Status Copy Boundaries - Tests 16 to 20
 * ------------------------------------------------------------------------- */

test("F4-T2-01: latency of exactly 0ms formats correctly in connected status", () => {
  const status = formatFriendlyStatus("connected", { latencyMs: 0 });
  assert.equal(status.text, "连通正常 · 0ms");
  assert.equal(status.indicatorColor, "green");
});

test("F4-T2-02: extreme latency (99999ms) formats without string truncation", () => {
  const status = formatFriendlyStatus("connected", { latencyMs: 99999 });
  assert.equal(status.text, "连通正常 · 99999ms");
});

test("F4-T2-03: empty error detail falls back to standard troubleshooting copy", () => {
  const status = formatFriendlyStatus("failed", { errorDetail: "" });
  assert.equal(status.text, "连接失败 · 请检查网络或密钥有效性");
  assert.equal(status.actionText, "重新测试");
});

test("F4-T2-04: partial character matches of forbidden words do not trigger false positive", () => {
  const harmless = "接通网络服务，正常测试通过";
  const audit = auditTextForMechanicalPhrases(harmless);
  assert.equal(audit.compliant, true);
  assert.equal(audit.violations.length, 0);
});

test("F4-T2-05: multiple forbidden phrases in single string are all detected", () => {
  const messy = "模型服务尚未接入，后台服务未接入，参数未报告";
  const audit = auditTextForMechanicalPhrases(messy);
  assert.equal(audit.compliant, false);
  assert.ok(audit.violations.includes("尚未接入"));
  assert.ok(audit.violations.includes("服务未接入"));
  assert.ok(audit.violations.includes("未报告"));
});

/* ----------------------------------------------------------------------------
 * F5: Navigation Boundaries - Tests 21 to 25
 * ------------------------------------------------------------------------- */

test("F5-T2-01: unknown or invalid route defaults safely to general in 软件系统", () => {
  const router = new SettingsNavigationRouter();
  const res = router.navigate("non-existent-page-xyz");
  assert.equal(res.section, "general");
  assert.equal(res.quadrant.id, "system");
});

test("F5-T2-02: empty string route resolves to general without throwing", () => {
  const router = new SettingsNavigationRouter();
  const res = router.navigate("");
  assert.equal(res.section, "general");
  assert.equal(res.quadrant.id, "system");
});

test("F5-T2-03: legacy synonyms comfy, comfyui, local all route to providers", () => {
  const router = new SettingsNavigationRouter();
  for (const synonym of ["comfy", "comfyui", "local"]) {
    const res = router.navigate(synonym);
    assert.equal(res.section, "providers");
    assert.equal(res.quadrant.id, "core_features");
  }
});

test("F5-T2-04: legacy extension synonyms mcp, plugins, skill, skills route to extensions", () => {
  const router = new SettingsNavigationRouter();
  for (const synonym of ["mcp", "plugins", "skill", "skills"]) {
    const res = router.navigate(synonym);
    assert.equal(res.section, "extensions");
    assert.equal(res.quadrant.id, "core_features");
  }
});

test("F5-T2-05: rapid navigation across all 4 quadrants updates quadrant correctly", () => {
  const router = new SettingsNavigationRouter();
  const r1 = router.navigate("shortcuts");
  assert.equal(r1.quadrant.id, "system");
  const r2 = router.navigate("account");
  assert.equal(r2.quadrant.id, "account_usage");
  const r3 = router.navigate("network");
  assert.equal(r3.quadrant.id, "core_features");
  const r4 = router.navigate("security");
  assert.equal(r4.quadrant.id, "security_data");
});

/* ----------------------------------------------------------------------------
 * F6: App Update Boundaries - Tests 26 to 30
 * ------------------------------------------------------------------------- */

test("F6-T2-01: setting download progress <0 clamps safely to 0", () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  machine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: ["更新"],
  });
  machine.startDownload();
  machine.setDownloadProgress(-25);
  assert.equal(machine.downloadProgress, 0);
  assert.equal(machine.state, "downloading");
});

test("F6-T2-02: setting download progress >100 clamps safely to 100 and marks readyToInstall", () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  machine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: ["更新"],
  });
  machine.startDownload();
  machine.setDownloadProgress(150);
  assert.equal(machine.downloadProgress, 100);
  assert.equal(machine.state, "readyToInstall");
});

test("F6-T2-03: attempting installAndRestart before ready throws explicit error", () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  assert.throws(
    () => machine.installAndRestart(),
    /Update not ready to install/,
  );
});

test("F6-T2-04: network error during update check sets error state and preserves current version", async () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  const state = await machine.checkUpdate(null); // Simulated network failure
  assert.equal(state, "error");
  assert.equal(machine.currentVersion, "2.1.40");
  assert.match(machine.errorMessage ?? "", /无法连接至更新服务器/);
});

test("F6-T2-05: dismissing error resets state back to idle and clears error message", async () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  await machine.checkUpdate(null);
  assert.equal(machine.state, "error");
  machine.dismissError();
  assert.equal(machine.state, "idle");
  assert.equal(machine.errorMessage, null);
});

/* ----------------------------------------------------------------------------
 * F7: Token Usage Boundaries - Tests 31 to 35
 * ------------------------------------------------------------------------- */

test("F7-T2-01: zero token record contributes 0 to totals without distortion", () => {
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: "test",
    model: "dummy",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    timestamp: Date.now(),
    estimatedCostUsd: 0,
  });
  const kpis = store.getKpiCards();
  assert.equal(kpis.totalTokens, 0);
  assert.equal(kpis.estimatedCostUsd, 0);
  assert.equal(kpis.activeModelsCount, 1);
});

test("F7-T2-02: extreme token volume (10^9 tokens) handles large arithmetic without precision loss", () => {
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: "deepseek",
    model: "deepseek-chat",
    promptTokens: 500_000_000,
    completionTokens: 500_000_000,
    totalTokens: 1_000_000_000,
    timestamp: Date.now(),
    estimatedCostUsd: 2000.5,
  });
  const kpis = store.getKpiCards();
  assert.equal(kpis.totalTokens, 1_000_000_000);
});

test("F7-T2-03: querying 0 days summary returns empty array safely", () => {
  const store = new TokenUsageStore();
  const summaries = store.getDailySummaries(0);
  assert.equal(summaries.length, 0);
});

test("F7-T2-04: empty store returns 0 KPI metrics and empty breakdown without NaN", () => {
  const store = new TokenUsageStore();
  const kpis = store.getKpiCards();
  assert.equal(kpis.totalTokens, 0);
  assert.equal(kpis.todayTokens, 0);
  assert.equal(kpis.estimatedCostUsd, 0);
  assert.equal(kpis.activeModelsCount, 0);
  assert.deepEqual(store.getModelBreakdown(), {});
});

test("F7-T2-05: quota threshold triggers isWarning at exactly 80% usage boundary", () => {
  const store = new TokenUsageStore();
  // Quota is 10M, 80% is 8M
  store.recordUsage({
    provider: "test",
    model: "m",
    promptTokens: 4_000_000,
    completionTokens: 4_000_000,
    totalTokens: 8_000_000,
    timestamp: Date.now(),
    estimatedCostUsd: 10,
  });
  const status = store.getQuotaStatus();
  assert.equal(status.ratio, 0.8);
  assert.equal(status.isWarning, true);
});

/* ----------------------------------------------------------------------------
 * F8: Shortcuts Boundaries - Tests 36 to 40
 * ------------------------------------------------------------------------- */

test("F8-T2-01: single modifier only normalizes to empty string and cannot register", () => {
  assert.equal(normalizeKeyCombination("Ctrl"), "");
  assert.equal(normalizeKeyCombination("Shift"), "");
  assert.equal(normalizeKeyCombination("Alt"), "");
  const registry = new ShortcutsRegistry();
  const res = registry.register({
    id: "invalid-mod",
    name: "Only Mod",
    keyCombo: "Ctrl",
    scope: "global",
  });
  assert.equal(res.success, false);
});

test("F8-T2-02: empty string key combination fails registration", () => {
  const registry = new ShortcutsRegistry();
  const res = registry.register({
    id: "empty-combo",
    name: "Empty",
    keyCombo: "",
    scope: "global",
  });
  assert.equal(res.success, false);
});

test("F8-T2-03: multiple modifiers without key (Ctrl+Shift) fails registration", () => {
  assert.equal(normalizeKeyCombination("Ctrl+Shift"), "");
  const registry = new ShortcutsRegistry();
  const res = registry.register({
    id: "no-key",
    name: "No Key",
    keyCombo: "Ctrl+Shift",
    scope: "global",
  });
  assert.equal(res.success, false);
});

test("F8-T2-04: identical shortcut in distinct non-global scopes does not conflict", () => {
  const registry = new ShortcutsRegistry();
  const r1 = registry.register({
    id: "composer-only",
    name: "C1",
    keyCombo: "Ctrl+B",
    scope: "composer",
  });
  assert.equal(r1.success, true);
  const r2 = registry.register({
    id: "settings-only",
    name: "S1",
    keyCombo: "Ctrl+B",
    scope: "settings",
  });
  assert.equal(r2.success, true);
});

test("F8-T2-05: updating non-existent shortcut ID returns failure error gracefully", () => {
  const registry = new ShortcutsRegistry();
  const res = registry.update("non_existent_id", "Ctrl+Alt+P");
  assert.equal(res.success, false);
  assert.match(res.error ?? "", /not found/);
});

/* ----------------------------------------------------------------------------
 * F9: Channel Boundaries - Tests 41 to 45
 * ------------------------------------------------------------------------- */

test("F9-T2-01: custom provider with unknown category falls back to official or relay cleanly", () => {
  const custom = {
    id: "my-custom-provider",
    label: "Custom",
    name: "Custom Gateway",
    category: "网关" as const,
    protocol: "OpenAI 兼容",
    baseUrl: "https://my-proxy.com/v1",
    website: "",
    keyUrl: "",
    docsUrl: "",
  };
  assert.equal(classifyProviderPreset(custom), "relay");
});

test("F9-T2-02: provider with local in ID but no category classifies as local", () => {
  const localProvider = {
    id: "local-comfyui-v2",
    label: "ComfyUI",
    name: "ComfyUI Local",
    category: "本地" as const,
    protocol: "ComfyUI 协议",
    baseUrl: "http://127.0.0.1:8188",
    website: "",
    keyUrl: "",
    docsUrl: "",
  };
  assert.equal(classifyProviderPreset(localProvider), "local");
});

test("F9-T2-03: provider with cli in ID classifies as cli", () => {
  const cliProvider = {
    id: "gemini-cli",
    label: "Gemini CLI",
    name: "Gemini CLI Native Bridge",
    category: "官方" as const,
    protocol: "CLI 进程管道",
    baseUrl: "native://gemini-cli",
    website: "",
    keyUrl: "",
    docsUrl: "",
  };
  assert.equal(classifyProviderPreset(cliProvider), "cli");
});

test("F9-T2-04: provider with oauth in ID classifies as oauth", () => {
  const oauthProvider = {
    id: "google-oauth",
    label: "Google 账号",
    name: "Google OAuth 2.0",
    category: "官方" as const,
    protocol: "OAuth Token",
    baseUrl: "https://accounts.google.com",
    website: "",
    keyUrl: "",
    docsUrl: "",
  };
  assert.equal(classifyProviderPreset(oauthProvider), "oauth");
});

test("F9-T2-05: CCSWITCH_5_CHANNELS contains unique IDs and localized non-empty labels", () => {
  const ids = CCSWITCH_5_CHANNELS.map((c) => c.id);
  assert.equal(new Set(ids).size, 5);
  for (const c of CCSWITCH_5_CHANNELS) {
    assert.ok(c.label.length > 0);
    assert.ok(c.description.length > 0);
  }
});

/* ----------------------------------------------------------------------------
 * F10: Probe & Catalog Boundaries - Tests 46 to 50
 * ------------------------------------------------------------------------- */

test("F10-T2-01: latency threshold boundary: 299ms is excellent, 300ms is fair", async () => {
  const probe299 = await executeLatencyProbe(
    "https://api.test",
    "key",
    299,
    200,
  );
  assert.equal(probe299.rating, "excellent");

  const probe300 = await executeLatencyProbe(
    "https://api.test",
    "key",
    300,
    200,
  );
  assert.equal(probe300.rating, "fair");
});

test("F10-T2-02: latency threshold boundary: 799ms is fair, 800ms is slow", async () => {
  const probe799 = await executeLatencyProbe(
    "https://api.test",
    "key",
    799,
    200,
  );
  assert.equal(probe799.rating, "fair");

  const probe800 = await executeLatencyProbe(
    "https://api.test",
    "key",
    800,
    200,
  );
  assert.equal(probe800.rating, "slow");
});

test("F10-T2-03: empty or whitespace API key fails probe immediately with 401 Unauthorized", async () => {
  const probe = await executeLatencyProbe("https://api.test", "   ", 50, 200);
  assert.equal(probe.success, false);
  assert.equal(probe.httpStatus, 401);
  assert.match(probe.errorMessage ?? "", /未配置有效密钥/);
});

test("F10-T2-04: HTTP 500 error marks probe failed and returns offline rating", async () => {
  const probe = await executeLatencyProbe("https://api.test", "key", 50, 500);
  assert.equal(probe.success, false);
  assert.equal(probe.httpStatus, 500);
  assert.equal(probe.rating, "offline");
});

test("F10-T2-05: toggling non-existent model ID in catalog manager returns false", () => {
  const manager = new ModelCatalogManager();
  assert.equal(manager.toggleEnabled("non-existent-model"), false);
  assert.equal(manager.setDefault("non-existent-model", "chat"), false);
});

/* ----------------------------------------------------------------------------
 * F11: Capability Boundaries - Tests 51 to 55
 * ------------------------------------------------------------------------- */

test("F11-T2-01: auto-routing with all providers offline falls back safely", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "model-1",
    name: "Model 1",
    capability: "chat",
    enabled: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "p1",
    channel: "relay",
    latencyMs: 100,
    successRate: 0.9,
    isOnline: false,
  });

  const route = scheduler.routeRequest("chat", "auto");
  assert.ok(route.dispatchedProvider);
  assert.equal(route.selectedModel, "model-1");
});

test("F11-T2-02: provider with low success rate (0.2) is outranked by high success rate (0.95)", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "gpt-4o",
    name: "GPT-4o",
    capability: "chat",
    enabled: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "flaky-fast",
    channel: "relay",
    latencyMs: 50,
    successRate: 0.2, // Score = 200 - 50 = 150
    isOnline: true,
  });
  scheduler.registerProvider({
    providerId: "stable-slower",
    channel: "official",
    latencyMs: 120,
    successRate: 0.95, // Score = 950 - 120 = 830
    isOnline: true,
  });

  const route = scheduler.routeRequest("chat", "auto");
  assert.equal(route.dispatchedProvider, "stable-slower");
});

test("F11-T2-03: equal success rate prioritizes lower latency provider", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "qwen",
    name: "Qwen",
    capability: "chat",
    enabled: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "provider-slow",
    channel: "relay",
    latencyMs: 350,
    successRate: 1.0,
    isOnline: true,
  });
  scheduler.registerProvider({
    providerId: "provider-fast",
    channel: "relay",
    latencyMs: 80,
    successRate: 1.0,
    isOnline: true,
  });

  const route = scheduler.routeRequest("chat", "auto");
  assert.equal(route.dispatchedProvider, "provider-fast");
});

test("F11-T2-04: requesting disabled model explicitly throws error", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "disabled-model",
    name: "Disabled",
    capability: "chat",
    enabled: false,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  assert.throws(
    () => scheduler.routeRequest("chat", "disabled-model"),
    /当前没有可用的「对话\/推理」模型/,
  );
});

test("F11-T2-05: requesting unknown capability string throws error", () => {
  const catalog = new ModelCatalogManager();
  const scheduler = new UnifiedCapabilityScheduler(catalog);
  assert.throws(
    () => scheduler.routeRequest("audio" as unknown as "chat", "auto"),
    /当前没有可用的/,
  );
});

/* ----------------------------------------------------------------------------
 * F12: Lint Gate Boundaries - Tests 56 to 60
 * ------------------------------------------------------------------------- */

test("F12-T2-01: empty file produces 0 violations", () => {
  const violations = lintUiSourceCode("", "empty.css");
  assert.equal(violations.length, 0);
});

test("F12-T2-02: multiple distinct violations on same or successive lines are all captured", () => {
  const code = `
    .kk-button { border-radius: 999px; }
    <details className="settings-disclosure"><summary>Fold</summary></details>
    <div style={{ borderRadius: "999px" }} />
  `;
  const violations = lintUiSourceCode(code, "multi.tsx");
  assert.equal(violations.length, 3);
  const rules = violations.map((v) => v.rule);
  assert.ok(rules.includes("no_999px_control"));
  assert.ok(rules.includes("no_disclosure_triangle"));
  assert.ok(rules.includes("no_inline_radius"));
});

test("F12-T2-03: badge and avatar classes with 999px are exempted from inline radius rule", () => {
  const validPill = `<span style={{ borderRadius: "999px" }} className="status-badge" />`;
  const violations = lintUiSourceCode(validPill, "Badge.tsx");
  assert.equal(violations.length, 0);
});

test("F12-T2-04: CRLF line endings produce accurate line numbers", () => {
  const crlfCode =
    "line 1\r\nline 2\r\n.settings-action { border-radius: 999px; }";
  const violations = lintUiSourceCode(crlfCode, "test.css");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].lineNumber, 3);
});

test("F12-T2-05: case-insensitive CSS matching properly detects BORDER-RADIUS: 999PX", () => {
  const upperCaseCode = `.kk-button { BORDER-RADIUS: 999PX; }`;
  const violations = lintUiSourceCode(upperCaseCode, "upper.css");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "no_999px_control");
});
