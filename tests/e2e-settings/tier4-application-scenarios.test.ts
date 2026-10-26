import assert from "node:assert/strict";
import test from "node:test";
import {
  isRadiusCompliant,
  InsetCardGroupModel,
  SlidingPillMachine,
  formatFriendlyStatus,
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
} from "./harness.ts";
import { PROVIDER_PRESETS } from "../../src/domain/providerPresets.ts";

/* ============================================================================
 * Tier 4: Real-World Application Workloads (Scenarios S1 - S6)
 *
 * End-to-end user workflows derived directly from TEST_INFRA.md & ORIGINAL_REQUEST.md
 * ========================================================================== */

test("S1: Greenfield Setup & Provider Onboarding (F1, F5, F9, F10)", async () => {
  // 1. User launches application and opens Settings
  const router = new SettingsNavigationRouter();
  const navToSettings = router.navigate("providers");
  assert.equal(navToSettings.section, "providers");
  assert.equal(navToSettings.quadrant.label, "核心功能");

  // 2. Selects "中转路由 (Relay)" channel in ccswitch UI
  const relayChannel = CCSWITCH_5_CHANNELS.find((c) => c.id === "relay");
  assert.ok(relayChannel);
  assert.equal(relayChannel.label, "中转路由");

  // 3. Picks "SiliconFlow" provider preset
  const siliconPreset = PROVIDER_PRESETS.find((p) => p.id === "siliconflow");
  assert.ok(siliconPreset);
  assert.equal(classifyProviderPreset(siliconPreset), "relay");
  assert.equal(siliconPreset.baseUrl, "https://api.siliconflow.cn/v1");

  // 4. Inputs API Key and verifies 8px control button styling
  const apiKey = "sk-live-mock-siliconflow-key-12345";
  assert.equal(isRadiusCompliant("input", 8).compliant, true);
  assert.equal(isRadiusCompliant("button", 8).compliant, true);

  // 5. Clicks "测试连通性" -> Sub-3s latency probe completes
  const probe = await executeLatencyProbe(
    siliconPreset.baseUrl,
    apiKey,
    145,
    200,
  );
  assert.equal(probe.success, true);
  assert.ok(
    probe.latencyMs < 3000,
    `Latency was ${probe.latencyMs}ms, expected < 3000ms`,
  );
  assert.equal(probe.rating, "excellent");

  // Status displays warm humanized copy
  const status = formatFriendlyStatus("connected", {
    latencyMs: probe.latencyMs,
  });
  assert.equal(status.text, `连通正常 · ${probe.latencyMs}ms`);
  assert.equal(status.indicatorColor, "green");

  // 6. Clicks "拉取模型列表" -> Enables Qwen & DeepSeek in Catalog
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "Qwen/Qwen2.5-72B-Instruct",
    name: "通义千问 2.5 72B",
    capability: "chat",
    enabled: true,
    isDefault: true,
  });
  catalog.addOrUpdate({
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek V3",
    capability: "chat",
    enabled: true,
  });

  const enabled = catalog.getEnabledModels("chat");
  assert.equal(enabled.length, 2);
  assert.equal(
    catalog.getDefaultModel("chat")?.id,
    "Qwen/Qwen2.5-72B-Instruct",
  );
});

