import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateContrastRatio,
  validateFigmaSurfaceTokens,
  validateButtonProps,
  validateInputProps,
  validateSelectProps,
  validateBadgeProps,
  validateModalProps,
  resolveUiIcon,
  parseAspectRatio,
  calculateDimensionsForRatio,
  classifyViewport,
  check4pxGridRhythm,
  evaluateElementAesthetics,
  GatewayCooldownScheduler,
  DualStickinessManager,
  ExtensionRuntimeBridge,
  type ButtonHeightTier,
} from "./harness.ts";

/* =========================================================================
 * Tier 2: Boundary & Corner Cases (Features 1 - 9 / Milestones 1 & 2)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 1: Figma Surface & Token Parity
// -------------------------------------------------------------------------
test("F01-T2-01: validateFigmaSurfaceTokens detects empty CSS stylesheet as invalid", () => {
  const res = validateFigmaSurfaceTokens("");
  assert.equal(res.valid, false);
  assert.equal(res.missing.length, 5);
});

test("F01-T2-02: validateFigmaSurfaceTokens pinpoints specifically missing tokens", () => {
  const partialCss = ":root { --kk-bg-surface: #f2f2f2; }";
  const res = validateFigmaSurfaceTokens(partialCss);
  assert.equal(res.valid, false);
  assert.ok(!res.missing.includes("--kk-bg-surface"));
  assert.ok(res.missing.includes("--kk-focus-ring-neutral"));
});

test("F01-T2-03: contrast ratio between identical colors is exactly 1.0", () => {
  const ratio = calculateContrastRatio("#f2f2f2", "#f2f2f2");
  assert.equal(ratio, 1);
});

test("F01-T2-04: contrast ratio between black and white reaches maximum 21.0", () => {
  const ratio = calculateContrastRatio("#000000", "#ffffff");
  assert.equal(ratio, 21);
});

test("F01-T2-05: 3-character short hex codes compute valid contrast ratios", () => {
  const ratio = calculateContrastRatio("#000", "#fff");
  assert.equal(ratio, 21);
});

// -------------------------------------------------------------------------
// Feature 2: Foundational UI Primitive Layer
// -------------------------------------------------------------------------
test("F02-T2-01: Button rejects non-standard height tier", () => {
  const res = validateButtonProps({
    heightTier: "50px" as unknown as ButtonHeightTier,
  });
  assert.equal(res.valid, false);
  assert.equal(res.heightPx, 0);
});

test("F02-T2-02: Input rejects non-string values gracefully", () => {
  const res = validateInputProps({ value: null as unknown as string });
  assert.equal(res.valid, false);
  assert.ok(res.reason?.includes("must be a string"));
});

test("F02-T2-03: Select rejects selected value not present in options list", () => {
  const res = validateSelectProps({
    options: ["option-a", "option-b"],
    selected: "option-c",
  });
  assert.equal(res.valid, false);
  assert.ok(res.reason?.includes("Selected value must be in options"));
});

test("F02-T2-04: Badge rejects empty or whitespace-only label", () => {
  const res = validateBadgeProps({ variant: "default", label: "   " });
  assert.equal(res.valid, false);
  assert.ok(res.reason?.includes("must not be empty"));
});

test("F02-T2-05: Modal rejects non-boolean open property or empty title", () => {
  const res1 = validateModalProps({
    open: "true" as unknown as boolean,
    title: "Title",
  });
  assert.equal(res1.valid, false);

  const res2 = validateModalProps({ open: true, title: "" });
  assert.equal(res2.valid, false);
});

// -------------------------------------------------------------------------
// Feature 3: 124 Atomic Lucide Iconography
// -------------------------------------------------------------------------
test("F03-T2-01: empty icon name string falls back to help-circle", () => {
  const res = resolveUiIcon("");
  assert.equal(res.resolved, false);
  assert.equal(res.iconName, "help-circle");
});

test("F03-T2-02: icon name with uppercase or whitespace fails resolution gracefully", () => {
  const res = resolveUiIcon(" Camera ");
  assert.equal(res.resolved, false);
  assert.equal(res.iconName, "help-circle");
});

test("F03-T2-03: icon request with size=0 or negative size defaults gracefully", () => {
  const res = resolveUiIcon("play", 0);
  assert.equal(res.resolved, true);
  assert.equal(res.size, 0);
});

test("F03-T2-04: ultra-large icon size (512px) is preserved without distortion", () => {
  const res = resolveUiIcon("camera", 512);
  assert.equal(res.resolved, true);
  assert.equal(res.size, 512);
});

test("F03-T2-05: special meta-characters in icon query do not cause regex crash", () => {
  const res = resolveUiIcon(".*+?^${}()|[]\\");
  assert.equal(res.resolved, false);
  assert.equal(res.iconName, "help-circle");
});

// -------------------------------------------------------------------------
// Feature 4: 15 Standardized Aspect Ratios
// -------------------------------------------------------------------------
test("F04-T2-01: invalid format aspect ratio string throws explicit error", () => {
  assert.throws(
    () => parseAspectRatio("invalid_ratio"),
    /Invalid aspect ratio string/,
  );
  assert.throws(() => parseAspectRatio("16/9"), /Invalid aspect ratio string/);
});

test("F04-T2-02: zero in aspect ratio component throws error", () => {
  assert.throws(() => parseAspectRatio("0:1"), /Invalid aspect ratio string/);
  assert.throws(() => parseAspectRatio("16:0"), /Invalid aspect ratio string/);
});

test("F04-T2-03: negative numbers in aspect ratio throw error", () => {
  assert.throws(() => parseAspectRatio("-16:9"), /Invalid aspect ratio string/);
  assert.throws(() => parseAspectRatio("16:-9"), /Invalid aspect ratio string/);
});

test("F04-T2-04: calculateDimensionsForRatio with targetLongEdge=1 produces minimal 1px dimensions", () => {
  const dims = calculateDimensionsForRatio("1:1", 1);
  assert.equal(dims.width, 1);
  assert.equal(dims.height, 1);
});

test("F04-T2-05: calculateDimensionsForRatio handles extreme aspect ratio (21:9) without NaN", () => {
  const dims = calculateDimensionsForRatio("21:9", 2560);
  assert.equal(dims.width, 2560);
  assert.equal(dims.height, 1097);
  assert.ok(!isNaN(dims.height));
});

// -------------------------------------------------------------------------
// Feature 5: Mobile Chat-Only Viewport Parity
// -------------------------------------------------------------------------
test("F05-T2-01: exact threshold 767px is mobile and 768px is desktop", () => {
  const mobileEdge = classifyViewport(767);
  assert.equal(mobileEdge.isMobile, true);
  assert.equal(mobileEdge.allowCanvas, false);

  const desktopEdge = classifyViewport(768);
  assert.equal(desktopEdge.isDesktop, true);
  assert.equal(desktopEdge.allowCanvas, true);
});

test("F05-T2-02: zero pixel viewport width is handled safely as mobile", () => {
  const vp = classifyViewport(0);
  assert.equal(vp.isMobile, true);
  assert.equal(vp.layout, "single-column-chat");
});

test("F05-T2-03: negative viewport width throws explicit error", () => {
  assert.throws(() => classifyViewport(-10), /cannot be negative/);
});

test("F05-T2-04: extreme ultra-wide display (7680px 8K) classifies cleanly as desktop", () => {
  const vp = classifyViewport(7680);
  assert.equal(vp.isDesktop, true);
  assert.equal(vp.allowCanvas, true);
  assert.equal(vp.layout, "desktop-canvas-workbench");
});

test("F05-T2-05: viewport state is immutable and stateless across consecutive queries", () => {
  const m1 = classifyViewport(360);
  const d1 = classifyViewport(1280);
  const m2 = classifyViewport(400);

  assert.equal(m1.isMobile, true);
  assert.equal(d1.isDesktop, true);
  assert.equal(m2.isMobile, true);
});

// -------------------------------------------------------------------------
// Feature 6: Automated Aesthetic Governance (Unslop 9-Pass Redline)
// -------------------------------------------------------------------------
test("F06-T2-01: negative spacing values pass rhythm if divisible by 4", () => {
  assert.equal(check4pxGridRhythm(-8), true);
  assert.equal(check4pxGridRhythm(-5), false);
});

test("F06-T2-02: floating point non-integers fail 4px rhythm check", () => {
  assert.equal(check4pxGridRhythm(4.5), false);
  assert.equal(check4pxGridRhythm(15.9), false);
});

test("F06-T2-03: border radius > 999px (extreme pill hack) is flagged as redline violation", () => {
  const res = evaluateElementAesthetics({ borderRadiusPx: 1000 });
  assert.equal(res.pass, false);
  assert.ok(
    res.violations.some((v) => v.includes("violates aesthetic redline")),
  );
});

test("F06-T2-04: exact boundary contrast ratio 4.5:1 passes WCAG AA check", () => {
  const res = evaluateElementAesthetics({ contrastRatio: 4.5 });
  assert.equal(res.pass, true);
});

test("F06-T2-05: contrast ratio 4.49:1 fails WCAG AA check", () => {
  const res = evaluateElementAesthetics({ contrastRatio: 4.49 });
  assert.equal(res.pass, false);
});

// -------------------------------------------------------------------------
// Feature 7: Provider Gateway Cooldown Queue (WaitingCandidate)
// -------------------------------------------------------------------------
test("F07-T2-01: reporting rate limit on non-registered account throws error", () => {
  const scheduler = new GatewayCooldownScheduler();
  assert.throws(
    () => scheduler.reportRateLimit("unknown-acc", 10),
    /Unknown account/,
  );
});

test("F07-T2-02: acquireCandidate on empty scheduler returns null without error", () => {
  const scheduler = new GatewayCooldownScheduler();
  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, null);
  assert.equal(plan.waitingQueue.length, 0);
});

test("F07-T2-03: zero cooldown duration returns account immediately", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-instant");
  scheduler.reportRateLimit("acc-instant", 0);

  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, "acc-instant");
});

test("F07-T2-04: repeating rate limit on already cooling account updates cooldown", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("acc-repeat");
  scheduler.reportRateLimit("acc-repeat", 5);
  scheduler.reportRateLimit("acc-repeat", 20); // extend

  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, null);
  assert.ok(plan.waitingQueue[0].availableAfterMs > 10000);
});

test("F07-T2-05: massive queue of 100 accounts is sorted stably", () => {
  const scheduler = new GatewayCooldownScheduler();
  for (let i = 0; i < 50; i++) {
    scheduler.registerAccount(`acc-${i}`);
    scheduler.reportRateLimit(`acc-${i}`, (i + 1) * 2);
  }

  const plan = scheduler.acquireCandidate();
  assert.equal(plan.waitingQueue.length, 50);
  assert.equal(plan.waitingQueue[0].accountId, "acc-0");
  assert.equal(plan.waitingQueue[49].accountId, "acc-49");
});

// -------------------------------------------------------------------------
// Feature 8: Dual-Stickiness TTL
// -------------------------------------------------------------------------
test("F08-T2-01: resolving non-existent session returns null stickiness", () => {
  const manager = new DualStickinessManager();
  const res = manager.resolveAccount("ghost-session");
  assert.equal(res.accountId, null);
  assert.equal(res.stickinessType, null);
});

test("F08-T2-02: zero TTL stickiness expires immediately", () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("session-zero", "acc-1", 0);
  const res = manager.resolveAccount("session-zero");
  assert.equal(res.accountId, null);
});

test("F08-T2-03: overwrite existing cache affinity updates destination account", () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("s1", "acc-old", 10_000);
  manager.setCacheAffinity("s1", "acc-new", 10_000);

  const res = manager.resolveAccount("s1");
  assert.equal(res.accountId, "acc-new");
});

test("F08-T2-04: fallback stickiness overwrite updates failover account", () => {
  const manager = new DualStickinessManager();
  manager.setFallbackAffinity("s2", "fb-1", 10_000);
  manager.setFallbackAffinity("s2", "fb-2", 10_000);

  const res = manager.resolveAccount("s2");
  assert.equal(res.accountId, "fb-2");
});

test("F08-T2-05: concurrent independent sessions do not cross-pollute stickiness", () => {
  const manager = new DualStickinessManager();
  manager.setCacheAffinity("session-A", "acc-A", 10_000);
  manager.setFallbackAffinity("session-B", "acc-B", 10_000);

  assert.equal(manager.resolveAccount("session-A").accountId, "acc-A");
  assert.equal(manager.resolveAccount("session-B").accountId, "acc-B");
});

// -------------------------------------------------------------------------
// Feature 9: Extension Runtime Bridge (window.kkStudio)
// -------------------------------------------------------------------------
test("F09-T2-01: duplicate extension ID registration throws error", () => {
  const bridge = new ExtensionRuntimeBridge();
  bridge.registerExtension({
    id: "dup",
    name: "D",
    version: "1.0",
    entryPoint: "d.js",
  });
  assert.throws(
    () =>
      bridge.registerExtension({
        id: "dup",
        name: "D2",
        version: "1.0",
        entryPoint: "d.js",
      }),
    /already registered/,
  );
});

test("F09-T2-02: registering slot for non-existent extension throws error", () => {
  const bridge = new ExtensionRuntimeBridge();
  assert.throws(
    () => bridge.registerSlot("toolbar", "ghost-ext", () => ""),
    /Unregistered extension/,
  );
});

test("F09-T2-03: querying empty or unregistered slot returns empty array", () => {
  const bridge = new ExtensionRuntimeBridge();
  assert.deepEqual(bridge.getSlotItems("unknown-slot"), []);
});

test("F09-T2-04: unloading unregistered extension does not throw error", () => {
  const bridge = new ExtensionRuntimeBridge();
  assert.doesNotThrow(() => bridge.unloadExtension("ghost-ext"));
});

test("F09-T2-05: registering extension without cleanup function unloads cleanly", () => {
  const bridge = new ExtensionRuntimeBridge();
  bridge.registerExtension({
    id: "no-clean",
    name: "NC",
    version: "1.0",
    entryPoint: "nc.js",
  });
  assert.doesNotThrow(() => bridge.unloadExtension("no-clean"));
});
