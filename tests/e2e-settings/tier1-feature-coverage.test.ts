import assert from "node:assert/strict";
import test from "node:test";
import {
  isRadiusCompliant,
  RADIUS_STANDARDS,
  InsetCardGroupModel,
  SlidingPillMachine,
  auditTextForMechanicalPhrases,
  formatFriendlyStatus,
  SETTINGS_4_QUADRANTS,
  SettingsNavigationRouter,
  AppUpdateStateMachine,
  TokenUsageStore,
  ShortcutsRegistry,
  normalizeKeyCombination,
  CCSWITCH_5_CHANNELS,
  classifyProviderPreset,
  executeLatencyProbe,
  ModelCatalogManager,
  UnifiedCapabilityScheduler,
  lintUiSourceCode,
} from "./harness.ts";
import { PROVIDER_PRESETS } from "../../src/domain/providerPresets.ts";

/* ============================================================================
 * Tier 1: Feature Coverage (Equivalence Classes for Features F1 - F12)
 *
 * 60 Tests (5 tests per feature across 12 features)
 * Derived from ORIGINAL_REQUEST.md (R1 - R5, AC1 - AC4)
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * F1: Radius Scale & Control 8px (R1, AC1) - Tests 01 to 05
 * ------------------------------------------------------------------------- */

test("F1-T1-01: control radius standard is strictly 8px", () => {
  assert.equal(RADIUS_STANDARDS.control, 8);
  const check = isRadiusCompliant("button", 8);
  assert.equal(check.compliant, true);
  assert.equal(check.expected, "8px");
});

test("F1-T1-02: card and panel radius standard is between 16px and 20px", () => {
  assert.equal(RADIUS_STANDARDS.cardMin, 16);
  assert.equal(RADIUS_STANDARDS.cardMax, 20);
  assert.equal(isRadiusCompliant("card", 16).compliant, true);
  assert.equal(isRadiusCompliant("card", 20).compliant, true);
  assert.equal(isRadiusCompliant("panel", 18).compliant, true);
  assert.equal(isRadiusCompliant("card", 8).compliant, false);
  assert.equal(isRadiusCompliant("card", 999).compliant, false);
});

test("F1-T1-03: menu and popover radius standard is 10px", () => {
  assert.equal(RADIUS_STANDARDS.menu, 10);
  assert.equal(isRadiusCompliant("menu", 10).compliant, true);
  assert.equal(isRadiusCompliant("menu", 8).compliant, false);
  assert.equal(isRadiusCompliant("menu", 16).compliant, false);
});

test("F1-T1-04: button elements strictly reject 999px capsule radius", () => {
  const check999 = isRadiusCompliant("button", 999);
  assert.equal(check999.compliant, false);
  assert.equal(check999.expected, "8px");
  const check8 = isRadiusCompliant("button", 8);
  assert.equal(check8.compliant, true);
});

test("F1-T1-05: 999px radius is permitted exclusively for status badges and pill indicators", () => {
  assert.equal(isRadiusCompliant("badge", 999).compliant, true);
  assert.equal(isRadiusCompliant("pill", 999).compliant, true);
  assert.equal(isRadiusCompliant("input", 999).compliant, false);
  assert.equal(isRadiusCompliant("select", 999).compliant, false);
});

/* ----------------------------------------------------------------------------
 * F2: Inset Grouped Cards & Fold Elimination (R1, AC1) - Tests 06 to 10
 * ------------------------------------------------------------------------- */

test("F2-T1-01: InsetCardGroupModel enforces 16-20px outer radius", () => {
  const group = new InsetCardGroupModel({
    id: "general-group",
    title: "基础外观",
    radiusPx: 16,
    rows: [],
  });
  assert.equal(group.props.radiusPx, 16);
  assert.throws(
    () =>
      new InsetCardGroupModel({
        id: "invalid-group",
        radiusPx: 8,
        rows: [],
      }),
    /Inset Grouped Card outer radius must be between 16px and 20px/,
  );
});

