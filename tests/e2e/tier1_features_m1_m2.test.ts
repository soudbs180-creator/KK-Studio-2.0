import assert from "node:assert/strict";
import test from "node:test";
import {
  FIGMA_SURFACE_TOKENS,
  calculateContrastRatio,
  validateFigmaSurfaceTokens,
  validateButtonProps,
  validateInputProps,
  validateSelectProps,
  validateBadgeProps,
  validateModalProps,
  OFFICIAL_LUCIDE_ICONS_124,
  resolveUiIcon,
  FIGMA_ASPECT_RATIOS_15,
  parseAspectRatio,
  calculateDimensionsForRatio,
  classifyViewport,
  check4pxGridRhythm,
  evaluateElementAesthetics,
  GatewayCooldownScheduler,
  DualStickinessManager,
  ExtensionRuntimeBridge,
} from "./harness.ts";

/* =========================================================================
 * Tier 1: Feature Coverage (Features 1 - 9 / Milestones 1 & 2)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 1: Figma Surface & Token Parity
// -------------------------------------------------------------------------
test("F01-T1-01: surface background token matches Figma #f2f2f2", () => {
  assert.equal(FIGMA_SURFACE_TOKENS.bgSurface, "#f2f2f2");
  assert.equal(FIGMA_SURFACE_TOKENS.darkButtonHover, "#f2f2f2");
});

test("F01-T1-02: neutral focus rings provide light and dark contrast tokens", () => {
  assert.equal(FIGMA_SURFACE_TOKENS.focusRingNeutralLight, "#dbdbdb");
  assert.equal(FIGMA_SURFACE_TOKENS.focusRingNeutralDark, "#252525");
});

test("F01-T1-03: all 5 paired data tag tokens define text and background colors", () => {
  const tags = [
    FIGMA_SURFACE_TOKENS.dataTagBlue,
    FIGMA_SURFACE_TOKENS.dataTagGreen,
    FIGMA_SURFACE_TOKENS.dataTagAmber,
    FIGMA_SURFACE_TOKENS.dataTagPurple,
    FIGMA_SURFACE_TOKENS.dataTagCrimson,
  ];
  for (const tag of tags) {
    assert.ok(tag.text.startsWith("#"), "Tag text must be valid hex");
    assert.ok(tag.bg.startsWith("#"), "Tag bg must be valid hex");
  }
});

test("F01-T1-04: contrast ratio between text and surface tokens exceeds WCAG AA", () => {
  const ratio = calculateContrastRatio(
    "#111827",
    FIGMA_SURFACE_TOKENS.bgSurface,
  );
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio} must be >= 4.5:1`);
});

test("F01-T1-05: validateFigmaSurfaceTokens detects compliant CSS variables", () => {
  const css = `
    :root {
      --kk-bg-surface: #f2f2f2;
      --kk-focus-ring-neutral: #252525;
      --kk-tag-blue: #1d4ed8;
      --kk-tag-green: #15803d;
      --kk-tag-amber: #b45309;
    }
  `;
  const res = validateFigmaSurfaceTokens(css);
  assert.equal(res.valid, true);
  assert.equal(res.missing.length, 0);
});

// -------------------------------------------------------------------------
// Feature 2: Foundational UI Primitive Layer
// -------------------------------------------------------------------------
test("F02-T1-01: Button supports all 5 standard Figma height tiers", () => {
  const tiers = ["44px", "40px", "32px", "24px", "16px"] as const;
  for (const tier of tiers) {
    const res = validateButtonProps({ heightTier: tier });
    assert.equal(res.valid, true);
    assert.equal(res.heightPx, parseInt(tier, 10));
  }
});

test("F02-T1-02: Button decouples hit box to minimum 44px for accessibility", () => {
  const res16 = validateButtonProps({ heightTier: "16px" });
  assert.equal(res16.hitBoxPx, 44);
  const res24 = validateButtonProps({ heightTier: "24px" });
  assert.equal(res24.hitBoxPx, 44);
});

test("F02-T1-03: Input primitive validates string value and disabled state", () => {
  const res = validateInputProps({
    value: "test query",
    placeholder: "Search...",
  });
  assert.equal(res.valid, true);
});

test("F02-T1-04: Select primitive verifies options and selected value", () => {
  const res = validateSelectProps({
    options: ["opt1", "opt2"],
    selected: "opt1",
  });
  assert.equal(res.valid, true);
});

test("F02-T1-05: Badge and Modal primitives validate required parameters", () => {
  const badgeRes = validateBadgeProps({ variant: "success", label: "Active" });
  assert.equal(badgeRes.valid, true);
  const modalRes = validateModalProps({ open: true, title: "Confirm Action" });
  assert.equal(modalRes.valid, true);
});

// -------------------------------------------------------------------------
// Feature 3: 124 Atomic Lucide Iconography
// -------------------------------------------------------------------------
test("F03-T1-01: OFFICIAL_LUCIDE_ICONS_124 contains exactly 124 official icons", () => {
  assert.equal(OFFICIAL_LUCIDE_ICONS_124.length, 124);
  const unique = new Set(OFFICIAL_LUCIDE_ICONS_124);
  assert.equal(unique.size, 124, "All 124 icons must be distinct");
});

test("F03-T1-02: resolveUiIcon resolves existing icon with requested size", () => {
  const res = resolveUiIcon("camera", 24);
  assert.equal(res.resolved, true);
  assert.equal(res.iconName, "camera");
  assert.equal(res.size, 24);
});

test("F03-T1-03: resolveUiIcon resolves essential media icons: play, pause, film", () => {
  assert.equal(resolveUiIcon("play").resolved, true);
  assert.equal(resolveUiIcon("pause").resolved, true);
  assert.equal(resolveUiIcon("film").resolved, true);
});

test("F03-T1-04: resolveUiIcon resolves essential canvas icons: layers, grid, move", () => {
  assert.equal(resolveUiIcon("layers").resolved, true);
  assert.equal(resolveUiIcon("grid").resolved, true);
  assert.equal(resolveUiIcon("move").resolved, true);
});

test("F03-T1-05: resolveUiIcon falls back gracefully to help-circle for unrecognized icon", () => {
  const res = resolveUiIcon("non_existent_custom_icon_999");
  assert.equal(res.resolved, false);
  assert.equal(res.iconName, "help-circle");
});

// -------------------------------------------------------------------------
// Feature 4: 15 Standardized Aspect Ratios
// -------------------------------------------------------------------------
test("F04-T1-01: FIGMA_ASPECT_RATIOS_15 contains all 15 official aspect ratios", () => {
  assert.equal(FIGMA_ASPECT_RATIOS_15.length, 15);
  assert.ok(FIGMA_ASPECT_RATIOS_15.includes("自适应"));
  assert.ok(FIGMA_ASPECT_RATIOS_15.includes("16:9"));
  assert.ok(FIGMA_ASPECT_RATIOS_15.includes("9:16"));
  assert.ok(FIGMA_ASPECT_RATIOS_15.includes("1:8"));
  assert.ok(FIGMA_ASPECT_RATIOS_15.includes("8:1"));
});

test("F04-T1-02: parseAspectRatio parses adaptive ratio correctly", () => {
  const res = parseAspectRatio("自适应");
  assert.equal(res.ratio, null);
  assert.equal(res.orientation, "adaptive");
});

test("F04-T1-03: parseAspectRatio classifies landscape vs portrait orientations", () => {
  const landscape = parseAspectRatio("16:9");
  assert.equal(landscape.orientation, "landscape");
  assert.ok(landscape.ratio! > 1);

  const portrait = parseAspectRatio("9:16");
  assert.equal(portrait.orientation, "portrait");
  assert.ok(portrait.ratio! < 1);

  const square = parseAspectRatio("1:1");
  assert.equal(square.orientation, "square");
  assert.equal(square.ratio, 1);
});

test("F04-T1-04: calculateDimensionsForRatio computes landscape pixel dimensions", () => {
  const dims = calculateDimensionsForRatio("16:9", 1920);
  assert.equal(dims.width, 1920);
  assert.equal(dims.height, 1080);
});

test("F04-T1-05: calculateDimensionsForRatio computes extreme ratios 1:8 and 8:1", () => {
  const extremeP = calculateDimensionsForRatio("1:8", 1024);
  assert.equal(extremeP.height, 1024);
  assert.equal(extremeP.width, 128);

  const extremeL = calculateDimensionsForRatio("8:1", 1024);
  assert.equal(extremeL.width, 1024);
  assert.equal(extremeL.height, 128);
});

// -------------------------------------------------------------------------
// Feature 5: Mobile Chat-Only Viewport Parity
// -------------------------------------------------------------------------
test("F05-T1-01: viewport width <= 767px is classified as mobile", () => {
  const vp375 = classifyViewport(375);
  assert.equal(vp375.isMobile, true);
  assert.equal(vp375.isDesktop, false);

  const vp767 = classifyViewport(767);
  assert.equal(vp767.isMobile, true);
});

test("F05-T1-02: viewport width >= 768px is classified as desktop", () => {
  const vp768 = classifyViewport(768);
  assert.equal(vp768.isMobile, false);
  assert.equal(vp768.isDesktop, true);

  const vp1920 = classifyViewport(1920);
  assert.equal(vp1920.isDesktop, true);
});

test("F05-T1-03: mobile viewport enforces single-column chat layout", () => {
  const vp = classifyViewport(390);
  assert.equal(vp.layout, "single-column-chat");
});

test("F05-T1-04: mobile viewport strictly disallows canvas", () => {
  const vp = classifyViewport(414);
  assert.equal(vp.allowCanvas, false);
});

test("F05-T1-05: desktop viewport permits canvas and uses workbench layout", () => {
  const vp = classifyViewport(1440);
  assert.equal(vp.allowCanvas, true);
  assert.equal(vp.layout, "desktop-canvas-workbench");
});

// -------------------------------------------------------------------------
// Feature 6: Automated Aesthetic Governance (Unslop 9-Pass Redline)
// -------------------------------------------------------------------------
test("F06-T1-01: check4pxGridRhythm accepts multiples of 4px", () => {
  assert.equal(check4pxGridRhythm(0), true);
  assert.equal(check4pxGridRhythm(4), true);
  assert.equal(check4pxGridRhythm(8), true);
  assert.equal(check4pxGridRhythm(16), true);
  assert.equal(check4pxGridRhythm(24), true);
});

test("F06-T1-02: check4pxGridRhythm rejects non-multiples of 4px", () => {
  assert.equal(check4pxGridRhythm(3), false);
  assert.equal(check4pxGridRhythm(7), false);
  assert.equal(check4pxGridRhythm(13), false);
});

test("F06-T1-03: evaluateElementAesthetics passes fully compliant styles", () => {
  const res = evaluateElementAesthetics({
    paddingPx: 16,
    marginPx: 8,
    contrastRatio: 6.2,
    borderRadiusPx: 8,
  });
  assert.equal(res.pass, true);
  assert.equal(res.violations.length, 0);
});

test("F06-T1-04: evaluateElementAesthetics catches padding violating 4px grid", () => {
  const res = evaluateElementAesthetics({ paddingPx: 11 });
  assert.equal(res.pass, false);
  assert.ok(
    res.violations.some((v) =>
      v.includes("Padding 11px violates 4px grid rhythm"),
    ),
  );
});

test("F06-T1-05: evaluateElementAesthetics catches low contrast below WCAG AA", () => {
  const res = evaluateElementAesthetics({ contrastRatio: 3.1 });
  assert.equal(res.pass, false);
  assert.ok(res.violations.some((v) => v.includes("below WCAG AA")));
});

// -------------------------------------------------------------------------
// Feature 7: Provider Gateway Cooldown Queue (WaitingCandidate)
// -------------------------------------------------------------------------
test("F07-T1-01: GatewayCooldownScheduler registers accounts and selects active account", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-1");
  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, "acc-1");
  assert.equal(plan.waitingQueue.length, 0);
});

test("F07-T1-02: reporting rate limit puts account into cooldown and returns next account", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-1");
  scheduler.registerAccount("acc-2");

  scheduler.reportRateLimit("acc-1", 10); // 10s cooldown
  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, "acc-2");
  assert.equal(plan.waitingQueue.length, 1);
  assert.equal(plan.waitingQueue[0].accountId, "acc-1");
  assert.ok(plan.waitingQueue[0].availableAfterMs > 0);
});

test("F07-T1-03: multiple cooling accounts are sorted ascending by availableAfterMs", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-slow");
  scheduler.registerAccount("acc-fast");

  scheduler.reportRateLimit("acc-slow", 30);
  scheduler.reportRateLimit("acc-fast", 5);

  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, null);
  assert.equal(plan.waitingQueue[0].accountId, "acc-fast");
  assert.equal(plan.waitingQueue[1].accountId, "acc-slow");
  assert.ok(
    plan.waitingQueue[0].availableAfterMs <
      plan.waitingQueue[1].availableAfterMs,
  );
});

test("F07-T1-04: cooling duration matches shortest remaining wait when all accounts cool", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-only");
  scheduler.reportRateLimit("acc-only", 15);

  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, null);
  assert.ok(plan.coolingDurationMs! > 0 && plan.coolingDurationMs! <= 15000);
});

test("F07-T1-05: account automatically becomes available after cooldown expiration", async () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-quick");
  scheduler.reportRateLimit("acc-quick", 0.05); // 50ms cooldown

  await new Promise((r) => setTimeout(r, 60));
  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, "acc-quick");
  assert.equal(plan.waitingQueue.length, 0);
});

// -------------------------------------------------------------------------
// Feature 8: Dual-Stickiness TTL
// -------------------------------------------------------------------------
test("F08-T1-01: DualStickinessManager resolves null when no stickiness recorded", () => {
  const manager = new DualStickinessManager();
  const res = manager.resolveAccount("session-1");
  assert.equal(res.accountId, null);
  assert.equal(res.stickinessType, null);
});

test("F08-T1-02: prompt cache affinity stickiness routes to primary account", () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("session-cache", "acc-primary", 10_000);
  const res = manager.resolveAccount("session-cache");
  assert.equal(res.accountId, "acc-primary");
  assert.equal(res.stickinessType, "cache");
});

test("F08-T1-03: temporary fallback affinity stickiness takes precedence over cache", () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("session-both", "acc-primary", 10_000);
  manager.setFallbackAffinity("session-both", "acc-fallback", 5_000);

  const res = manager.resolveAccount("session-both");
  assert.equal(res.accountId, "acc-fallback");
  assert.equal(res.stickinessType, "fallback");
});

test("F08-T1-04: fallback affinity expires and falls back to cache affinity", async () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("session-revert", "acc-primary", 10_000);
  manager.setFallbackAffinity("session-revert", "acc-fallback", 40); // 40ms TTL

  await new Promise((r) => setTimeout(r, 55));
  const res = manager.resolveAccount("session-revert");
  assert.equal(res.accountId, "acc-primary");
  assert.equal(res.stickinessType, "cache");
});

test("F08-T1-05: both stickiness TTLs expire returning session to dynamic routing", async () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("session-exp", "acc-primary", 40);
  manager.setFallbackAffinity("session-exp", "acc-fallback", 40);

  await new Promise((r) => setTimeout(r, 55));
  const res = manager.resolveAccount("session-exp");
  assert.equal(res.accountId, null);
  assert.equal(res.stickinessType, null);
});

// -------------------------------------------------------------------------
// Feature 9: Extension Runtime Bridge (window.kkStudio)
// -------------------------------------------------------------------------
test("F09-T1-01: ExtensionRuntimeBridge registers compliant extension manifest", () => {
  const bridge = new ExtensionRuntimeBridge();
  const registered = bridge.registerExtension({
    id: "ext-image-enhancer",
    name: "AI Image Enhancer",
    version: "1.0.0",
    entryPoint: "index.js",
  });
  assert.equal(registered, true);
});

test("F09-T1-02: registered extension mounts into UI slot and renders item", () => {
  const bridge = new ExtensionRuntimeBridge();
  bridge.registerExtension({
    id: "ext-toolbar-button",
    name: "Toolbar Ext",
    version: "1.0.0",
    entryPoint: "toolbar.js",
  });

  bridge.registerSlot(
    "canvas-toolbar",
    "ext-toolbar-button",
    () => "<button>Custom Ext</button>",
  );
  const items = bridge.getSlotItems("canvas-toolbar");
  assert.equal(items.length, 1);
  assert.equal(items[0], "<button>Custom Ext</button>");
});

test("F09-T1-03: multiple extensions can contribute to the same UI slot", () => {
  const bridge = new ExtensionRuntimeBridge();
  bridge.registerExtension({
    id: "ext-1",
    name: "Ext 1",
    version: "1.0.0",
    entryPoint: "1.js",
  });
  bridge.registerExtension({
    id: "ext-2",
    name: "Ext 2",
    version: "1.0.0",
    entryPoint: "2.js",
  });

  bridge.registerSlot("composer-actions", "ext-1", () => "Action 1");
  bridge.registerSlot("composer-actions", "ext-2", () => "Action 2");

  const items = bridge.getSlotItems("composer-actions");
  assert.equal(items.length, 2);
  assert.deepEqual(items, ["Action 1", "Action 2"]);
});

test("F09-T1-04: unloading extension invokes its lifecycle cleanup callback", () => {
  const bridge = new ExtensionRuntimeBridge();
  let cleanedUp = false;
  bridge.registerExtension(
    {
      id: "ext-clean",
      name: "Clean Ext",
      version: "1.0.0",
      entryPoint: "clean.js",
    },
    () => {
      cleanedUp = true;
    },
  );

  bridge.unloadExtension("ext-clean");
  assert.equal(cleanedUp, true);
});

test("F09-T1-05: unloading extension automatically removes its mounted slot items", () => {
  const bridge = new ExtensionRuntimeBridge();
  bridge.registerExtension({
    id: "ext-remove",
    name: "Remove Ext",
    version: "1.0.0",
    entryPoint: "rem.js",
  });
  bridge.registerSlot("sidebar-panels", "ext-remove", () => "Sidebar Panel");

  assert.equal(bridge.getSlotItems("sidebar-panels").length, 1);
  bridge.unloadExtension("ext-remove");
  assert.equal(bridge.getSlotItems("sidebar-panels").length, 0);
});
