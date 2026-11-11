import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { readFileSync } from "node:fs";
import { Button } from "../../src/components/ui/Button.tsx";
import { Input } from "../../src/components/ui/Input.tsx";
import { Select } from "../../src/components/ui/Select.tsx";
import { Badge } from "../../src/components/ui/Badge.tsx";
import { ModalDialog } from "../../src/components/ui/ModalDialog.tsx";
import UiIcon, {
  ICONS,
  type UiIconName,
} from "../../src/components/UiIcon.tsx";
import { resolveImageSize } from "../../src/domain/imageParameters.ts";
import { STANDARDIZED_ASPECT_RATIOS } from "../../src/components/nodes/CreationParameters.tsx";
import {
  validateViewportLayout,
  validateSpacingValue,
  evaluateStyleDeclaration,
  calculateContrastRatio,
} from "../../src/domain/uiAestheticGovernance.ts";
import { renderSidebarSurface } from "../support/responsiveFixture.ts";
import {
  GatewayCooldownScheduler,
  DualStickinessManager,
  ExtensionRuntimeBridge,
} from "./harness.ts";
const css = readFileSync(
  new URL("../../src/styles/tokens.css", import.meta.url),
  "utf8",
);
const workspaceCss = readFileSync(
  new URL("../../src/styles/workspace.css", import.meta.url),
  "utf8",
);

