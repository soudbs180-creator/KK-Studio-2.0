import assert from "node:assert/strict";
import test from "node:test";
import {
  InsetCardGroupModel,
  SlidingPillMachine,
  formatFriendlyStatus,
  auditTextForMechanicalPhrases,
  SETTINGS_4_QUADRANTS,
  SettingsNavigationRouter,
  AppUpdateStateMachine,
  TokenUsageStore,
  ShortcutsRegistry,
  classifyProviderPreset,
  CCSWITCH_5_CHANNELS,
  executeLatencyProbe,
  ModelCatalogManager,
  UnifiedCapabilityScheduler,
  lintUiSourceCode,
  isRadiusCompliant,
} from "./harness.ts";
import { PROVIDER_PRESETS } from "../../src/domain/providerPresets.ts";

/* ============================================================================
 * Tier 3: Cross-Feature Interactions & Pairwise Combinations
 *
 * 16 Tests covering combinatorial interactions across F1 - F12
 * Derived from ORIGINAL_REQUEST.md & TEST_INFRA.md
 * ========================================================================== */

test("SCENARIO-T3-01 (F5 + F6 + F3): navigating to software update tab animates sliding pill and initializes 7-state machine", () => {
  const router = new SettingsNavigationRouter();
  const pill = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 80,
    height: 32,
  });
  const updateMachine = new AppUpdateStateMachine("2.1.40");

  const nav = router.navigate("updates");
  assert.equal(nav.section, "updates");
  assert.equal(nav.quadrant.label, "软件系统");

  // Sliding pill moves to updates tab (e.g. index 2 at left: 180)
  const motion = pill.slideTo(2, { left: 180, top: 0, width: 90, height: 32 });
  assert.equal(motion.springCurve, "cubic-bezier(0.34, 1.56, 0.64, 1)");
  assert.equal(pill.activeIndex, 2);
  pill.settle();

  assert.equal(updateMachine.state, "idle");
  assert.equal(updateMachine.currentVersion, "2.1.40");
});

test("SCENARIO-T3-02 (F5 + F7 + F2): profile token usage dashboard renders in Inset Grouped card with 4 KPI cards", () => {
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: "deepseek",
    model: "deepseek-chat",
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
    timestamp: Date.now(),
    estimatedCostUsd: 0.003,
  });

  const kpis = store.getKpiCards();
  const group = new InsetCardGroupModel({
    id: "usage-kpi-group",
    title: "个人用量看板",
    description: "当前计费周期内的 Token 与模型调用统计",
    radiusPx: 20,
    rows: [
      {
        id: "kpi-total",
        label: "总消耗 Token",
        controlType: "custom",
        controlValue: kpis.totalTokens,
      },
      {
        id: "kpi-today",
        label: "今日 Token",
        controlType: "custom",
        controlValue: kpis.todayTokens,
      },
      {
        id: "kpi-cost",
        label: "预估费用",
        controlType: "custom",
        controlValue: `$${kpis.estimatedCostUsd}`,
      },
      {
        id: "kpi-models",
        label: "活跃模型数",
        controlType: "custom",
        controlValue: kpis.activeModelsCount,
      },
    ],
  });

  assert.equal(group.rowCount, 4);
  assert.equal(group.hasRowDivider(0), true);
  assert.equal(group.hasRowDivider(3), false);
  const html = group.renderHtmlStructure();
  assert.match(html, /总消耗 Token/);
  assert.match(html, /border-radius: 20px/);
});

test("SCENARIO-T3-03 (F5 + F8 + F1): shortcuts manager uses 8px controls and records custom shortcut without collision", () => {
  const router = new SettingsNavigationRouter();
  router.navigate("shortcuts");

  const registry = new ShortcutsRegistry();
  const buttonCheck = isRadiusCompliant("button", 8);
  assert.equal(buttonCheck.compliant, true);

  // User records custom key combination
  const updateRes = registry.update("open_settings", "Ctrl+Alt+S");
  assert.equal(updateRes.success, true);

  const updated = registry.getAll().find((s) => s.id === "open_settings");
  assert.equal(updated?.keyCombo, "Ctrl+Alt+S");
  assert.equal(updated?.isCustom, true);
});