test("S2: Daily Token Quota & Profile Inspection (F2, F5, F7)", () => {
  // 1. User navigates to 账号与用量 -> 个人主页
  const router = new SettingsNavigationRouter();
  const nav = router.navigate("account");
  assert.equal(nav.section, "account");
  assert.equal(nav.quadrant.label, "账号与用量");

  // 2. Setup token telemetry in TokenUsageStore
  const store = new TokenUsageStore();
  const now = Date.now();
  const oneDay = 86_400_000;

  // Record 7 days of token usage
  for (let i = 6; i >= 0; i--) {
    store.recordUsage({
      provider: "siliconflow",
      model: "deepseek-ai/DeepSeek-V3",
      promptTokens: 2000 + i * 500,
      completionTokens: 1000 + i * 200,
      totalTokens: 3000 + i * 700,
      timestamp: now - i * oneDay,
      estimatedCostUsd: 0.005 + i * 0.001,
    });
  }

  // 3. Inspects 4 KPI cards
  const kpis = store.getKpiCards(now);
  assert.ok(kpis.totalTokens > 0);
  assert.ok(kpis.todayTokens > 0);
  assert.ok(kpis.estimatedCostUsd > 0);
  assert.equal(kpis.activeModelsCount, 1);

  // 4. Inspects 7-day stacked bar consumption chart
  const summaries = store.getDailySummaries(7, now);
  assert.equal(summaries.length, 7);
  const svg = store.generateSvgChart(7);
  assert.match(svg, /<svg/);
  assert.match(svg, /fill="#21a673"/);

  // 5. Verifies Inset Grouped card container
  const cardGroup = new InsetCardGroupModel({
    id: "profile-usage-card",
    title: "Token 消耗看板",
    description: "实时统计已接入模型的用量分配",
    radiusPx: 16,
    rows: [
      {
        id: "quota",
        label: "用量额度",
        controlType: "custom",
        controlValue: "10,000,000",
      },
      {
        id: "used",
        label: "已用 Token",
        controlType: "custom",
        controlValue: kpis.totalTokens,
      },
    ],
  });
  assert.equal(cardGroup.hasFoldTriangleMarker(), false);
  const html = cardGroup.renderHtmlStructure();
  assert.match(html, /border-radius: 16px/);
});

test("S3: Shortcut Customization & Collision Shield (F5, F8)", () => {
  // 1. User opens 快捷键管理 in 软件系统
  const router = new SettingsNavigationRouter();
  const nav = router.navigate("shortcuts");
  assert.equal(nav.section, "shortcuts");
  assert.equal(nav.quadrant.label, "软件系统");

  const registry = new ShortcutsRegistry();

  // 2. User attempts to bind reserved key (Ctrl+C) -> Shield warns and blocks
  const attemptReserved = registry.register({
    id: "bad-copy",
    name: "试图覆盖拷贝",
    keyCombo: "Ctrl+C",
    scope: "global",
  });
  assert.equal(attemptReserved.success, false);
  assert.match(attemptReserved.error ?? "", /保留组合/);

  // 3. User attempts to bind colliding key (Ctrl+K) in global scope -> Collision detected
  const attemptConflict = registry.register({
    id: "new-feature",
    name: "新特性搜索",
    keyCombo: "Ctrl+K",
    scope: "global",
  });
  assert.equal(attemptConflict.success, false);
  assert.match(attemptConflict.error ?? "", /冲突/);

  // 4. User successfully binds clean custom shortcut (Ctrl+Shift+P)
  const successBind = registry.register({
    id: "command_palette",
    name: "命令调色板",
    keyCombo: "Ctrl+Shift+P",
    scope: "global",
  });
  assert.equal(successBind.success, true);

  const registered = registry.getAll().find((s) => s.id === "command_palette");
  assert.equal(registered?.keyCombo, "Ctrl+Shift+P");
});

test("S4: Software Update Check & Changelog View (F5, F6)", async () => {
  // 1. User opens 软件更新 page in 软件系统
  const router = new SettingsNavigationRouter();
  const nav = router.navigate("updates");
  assert.equal(nav.section, "updates");
  assert.equal(nav.quadrant.label, "软件系统");

  const updateMachine = new AppUpdateStateMachine("2.1.40");
  assert.equal(updateMachine.state, "idle");
  assert.equal(updateMachine.currentVersion, "2.1.40");

  // 2. Clicks "检查更新" -> State progresses and discovers new version
  const updateState = await updateMachine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: [
      "设计规范对齐苹果美学（8px 基础控件 / 16-20px 卡片组）",
      "全新 4 象限设置架构与独立软件更新页",
      "ccswitch 5 渠道模型接入交互架构",
      "Composer 统一模型能力聚合与自动调配",
    ],
  });
  assert.equal(updateState, "available");
  assert.equal(updateMachine.state, "available");
  assert.equal(updateMachine.latestVersionInfo?.version, "2.2.0");
  assert.equal(updateMachine.latestVersionInfo?.changelog.length, 4);

  // 4. User initiates download -> Observes progression
  updateMachine.startDownload();
  assert.equal(updateMachine.state, "downloading");

  updateMachine.setDownloadProgress(25);
  assert.equal(updateMachine.downloadProgress, 25);

  updateMachine.setDownloadProgress(75);
  assert.equal(updateMachine.downloadProgress, 75);

  updateMachine.setDownloadProgress(100);
  assert.equal(updateMachine.state, "readyToInstall");

  // 5. Clicks "立即重启并更新" -> Completes upgrade
  const installResult = updateMachine.installAndRestart();
  assert.equal(installResult.success, true);
  assert.equal(installResult.newVersion, "2.2.0");
  assert.equal(updateMachine.currentVersion, "2.2.0");
  assert.equal(updateMachine.state, "idle");
});