test("F2-T1-02: InsetCardGroup renders label, helper description and control element", () => {
  const group = new InsetCardGroupModel({
    id: "update-group",
    radiusPx: 18,
    rows: [
      {
        id: "auto-check",
        label: "自动检查更新",
        description: "在后台静默检查新版本并发送提示",
        controlType: "switch",
        controlValue: true,
      },
    ],
  });
  const html = group.renderHtmlStructure();
  assert.match(html, /自动检查更新/);
  assert.match(html, /在后台静默检查新版本并发送提示/);
  assert.match(html, /data-type="switch"/);
});

test("F2-T1-03: InsetCardGroup creates subtle 1px dividers between interior rows", () => {
  const group = new InsetCardGroupModel({
    id: "multi-row",
    radiusPx: 20,
    rows: [
      { id: "r1", label: "选项一", controlType: "switch" },
      { id: "r2", label: "选项二", controlType: "button" },
      { id: "r3", label: "选项三", controlType: "input" },
    ],
  });
  assert.equal(group.hasRowDivider(0), true);
  assert.equal(group.hasRowDivider(1), true);
  assert.equal(group.hasRowDivider(2), false); // Last row has no divider
});

test("F2-T1-04: InsetCardGroup eliminates raw details disclosure triangles", () => {
  const group = new InsetCardGroupModel({
    id: "card-clean",
    radiusPx: 16,
    rows: [{ id: "clean-row", label: "语言设置", controlType: "select" }],
  });
  assert.equal(group.hasFoldTriangleMarker(), false);
  const html = group.renderHtmlStructure();
  assert.doesNotMatch(html, /<details/i);
  assert.doesNotMatch(html, /<summary/i);
});

test("F2-T1-05: InsetCardGroup marks destructive actions with danger styling", () => {
  const group = new InsetCardGroupModel({
    id: "danger-group",
    radiusPx: 16,
    rows: [
      {
        id: "clear-cache",
        label: "清除所有本地缓存",
        description: "该操作不可撤销",
        controlType: "button",
        danger: true,
      },
    ],
  });
  const html = group.renderHtmlStructure();
  assert.match(html, /is-danger/);
});

/* ----------------------------------------------------------------------------
 * F3: Sliding Pill Indicator & Spring Motion (R1, AC1) - Tests 11 to 15
 * ------------------------------------------------------------------------- */

test("F3-T1-01: SlidingPillMachine initializes with starting geometry and index", () => {
  const machine = new SlidingPillMachine(
    { left: 10, top: 0, width: 80, height: 32 },
    0,
  );
  assert.equal(machine.activeIndex, 0);
  assert.deepEqual(machine.currentRect, {
    left: 10,
    top: 0,
    width: 80,
    height: 32,
  });
  assert.equal(machine.isTransitioning, false);
});

test("F3-T1-02: SlidingPillMachine uses spring physics cubic-bezier curve", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 60,
    height: 28,
  });
  const result = machine.slideTo(1, {
    left: 70,
    top: 0,
    width: 90,
    height: 28,
  });
  assert.equal(result.springCurve, "cubic-bezier(0.34, 1.56, 0.64, 1)");
  assert.equal(machine.springCurve, "cubic-bezier(0.34, 1.56, 0.64, 1)");
});

test("F3-T1-03: SlidingPillMachine provides active scale(0.98) micro-scale feedback", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 60,
    height: 28,
  });
  assert.equal(machine.activeScale, "scale(0.98)");
});

test("F3-T1-04: SlidingPillMachine calculates slide distance and marks transitioning state", () => {
  const machine = new SlidingPillMachine({
    left: 10,
    top: 0,
    width: 50,
    height: 30,
  });
  const move = machine.slideTo(2, { left: 130, top: 0, width: 60, height: 30 });
  assert.equal(move.distancePx, 120);
  assert.equal(machine.activeIndex, 2);
  assert.equal(machine.isTransitioning, true);
});