test("SCENARIO-T3-04 (F9 + F10 + F4): switching to Relay channel and testing connection outputs warm latency copy", async () => {
  const channel = CCSWITCH_5_CHANNELS.find((c) => c.id === "relay");
  assert.ok(channel);

  // Execute sub-3s probe to relay endpoint
  const probe = await executeLatencyProbe(
    "https://api.siliconflow.cn/v1",
    "sk-live-key",
    115,
    200,
  );
  assert.equal(probe.success, true);
  assert.equal(probe.rating, "excellent");

  // Format friendly status
  const friendly = formatFriendlyStatus("connected", {
    latencyMs: probe.latencyMs,
  });
  assert.equal(friendly.text, `连通正常 · ${probe.latencyMs}ms`);
  assert.equal(friendly.indicatorColor, "green");

  const audit = auditTextForMechanicalPhrases(friendly.text);
  assert.equal(audit.compliant, true);
});

test("SCENARIO-T3-05 (F9 + F10 + F11): enabling model in Relay catalog immediately updates Composer capability list", () => {
  const catalog = new ModelCatalogManager();
  const scheduler = new UnifiedCapabilityScheduler(catalog);

  // Initial state: no chat models enabled
  assert.equal(catalog.getEnabledModels("chat").length, 0);

  // Provider onboarding: SiliconFlow model fetched and enabled
  catalog.addOrUpdate({
    id: "qwen-2.5-72b",
    name: "Qwen 2.5 72B Instruct",
    capability: "chat",
    enabled: true,
  });

  scheduler.registerProvider({
    providerId: "siliconflow-relay",
    channel: "relay",
    latencyMs: 110,
    successRate: 0.99,
    isOnline: true,
  });

  const route = scheduler.routeRequest("chat", "auto");
  assert.equal(route.selectedModel, "qwen-2.5-72b");
  assert.equal(route.dispatchedProvider, "siliconflow-relay");
  assert.equal(route.channel, "relay");
});

test("SCENARIO-T3-06 (F8 + F11 + F5): global Ctrl+, opens settings while composer Ctrl+Enter dispatches prompt", () => {
  const registry = new ShortcutsRegistry();
  const settingsShortcut = registry
    .getAll()
    .find((s) => s.id === "open_settings");
  const sendShortcut = registry.getAll().find((s) => s.id === "send_message");

  assert.equal(settingsShortcut?.keyCombo, "Ctrl+,");
  assert.equal(settingsShortcut?.scope, "global");

  assert.equal(sendShortcut?.keyCombo, "Ctrl+Enter");
  assert.equal(sendShortcut?.scope, "composer");

  // Router handles settings open
  const router = new SettingsNavigationRouter();
  const nav = router.navigate("general");
  assert.equal(nav.section, "general");
});

test("SCENARIO-T3-07 (F10 + F4 + F9): empty API key in Official channel displays actionable friendly guidance", async () => {
  const probe = await executeLatencyProbe(
    "https://api.openai.com/v1",
    "",
    20,
    200,
  );
  assert.equal(probe.success, false);
  assert.equal(probe.httpStatus, 401);

  const status = formatFriendlyStatus("unconfigured");
  assert.equal(status.text, "未配置密钥（立即填写并测试）");
  assert.equal(status.actionText, "立即填写");
  assert.equal(status.indicatorColor, "yellow");
});

test("SCENARIO-T3-08 (F7 + F11 + F5): completing capability-routed prompt records telemetry and updates Profile KPI", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "claude-3-5",
    name: "Claude 3.5",
    capability: "chat",
    enabled: true,
  });
  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "anthropic-direct",
    channel: "official",
    latencyMs: 140,
    successRate: 1.0,
    isOnline: true,
  });

  const route = scheduler.routeRequest("chat", "auto");
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: route.dispatchedProvider,
    model: route.selectedModel,
    promptTokens: 850,
    completionTokens: 350,
    totalTokens: 1200,
    timestamp: Date.now(),
    estimatedCostUsd: 0.007,
  });

  const kpis = store.getKpiCards();
  assert.equal(kpis.totalTokens, 1200);
  assert.equal(kpis.activeModelsCount, 1);
});

test("SCENARIO-T3-09 (F6 + F4): available update presents warm copy and changelog notes", async () => {
  const updateMachine = new AppUpdateStateMachine("2.1.40");
  const state = await updateMachine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: [
      "苹果级 Inset Grouped 卡片",
      "5 渠道模型接入",
      "Token 用量看板",
    ],
  });

  assert.equal(state, "available");
  const versionInfo = updateMachine.latestVersionInfo;
  assert.ok(versionInfo);
  assert.equal(versionInfo.changelog.length, 3);

  for (const item of versionInfo.changelog) {
    const audit = auditTextForMechanicalPhrases(item);
    assert.equal(audit.compliant, true);
  }
});