test("S5: Composer Capability-First Creation (F3, F11)", () => {
  // 1. User in Composer opens Model Picker Menu
  const pill = new SlidingPillMachine(
    { left: 0, top: 0, width: 90, height: 32 },
    0,
  );
  // User switches tab from "对话 / 推理" (tab 0) to "图像生成" (tab 1)
  const motion = pill.slideTo(1, { left: 100, top: 0, width: 90, height: 32 });
  assert.equal(motion.springCurve, "cubic-bezier(0.34, 1.56, 0.64, 1)");
  pill.settle();

  // 2. Setup Model Catalog with active providers across channels
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "deepseek-chat",
    name: "DeepSeek V3",
    capability: "chat",
    enabled: true,
    isDefault: true,
  });
  catalog.addOrUpdate({
    id: "flux-schnell",
    name: "Flux Schnell",
    capability: "image",
    enabled: true,
    isDefault: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "siliconflow-gateway",
    channel: "relay",
    latencyMs: 95,
    successRate: 0.99,
    isOnline: true,
    capabilities: ["chat"],
  });
  scheduler.registerProvider({
    providerId: "local-comfyui",
    channel: "local",
    latencyMs: 30,
    successRate: 0.98,
    isOnline: true,
    capabilities: ["image"],
  });

  // 3. User selects "自动调配 (Auto-Routing)" for Chat capability
  const chatRoute = scheduler.routeRequest("chat", "auto");
  assert.equal(chatRoute.isAutoRouted, true);
  assert.equal(chatRoute.selectedModel, "deepseek-chat");
  assert.equal(chatRoute.dispatchedProvider, "siliconflow-gateway");
  assert.equal(chatRoute.channel, "relay");

  // 4. User selects "自动调配" for Image generation capability
  const imageRoute = scheduler.routeRequest("image", "auto");
  assert.equal(imageRoute.isAutoRouted, true);
  assert.equal(imageRoute.selectedModel, "flux-schnell");
  assert.equal(imageRoute.dispatchedProvider, "local-comfyui");
  assert.equal(imageRoute.channel, "local");

  // User did not need to pick channel manually
  assert.ok(chatRoute.channel);
  assert.ok(imageRoute.channel);
});

test("S6: Design Token Compliance & Gate Enforcement (F1, F2, F12)", () => {
  // 1. Verify Design Token radius scales
  assert.equal(isRadiusCompliant("button", 8).compliant, true);
  assert.equal(isRadiusCompliant("input", 8).compliant, true);
  assert.equal(isRadiusCompliant("card", 16).compliant, true);
  assert.equal(isRadiusCompliant("card", 20).compliant, true);
  assert.equal(isRadiusCompliant("badge", 999).compliant, true);

  // 2. Run static linter against sample compliant vs non-compliant code
  const nonCompliantSnippet = `
    .settings-save-button {
      border-radius: 999px;
    }
    <details className="settings-disclosure">
      <summary>Legacy Fold</summary>
    </details>
  `;
  const violations = lintUiSourceCode(
    nonCompliantSnippet,
    "LegacySettings.tsx",
  );
  assert.equal(violations.length, 2);
  assert.equal(violations[0].rule, "no_999px_control");
  assert.equal(violations[1].rule, "no_disclosure_triangle");

  // 3. Verify compliant Inset Grouped card passes cleanly
  const compliantSnippet = `
    .settings-card-group {
      border-radius: var(--kk-radius-card);
    }
    .settings-control-button {
      border-radius: var(--kk-radius-control);
    }
  `;
  const compliantViolations = lintUiSourceCode(
    compliantSnippet,
    "ModernSettings.tsx",
  );
  assert.equal(compliantViolations.length, 0);
});