test("F3-T1-05: SlidingPillMachine settles firmly at target coordinates after animation", () => {
  const machine = new SlidingPillMachine({
    left: 0,
    top: 0,
    width: 40,
    height: 24,
  });
  machine.slideTo(1, { left: 100, top: 0, width: 60, height: 24 });
  machine.settle();
  assert.equal(machine.isTransitioning, false);
  assert.deepEqual(machine.currentRect, {
    left: 100,
    top: 0,
    width: 60,
    height: 24,
  });
});

/* ----------------------------------------------------------------------------
 * F4: Friendly Empty & Status Copy (R1, AC1) - Tests 16 to 20
 * ------------------------------------------------------------------------- */

test("F4-T1-01: formatFriendlyStatus formats warm copy for unlogged offline state", () => {
  const status = formatFriendlyStatus("unlogged");
  assert.equal(status.text, "未登录账号（当前以本地离线模式运行）");
  assert.equal(status.actionText, "去登录");
  assert.equal(status.indicatorColor, "neutral");
});

test("F4-T1-02: formatFriendlyStatus provides actionable copy for unconfigured API key", () => {
  const status = formatFriendlyStatus("unconfigured");
  assert.equal(status.text, "未配置密钥（立即填写并测试）");
  assert.equal(status.actionText, "立即填写");
  assert.equal(status.indicatorColor, "yellow");
});

test("F4-T1-03: formatFriendlyStatus formats connected state with millisecond latency and green indicator", () => {
  const status = formatFriendlyStatus("connected", { latencyMs: 142 });
  assert.equal(status.text, "连通正常 · 142ms");
  assert.equal(status.indicatorColor, "green");
});

test("F4-T1-04: formatFriendlyStatus formats connection failure with clear retry advice", () => {
  const status = formatFriendlyStatus("failed", {
    errorDetail: "401 Unauthorized",
  });
  assert.equal(status.text, "连接异常 · 401 Unauthorized");
  assert.equal(status.actionText, "重新测试");
  assert.equal(status.indicatorColor, "red");
});

test("F4-T1-05: auditTextForMechanicalPhrases flags forbidden mechanical phrases", () => {
  const mechanical = "当前模型服务尚未接入，请有尚未测试的更改保存";
  const audit1 = auditTextForMechanicalPhrases(mechanical);
  assert.equal(audit1.compliant, false);
  assert.deepEqual(audit1.violations, ["尚未接入", "有尚未测试的更改"]);

  const warm = "未登录账号（当前以本地离线模式运行）";
  const audit2 = auditTextForMechanicalPhrases(warm);
  assert.equal(audit2.compliant, true);
  assert.deepEqual(audit2.violations, []);
});

/* ----------------------------------------------------------------------------
 * F5: 4-Quadrant Settings Architecture (R2, AC2) - Tests 21 to 25
 * ------------------------------------------------------------------------- */

test("F5-T1-01: SETTINGS_4_QUADRANTS partitions settings into exactly 4 quadrants", () => {
  assert.equal(SETTINGS_4_QUADRANTS.length, 4);
  const labels = SETTINGS_4_QUADRANTS.map((q) => q.label);
  assert.deepEqual(labels, [
    "软件系统",
    "账号与用量",
    "核心功能",
    "安全与数据",
  ]);
});

test("F5-T1-02: Quadrant 1 (软件系统) contains general, shortcuts, and updates", () => {
  const quad1 = SETTINGS_4_QUADRANTS.find((q) => q.id === "system");
  assert.ok(quad1);
  const ids = quad1.sections.map((s) => s.id);
  assert.deepEqual(ids, ["general", "shortcuts", "updates"]);
});

test("F5-T1-03: Quadrant 2 (账号与用量) contains account profile and usage plans", () => {
  const quad2 = SETTINGS_4_QUADRANTS.find((q) => q.id === "account_usage");
  assert.ok(quad2);
  const ids = quad2.sections.map((s) => s.id);
  assert.deepEqual(ids, ["account", "usage"]);
});