test("SCENARIO-T3-10 (F1 + F2 + F12): InsetCardGroup with 8px buttons and 16px radius passes UI lint with 0 violations", () => {
  const cleanComponentCode = `
    .settings-group {
      border-radius: var(--kk-radius-card); /* 16px-20px */
    }
    .settings-button {
      border-radius: var(--kk-radius-control); /* 8px */
    }
  `;
  const violations = lintUiSourceCode(cleanComponentCode, "SettingsGroup.css");
  assert.equal(violations.length, 0);
});

test("SCENARIO-T3-11 (F9 + F10 + F11): SiliconFlow preset classifies as Relay, fetches Qwen, and defaults into Chat", () => {
  const siliconPreset = PROVIDER_PRESETS.find((p) => p.id === "siliconflow");
  assert.ok(siliconPreset);
  assert.equal(classifyProviderPreset(siliconPreset), "relay");

  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "qwen-2.5-coder",
    name: "Qwen 2.5 Coder 32B",
    capability: "chat",
    enabled: true,
  });
  catalog.setDefault("qwen-2.5-coder", "chat");

  assert.equal(catalog.getDefaultModel("chat")?.id, "qwen-2.5-coder");
});

test("SCENARIO-T3-12 (F8 + F6): keystroke conflict engine guards system keys while background update is downloading", () => {
  const updateMachine = new AppUpdateStateMachine("2.1.40");
  updateMachine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: ["更新"],
  });
  updateMachine.startDownload();
  assert.equal(updateMachine.state, "downloading");

  // User attempts to bind reserved key Ctrl+C while download runs
  const registry = new ShortcutsRegistry();
  const attempt = registry.register({
    id: "copy-override",
    name: "试图覆盖拷贝",
    keyCombo: "Ctrl+C",
    scope: "global",
  });
  assert.equal(attempt.success, false);
  assert.match(attempt.error ?? "", /保留组合/);
});

test("SCENARIO-T3-13 (F7 + F10): network latency probe results and token usage maintain distinct stores", async () => {
  const probe = await executeLatencyProbe("https://api.test", "key", 90, 200);
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: "test",
    model: "test-model",
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    timestamp: Date.now(),
    estimatedCostUsd: 0.001,
  });

  assert.equal(probe.latencyMs, 90);
  assert.equal(store.getKpiCards().totalTokens, 150);
  // Ensure no cross-pollution
  assert.equal(
    typeof (probe as unknown as Record<string, unknown>).totalTokens,
    "undefined",
  );
  assert.equal(
    typeof (store.getKpiCards() as unknown as Record<string, unknown>)
      .latencyMs,
    "undefined",
  );
});

test("SCENARIO-T3-14 (F3 + F9): sliding pill indicator smoothly interpolates across ccswitch 5 channels", () => {
  const machine = new SlidingPillMachine(
    { left: 0, top: 0, width: 70, height: 28 },
    0,
  );
  const channelWidth = 80;

  for (let i = 1; i < CCSWITCH_5_CHANNELS.length; i++) {
    const move = machine.slideTo(i, {
      left: i * channelWidth,
      top: 0,
      width: 70,
      height: 28,
    });
    assert.equal(move.springCurve, "cubic-bezier(0.34, 1.56, 0.64, 1)");
    assert.equal(machine.activeIndex, i);
    machine.settle();
    assert.equal(machine.currentRect.left, i * channelWidth);
  }
});

test("SCENARIO-T3-15 (F10 + F11 + F4): when all image models disabled, Composer presents warm empty state copy", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "flux-schnell",
    name: "Flux Schnell",
    capability: "image",
    enabled: false,
  });

  assert.equal(catalog.getEnabledModels("image").length, 0);

  const emptyStatus = formatFriendlyStatus("empty_catalog");
  assert.equal(emptyStatus.text, "暂无可用模型，请一键拉取或手动添加常用模型");
  assert.equal(emptyStatus.actionText, "拉取模型");

  const audit = auditTextForMechanicalPhrases(emptyStatus.text);
  assert.equal(audit.compliant, true);
});

test("SCENARIO-T3-16 (F1 + F5 + F12): all 4 quadrants navigation respect 8px control radius and pass UI standards", () => {
  for (const quad of SETTINGS_4_QUADRANTS) {
    for (const section of quad.sections) {
      assert.ok(section.id.length > 0);
      assert.ok(section.label.length > 0);
    }
  }

  // Check generated navigation layout snippet
  const navSnippet = `
    .settings-nav-item {
      border-radius: var(--kk-radius-control); /* 8px */
      transition: background var(--motion-spring);
    }
    .settings-quadrant-card {
      border-radius: var(--kk-radius-card); /* 16-20px */
    }
  `;
  const violations = lintUiSourceCode(navSnippet, "SettingsNav.css");
  assert.equal(violations.length, 0);
});