test("F01-T1-01: actual stylesheet owns both dark and light surface values", () => {
  assert.match(css, /--kk-bg-surface:\s*#161616/u);
  assert.match(css, /--kk-bg-surface:\s*#f2f2f2/u);
});
test("F01-T1-02: actual focus tokens retain light and dark contrasts", () => {
  assert.match(css, /--kk-focus-ring:\s*#dbdbdb/u);
  assert.match(css, /--kk-focus-ring:\s*#252525/u);
});
test("F01-T1-03: every production data category has paired text and background tokens", () => {
  for (const category of ["character", "scene", "costume", "prop", "custom"]) {
    assert.ok(css.includes("--kk-tag-" + category + "-bg:"));
    assert.ok(css.includes("--kk-tag-" + category + "-text:"));
  }
});
test("F01-T1-04: real contrast engine verifies quiet surface text", () => {
  assert.ok(calculateContrastRatio("#252525", "#f2f2f2") >= 4.5);
});
test("F01-T1-05: production Badge consumes each defined data category", () => {
  for (const category of [
    "character",
    "scene",
    "costume",
    "prop",
    "custom",
  ] as const)
    assert.match(
      render(h(Badge, { category, children: "tag" })),
      new RegExp("kk-tag--" + category),
    );
});
test("F02-T1-01: actual Button renders all five height tiers", () => {
  for (const heightTier of ["44px", "40px", "32px", "24px", "16px"] as const)
    assert.match(
      render(h(Button, { heightTier }, "action")),
      new RegExp('data-height-tier="' + heightTier + '"'),
    );
});
test("F02-T1-02: actual compact Button uses the 44px CSS hit area", () => {
  assert.match(
    render(h(Button, { heightTier: "16px" }, "action")),
    /kk-button--decoupled-hit/u,
  );
  assert.match(workspaceCss, /min-width:\s*44px/u);
  assert.match(workspaceCss, /min-height:\s*44px/u);
});
test("F02-T1-03: actual Input renders disabled value without losing draft", () => {
  const markup = render(
    h(Input, { value: "query", disabled: true, readOnly: true }),
  );
  assert.match(markup, /value="query"/u);
  assert.match(markup, /disabled=""/u);
});
test("F02-T1-04: actual Select renders selected label and combobox semantics", () => {
  const markup = render(
    h(Select, { options: [{ value: "a", label: "Alpha" }], value: "a" }),
  );
  assert.match(markup, /role="combobox"/u);
  assert.match(markup, /Alpha/u);
});
test("F02-T1-05: actual Badge and Modal render user content and accessible title", () => {
  assert.match(
    render(h(Badge, { variant: "success", children: "Active" })),
    /Active/u,
  );
  assert.match(
    render(
      h(ModalDialog, {
        isOpen: true,
        onClose: () => {},
        title: "Confirm",
        children: "Body",
      }),
    ),
    /aria-label="Confirm"/u,
  );
});
test("F03-T1-01: every production icon entry renders an actual SVG", () => {
  for (const name of Object.keys(ICONS) as UiIconName[])
    assert.match(render(h(UiIcon, { name })), /<svg/u);
});
test("F03-T1-02: real camera icon consumes the requested supported size", () => {
  assert.match(render(h(UiIcon, { name: "camera", size: 24 })), /width="24"/u);
});
test("F03-T1-03: real media icons render play pause and film", () => {
  for (const name of ["play", "pause", "film"] as const)
    assert.match(render(h(UiIcon, { name })), /<svg/u);
});
test("F03-T1-04: real canvas aliases render layers grid and move", () => {
  for (const name of ["layers", "grid", "move"] as const)
    assert.match(render(h(UiIcon, { name })), /<svg/u);
});
test("F03-T1-05: unknown icon renders the real CircleHelp fallback", () => {
  assert.equal(
    render(h(UiIcon, { name: "unknown" as UiIconName })),
    render(h(UiIcon, { name: "circle-help" })),
  );
});
test("F04-T1-01: actual parameter UI exposes fifteen ratios", () => {
  assert.equal(STANDARDIZED_ASPECT_RATIOS.length, 15);
  assert.ok(STANDARDIZED_ASPECT_RATIOS.includes("自适应"));
});
test("F04-T1-02: adaptive image size leaves provider dimensions unspecified", () => {
  assert.equal(resolveImageSize("自适应", "自适应"), undefined);
});
test("F04-T1-03: real image size compiler preserves landscape portrait and square", () => {
  assert.equal(resolveImageSize("16:9", "1K"), "1024x576");
  assert.equal(resolveImageSize("9:16", "1K"), "576x1024");
  assert.equal(resolveImageSize("1:1", "1K"), "1024x1024");
});
test("F04-T1-04: real 2K image sizes respect the provider eight-pixel grid", () => {
  assert.equal(resolveImageSize("16:9", "2K"), "2048x1152");
});
test("F04-T1-05: extreme ratios retain the production minimum edge", () => {
  assert.equal(resolveImageSize("1:8", "1K"), "256x1024");
  assert.equal(resolveImageSize("8:1", "1K"), "1024x256");
});
test("F05-T1-01: actual responsive hook classifies phone widths", () => {
  for (const width of [375, 767])
    assert.match(renderSidebarSurface(width), /data-surface="phone"/u);
});
test("F05-T1-02: actual responsive hook preserves the tablet band", () => {
  assert.match(renderSidebarSurface(768), /data-surface="tablet"/u);
  assert.match(renderSidebarSurface(1920), /data-surface="desktop"/u);
});
test("F05-T1-03: phone sidebar opens collapsed as a drawer", () => {
  assert.match(renderSidebarSurface(390), /data-collapsed="true"/u);
  assert.match(renderSidebarSurface(390), /data-narrow="true"/u);
});
test("F05-T1-04: independent mobile layout guard rejects desktop canvas components", () => {
  assert.ok(
    validateViewportLayout(414, ["CanvasScreen"]).some(
      (f) => f.severity === "violation",
    ),
  );
});
test("F05-T1-05: desktop layout guard permits its canvas", () => {
  assert.deepEqual(validateViewportLayout(1440, ["CanvasScreen"]), []);
});
test("F06-T1-01: production spacing validator accepts four-pixel rhythm", () => {
  for (const n of [0, 4, 8, 16, 24])
    assert.equal(validateSpacingValue(n), null);
});
test("F06-T1-02: production spacing validator reports off-grid values", () => {
  for (const n of [3, 7, 13])
    assert.equal(validateSpacingValue(n)?.severity, "violation");
});
test("F06-T1-03: actual aesthetic evaluator accepts compliant declarations", () => {
  assert.equal(
    evaluateStyleDeclaration({
      padding: "12px",
      margin: "8px",
      fontWeight: 400,
    }).valid,
    true,
  );
});
test("F06-T1-04: actual aesthetic evaluator rejects off-grid padding", () => {
  const report = evaluateStyleDeclaration({ padding: "11px" });
  assert.equal(report.valid, false);
  assert.ok(report.findings.some((f) => f.pass === "spacing"));
});
test("F06-T1-05: actual contrast calculation flags low foreground/background contrast", () => {
  assert.ok(calculateContrastRatio("#aaaaaa", "#ffffff") < 4.5);
});
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