test("F5-T1-04: Quadrant 3 (核心功能) contains models, memory, extensions, and network", () => {
  const quad3 = SETTINGS_4_QUADRANTS.find((q) => q.id === "core_features");
  assert.ok(quad3);
  const ids = quad3.sections.map((s) => s.id);
  assert.deepEqual(ids, ["providers", "memory", "extensions", "network"]);
});

test("F5-T1-05: SettingsNavigationRouter resolves canonical quadrant and preserves legacy routes", () => {
  const router = new SettingsNavigationRouter();
  const res1 = router.navigate("updates");
  assert.equal(res1.section, "updates");
  assert.equal(res1.quadrant.label, "软件系统");

  const res2 = router.navigate("comfy");
  assert.equal(res2.section, "providers");
  assert.equal(res2.quadrant.label, "核心功能");

  const res3 = router.navigate("storage");
  assert.equal(res3.section, "storage");
  assert.equal(res3.quadrant.label, "安全与数据");
});

/* ----------------------------------------------------------------------------
 * F6: Independent Software Update Page (R2, AC2) - Tests 26 to 30
 * ------------------------------------------------------------------------- */

test("F6-T1-01: AppUpdateStateMachine starts in idle state with current version", () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  assert.equal(machine.state, "idle");
  assert.equal(machine.currentVersion, "2.1.40");
  assert.equal(machine.autoCheckUpdates, true);
});

test("F6-T1-02: AppUpdateStateMachine transitions to upToDate when server matches current version", async () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  const state = await machine.checkUpdate({
    version: "2.1.40",
    releaseDate: "2026-10-19",
    changelog: ["日常优化与修复"],
  });
  assert.equal(state, "upToDate");
  assert.equal(machine.state, "upToDate");
});

test("F6-T1-03: AppUpdateStateMachine transitions to available when newer version exists", async () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  const state = await machine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: [
      "全新的 4 象限设置架构",
      "ccswitch 5 渠道模型接入",
      "苹果级弹簧动效",
    ],
  });
  assert.equal(state, "available");
  assert.equal(machine.latestVersionInfo?.version, "2.2.0");
  assert.equal(machine.latestVersionInfo?.changelog.length, 3);
});

test("F6-T1-04: AppUpdateStateMachine tracks download progress and transitions to readyToInstall at 100%", () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  machine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: ["新版本"],
  });
  machine.startDownload();
  assert.equal(machine.state, "downloading");

  machine.setDownloadProgress(45);
  assert.equal(machine.downloadProgress, 45);
  assert.equal(machine.state, "downloading");

  machine.setDownloadProgress(100);
  assert.equal(machine.downloadProgress, 100);
  assert.equal(machine.state, "readyToInstall");
});

test("F6-T1-05: AppUpdateStateMachine installAndRestart upgrades version and resets to idle", () => {
  const machine = new AppUpdateStateMachine("2.1.40");
  machine.checkUpdate({
    version: "2.2.0",
    releaseDate: "2026-10-20",
    changelog: ["新版本"],
  });
  machine.startDownload();
  machine.setDownloadProgress(100);

  const res = machine.installAndRestart();
  assert.equal(res.success, true);
  assert.equal(res.newVersion, "2.2.0");
  assert.equal(machine.currentVersion, "2.2.0");
  assert.equal(machine.state, "idle");
});

/* ----------------------------------------------------------------------------
 * F7: Profile & Token Usage Dashboard (R2, AC2) - Tests 31 to 35
 * ------------------------------------------------------------------------- */

test("F7-T1-01: TokenUsageStore records prompt, completion, and total tokens telemetry", () => {
  const store = new TokenUsageStore();
  const record = store.recordUsage({
    provider: "deepseek",
    model: "deepseek-chat",
    promptTokens: 120,
    completionTokens: 85,
    totalTokens: 205,
    timestamp: Date.now(),
    estimatedCostUsd: 0.0004,
  });
  assert.ok(record.id);
  assert.equal(store.getRecords().length, 1);
  assert.equal(store.getRecords()[0].totalTokens, 205);
});

test("F7-T1-02: TokenUsageStore calculates 4 KPI cards accurately", () => {
  const store = new TokenUsageStore();
  const now = Date.now();
  store.recordUsage({
    provider: "openai",
    model: "gpt-4o",
    promptTokens: 500,
    completionTokens: 200,
    totalTokens: 700,
    timestamp: now,
    estimatedCostUsd: 0.005,
  });
  store.recordUsage({
    provider: "anthropic",
    model: "claude-3-5-sonnet",
    promptTokens: 300,
    completionTokens: 400,
    totalTokens: 700,
    timestamp: now,
    estimatedCostUsd: 0.006,
  });

  const kpis = store.getKpiCards(now);
  assert.equal(kpis.totalTokens, 1400);
  assert.equal(kpis.todayTokens, 1400);
  assert.equal(kpis.estimatedCostUsd, 0.011);
  assert.equal(kpis.activeModelsCount, 2);
});

test("F7-T1-03: TokenUsageStore aggregates daily summaries across requested day span", () => {
  const store = new TokenUsageStore();
  const now = Date.now();
  const summaries = store.getDailySummaries(7, now);
  assert.equal(summaries.length, 7);
  for (const s of summaries) {
    assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("F7-T1-04: TokenUsageStore calculates model breakdown percentages", () => {
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: "deepseek",
    model: "deepseek-chat",
    promptTokens: 300,
    completionTokens: 300,
    totalTokens: 600,
    timestamp: Date.now(),
    estimatedCostUsd: 0.001,
  });
  store.recordUsage({
    provider: "openai",
    model: "gpt-4o",
    promptTokens: 200,
    completionTokens: 200,
    totalTokens: 400,
    timestamp: Date.now(),
    estimatedCostUsd: 0.002,
  });

  const breakdown = store.getModelBreakdown();
  assert.equal(breakdown["deepseek-chat"].tokens, 600);
  assert.equal(breakdown["deepseek-chat"].percentage, 60.0);
  assert.equal(breakdown["gpt-4o"].tokens, 400);
  assert.equal(breakdown["gpt-4o"].percentage, 40.0);
});

test("F7-T1-05: TokenUsageStore generates compliant SVG stacked bar chart", () => {
  const store = new TokenUsageStore();
  store.recordUsage({
    provider: "siliconflow",
    model: "qwen-2.5-72b",
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
    timestamp: Date.now(),
    estimatedCostUsd: 0.002,
  });
  const svg = store.generateSvgChart(7);
  assert.match(svg, /<svg/);
  assert.match(svg, /class="kk-usage-svg"/);
  assert.match(svg, /<rect x="/);
  assert.match(svg, /fill="#21a673"/); // Prompt tokens bar
  assert.match(svg, /fill="#7fd6b2"/); // Completion tokens bar
});

/* ----------------------------------------------------------------------------
 * F8: Shortcuts Management & Collision Guard (R2, AC2) - Tests 36 to 40
 * ------------------------------------------------------------------------- */

test("F8-T1-01: ShortcutsRegistry initializes 4 standard defaults (Ctrl+K, Ctrl+N, Ctrl+,, Ctrl+Enter)", () => {
  const registry = new ShortcutsRegistry();
  const all = registry.getAll();
  const combos = all.map((s) => s.keyCombo);
  assert.ok(combos.includes("Ctrl+K"));
  assert.ok(combos.includes("Ctrl+N"));
  assert.ok(combos.includes("Ctrl+,"));
  assert.ok(combos.includes("Ctrl+Enter"));
});

test("F8-T1-02: normalizeKeyCombination orders modifiers consistently", () => {
  assert.equal(normalizeKeyCombination("Shift+Ctrl+K"), "Ctrl+Shift+K");
  assert.equal(normalizeKeyCombination("Alt+Ctrl+Enter"), "Ctrl+Alt+Enter");
  assert.equal(normalizeKeyCombination("Cmd+N"), "Ctrl+N");
  assert.equal(normalizeKeyCombination("k"), "K");
});

test("F8-T1-03: ShortcutsRegistry Barrier 1 strictly blocks system reserved combinations", () => {
  const registry = new ShortcutsRegistry();
  for (const reserved of ["Ctrl+C", "Ctrl+V", "Ctrl+Z", "F5"]) {
    const res = registry.register({
      id: "test-reserved",
      name: "非法覆盖",
      keyCombo: reserved,
      scope: "global",
    });
    assert.equal(res.success, false);
    assert.match(res.error ?? "", /操作系统或浏览器保留组合/);
  }
});

test("F8-T1-04: ShortcutsRegistry Barrier 2 prevents duplicate key collision within same scope", () => {
  const registry = new ShortcutsRegistry();
  const res = registry.register({
    id: "duplicate-search",
    name: "新搜索",
    keyCombo: "Ctrl+K",
    scope: "global",
  });
  assert.equal(res.success, false);
  assert.match(res.error ?? "", /冲突/);
});

test("F8-T1-05: ShortcutsRegistry updates existing shortcut when valid and non-colliding", () => {
  const registry = new ShortcutsRegistry();
  const res = registry.update("search", "Ctrl+Shift+F");
  assert.equal(res.success, true);
  const updated = registry.getAll().find((s) => s.id === "search");
  assert.equal(updated?.keyCombo, "Ctrl+Shift+F");
  assert.equal(updated?.isCustom, true);
});

/* ----------------------------------------------------------------------------
 * F9: ccswitch 5-Channel Model Access UI (R3, AC3) - Tests 41 to 45
 * ------------------------------------------------------------------------- */

test("F9-T1-01: CCSWITCH_5_CHANNELS enumerates the 5 major channels", () => {
  assert.equal(CCSWITCH_5_CHANNELS.length, 5);
  const ids = CCSWITCH_5_CHANNELS.map((c) => c.id);
  assert.deepEqual(ids, ["official", "relay", "oauth", "cli", "local"]);
});

test("F9-T1-02: classifyProviderPreset reclassifies SiliconFlow strictly as relay", () => {
  const siliconPreset = PROVIDER_PRESETS.find((p) => p.id === "siliconflow");
  assert.ok(siliconPreset);
  const channel = classifyProviderPreset(siliconPreset);
  assert.equal(channel, "relay", "SiliconFlow must be classified as relay");
});

test("F9-T1-03: classifyProviderPreset classifies 12ai as relay", () => {
  const channel = classifyProviderPreset({
    id: "12ai",
    label: "12ai",
    name: "12ai 聚合路由",
    category: "网关",
    protocol: "OpenAI 兼容",
    baseUrl: "https://api.12ai.org/v1",
    website: "https://12ai.org",
    keyUrl: "https://12ai.org/tokens",
    docsUrl: "https://12ai.org/docs",
  });
  assert.equal(channel, "relay");
});

test("F9-T1-04: classifyProviderPreset classifies Ollama and llama-cpp as local", () => {
  const ollamaPreset = PROVIDER_PRESETS.find((p) => p.id === "ollama");
  if (ollamaPreset) {
    assert.equal(classifyProviderPreset(ollamaPreset), "local");
  }
  const llamaCppChannel = classifyProviderPreset({
    id: "llama-cpp",
    label: "llama.cpp",
    name: "llama.cpp Server",
    category: "本地",
    protocol: "OpenAI 兼容",
    baseUrl: "http://127.0.0.1:8080/v1",
    website: "https://github.com/ggerganov/llama.cpp",
    keyUrl: "",
    docsUrl: "",
  });
  assert.equal(llamaCppChannel, "local");
});

test("F9-T1-05: classifyProviderPreset classifies DeepSeek and OpenAI as official", () => {
  const deepseekPreset = PROVIDER_PRESETS.find((p) => p.id === "deepseek");
  assert.ok(deepseekPreset);
  assert.equal(classifyProviderPreset(deepseekPreset), "official");

  const openaiPreset = PROVIDER_PRESETS.find((p) => p.id === "openai");
  if (openaiPreset) {
    assert.equal(classifyProviderPreset(openaiPreset), "official");
  }
});

/* ----------------------------------------------------------------------------
 * F10: Provider Presets, Key & Sub-3s Probe (R3, AC3) - Tests 46 to 50
 * ------------------------------------------------------------------------- */

test("F10-T1-01: executeLatencyProbe measures millisecond latency with performance.now()", async () => {
  const probe = await executeLatencyProbe(
    "https://api.deepseek.com",
    "sk-valid-key",
    80,
    200,
  );
  assert.equal(probe.success, true);
  assert.ok(probe.latencyMs >= 50, `Latency was ${probe.latencyMs}ms`);
  assert.equal(probe.httpStatus, 200);
});

test("F10-T1-02: executeLatencyProbe marks <300ms as excellent (green indicator)", async () => {
  const probe = await executeLatencyProbe(
    "https://api.siliconflow.cn/v1",
    "sk-key",
    120,
    200,
  );
  assert.equal(probe.success, true);
  assert.equal(probe.rating, "excellent");
});

test("F10-T1-03: executeLatencyProbe enforces sub-3s timeout boundary and fails if >3000ms", async () => {
  const probe = await executeLatencyProbe(
    "https://slow-api.example.com",
    "sk-key",
    3500,
    200,
  );
  assert.equal(probe.success, false);
  assert.equal(probe.httpStatus, 408);
  assert.match(probe.errorMessage ?? "", /超过 3 秒/);
});

test("F10-T1-04: ModelCatalogManager manages model enablement and persistence", () => {
  const manager = new ModelCatalogManager();
  manager.addOrUpdate({
    id: "deepseek-chat",
    name: "DeepSeek V3",
    capability: "chat",
    enabled: true,
  });
  manager.addOrUpdate({
    id: "deepseek-reasoner",
    name: "DeepSeek R1",
    capability: "reasoning",
    enabled: false,
  });

  assert.equal(manager.getModels().length, 2);
  assert.equal(manager.getEnabledModels("chat").length, 1);

  manager.toggleEnabled("deepseek-reasoner", true);
  assert.equal(manager.getEnabledModels("chat").length, 2);
});

test("F10-T1-05: ModelCatalogManager sets single default model per capability", () => {
  const manager = new ModelCatalogManager();
  manager.addOrUpdate({
    id: "gpt-4o",
    name: "GPT-4o",
    capability: "chat",
    enabled: true,
  });
  manager.addOrUpdate({
    id: "claude-3-5",
    name: "Claude 3.5 Sonnet",
    capability: "chat",
    enabled: true,
  });

  manager.setDefault("gpt-4o", "chat");
  assert.equal(manager.getDefaultModel("chat")?.id, "gpt-4o");

  manager.setDefault("claude-3-5", "chat");
  assert.equal(manager.getDefaultModel("chat")?.id, "claude-3-5");
  assert.equal(
    manager.getModels().find((m) => m.id === "gpt-4o")?.isDefault,
    false,
  );
});

/* ----------------------------------------------------------------------------
 * F11: Unified Capability Aggregation (R4, AC3) - Tests 51 to 55
 * ------------------------------------------------------------------------- */

test("F11-T1-01: aggregates catalog models by capability (chat/reasoning vs image)", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "chat-1",
    name: "Chat Model 1",
    capability: "chat",
    enabled: true,
  });
  catalog.addOrUpdate({
    id: "reason-1",
    name: "Reasoner 1",
    capability: "reasoning",
    enabled: true,
  });
  catalog.addOrUpdate({
    id: "flux-1",
    name: "Flux Schnell",
    capability: "image",
    enabled: true,
  });

  const chatModels = catalog.getEnabledModels("chat");
  const imageModels = catalog.getEnabledModels("image");

  assert.equal(chatModels.length, 2);
  assert.equal(imageModels.length, 1);
});

test("F11-T1-02: UnifiedCapabilityScheduler auto-routes to healthiest provider", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "deepseek-chat",
    name: "DeepSeek V3",
    capability: "chat",
    enabled: true,
    isDefault: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "slow-official",
    channel: "official",
    latencyMs: 800,
    successRate: 0.9,
    isOnline: true,
  });
  scheduler.registerProvider({
    providerId: "fast-relay",
    channel: "relay",
    latencyMs: 95,
    successRate: 0.99,
    isOnline: true,
  });

  const route = scheduler.routeRequest("chat", "auto");
  assert.equal(route.isAutoRouted, true);
  assert.equal(route.dispatchedProvider, "fast-relay");
  assert.equal(route.channel, "relay");
  assert.equal(route.selectedModel, "deepseek-chat");
});

test("F11-T1-03: UnifiedCapabilityScheduler falls back if primary provider is offline", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "qwen-2.5",
    name: "Qwen 2.5",
    capability: "chat",
    enabled: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  scheduler.registerProvider({
    providerId: "dead-provider",
    channel: "relay",
    latencyMs: 50,
    successRate: 1.0,
    isOnline: false, // Offline!
  });
  scheduler.registerProvider({
    providerId: "alive-provider",
    channel: "official",
    latencyMs: 180,
    successRate: 0.98,
    isOnline: true,
  });

  const route = scheduler.routeRequest("chat", "auto");
  assert.equal(route.dispatchedProvider, "alive-provider");
  assert.equal(route.channel, "official");
});

test("F11-T1-04: UnifiedCapabilityScheduler dispatches specified model ID when requested", () => {
  const catalog = new ModelCatalogManager();
  catalog.addOrUpdate({
    id: "dall-e-3",
    name: "DALL-E 3",
    capability: "image",
    enabled: true,
  });
  catalog.addOrUpdate({
    id: "flux-pro",
    name: "Flux 1.1 Pro",
    capability: "image",
    enabled: true,
  });

  const scheduler = new UnifiedCapabilityScheduler(catalog);
  const route = scheduler.routeRequest("image", "flux-pro");
  assert.equal(route.selectedModel, "flux-pro");
  assert.equal(route.isAutoRouted, false);
});

test("F11-T1-05: UnifiedCapabilityScheduler throws clear error when 0 models are enabled", () => {
  const catalog = new ModelCatalogManager();
  const scheduler = new UnifiedCapabilityScheduler(catalog);

  assert.throws(
    () => scheduler.routeRequest("chat", "auto"),
    /当前没有可用的「对话\/推理」模型，请先在模型接入中启用/,
  );
});

/* ----------------------------------------------------------------------------
 * F12: Anti-Regression & UI Token Lint Gate (R5, AC4) - Tests 56 to 60
 * ------------------------------------------------------------------------- */

test("F12-T1-01: linter flags border-radius: 999px on button elements", () => {
  const badCss = `.kk-button { border-radius: 999px; }`;
  const violations = lintUiSourceCode(badCss, "bad.css");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "no_999px_control");
});

test("F12-T1-02: linter flags raw <details> disclosure triangles", () => {
  const badTsx = `return <details className="settings-disclosure"><summary>Click</summary></details>;`;
  const violations = lintUiSourceCode(badTsx, "BadPanel.tsx");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "no_disclosure_triangle");
});

test("F12-T1-03: linter flags inline style with hardcoded 999px borderRadius", () => {
  const badInline = `<div style={{ borderRadius: "999px" }} className="custom-box" />`;
  const violations = lintUiSourceCode(badInline, "Box.tsx");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "no_inline_radius");
});

test("F12-T1-04: linter approves compliant 8px control and 16-20px card definitions", () => {
  const goodCss = `
    .kk-control { border-radius: var(--kk-radius-control); }
    .kk-card { border-radius: var(--kk-radius-card); }
  `;
  const violations = lintUiSourceCode(goodCss, "good.css");
  assert.equal(violations.length, 0);
});

test("F12-T1-05: linter produces accurate line numbers and informative messages", () => {
  const sample = `line1\nline2\n.settings-action { border-radius: 999px; }`;
  const violations = lintUiSourceCode(sample, "sample.css");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].lineNumber, 3);
  assert.match(violations[0].message, /基础控件必须固定为 8px/);
});
