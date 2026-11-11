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
import UiIcon, { type UiIconName } from "../../src/components/UiIcon.tsx";
import { normalizeUiIconSize } from "../../src/components/uiIconSizing.ts";
import { resolveImageSize } from "../../src/domain/imageParameters.ts";
import {
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

test("F01-T2-01: all production tag colors define both themes", () => {
  for (const category of ["character", "scene", "costume", "prop", "custom"])
    assert.equal(css.split("--kk-tag-" + category + "-bg:").length - 1, 2);
});
test("F01-T2-02: real focus ring is consumed by stylesheet selectors", () => {
  assert.match(workspaceCss, /var\(--kk-focus-ring/u);
});
test("F01-T2-03: identical colors have contrast one", () => {
  assert.equal(calculateContrastRatio("#f2f2f2", "#f2f2f2"), 1);
});
test("F01-T2-04: black and white achieve contrast twenty-one", () => {
  assert.equal(calculateContrastRatio("#000000", "#ffffff"), 21);
});
test("F01-T2-05: short hexadecimal notation uses the real color parser", () => {
  assert.equal(calculateContrastRatio("#000", "#fff"), 21);
});
test("F02-T2-01: actual default Button uses the current 32px tier", () => {
  assert.match(render(h(Button, {}, "default")), /data-height-tier="32px"/u);
});
test("F02-T2-02: actual numeric Input preserves its native value and readonly semantics", () => {
  const markup = render(
    h(Input, { value: 42, type: "number", readOnly: true }),
  );
  assert.match(markup, /value="42"/u);
  assert.match(markup, /readonly=""/u);
});
test("F02-T2-03: Select with absent value renders placeholder without a false selection", () => {
  const markup = render(
    h(Select, {
      options: [{ value: "a", label: "Alpha" }],
      value: "missing",
      placeholder: "Choose",
    }),
  );
  assert.match(markup, /Choose/u);
  assert.doesNotMatch(markup, /aria-selected="true"/u);
});
test("F02-T2-04: Badge escapes creative text instead of interpreting script markup", () => {
  const markup = render(
    h(Badge, { children: "<script>creative text</script>" }),
  );
  assert.match(markup, /&lt;script&gt;/u);
  assert.doesNotMatch(markup, /<script>/u);
});
test("F02-T2-05: closed real Modal emits no DOM", () => {
  assert.equal(
    render(
      h(ModalDialog, {
        isOpen: false,
        title: "Closed",
        onClose: () => {},
        children: "hidden",
      }),
    ),
    "",
  );
});
test("F03-T2-01: empty icon uses CircleHelp fallback", () => {
  assert.equal(
    render(h(UiIcon, { name: "" as UiIconName })),
    render(h(UiIcon, { name: "circle-help" })),
  );
});
test("F03-T2-02: unsupported mixed case icon query stays in fallback", () => {
  assert.equal(
    render(h(UiIcon, { name: " Camera " as UiIconName })),
    render(h(UiIcon, { name: "circle-help" })),
  );
});
test("F03-T2-03: real icon size normalization bounds zero and negative inputs", () => {
  assert.equal(normalizeUiIconSize(0), 12);
  assert.equal(normalizeUiIconSize(-1), 12);
});
test("F03-T2-04: oversized icons clamp to the largest supported tier", () => {
  assert.equal(normalizeUiIconSize(512), 32);
  assert.match(render(h(UiIcon, { name: "camera", size: 512 })), /width="32"/u);
});
test("F03-T2-05: punctuation in icon name remains inert", () => {
  assert.equal(
    render(h(UiIcon, { name: ".*+?[]" as UiIconName })),
    render(h(UiIcon, { name: "circle-help" })),
  );
});
test("F04-T2-01: malformed ratio leaves size unresolved", () => {
  for (const ratio of ["invalid", "16/9"])
    assert.equal(resolveImageSize(ratio, "1K"), undefined);
});
test("F04-T2-02: zero ratio leaves size unresolved", () => {
  for (const ratio of ["0:1", "16:0"])
    assert.equal(resolveImageSize(ratio, "1K"), undefined);
});
test("F04-T2-03: negative ratio leaves size unresolved", () => {
  for (const ratio of ["-16:9", "16:-9"])
    assert.equal(resolveImageSize(ratio, "1K"), undefined);
});
test("F04-T2-04: unsupported quality never fabricates provider dimensions", () => {
  assert.equal(resolveImageSize("1:1", "1px"), undefined);
});
test("F04-T2-05: real ultra-wide 4K output remains finite and grid aligned", () => {
  assert.equal(resolveImageSize("21:9", "4K"), "4096x1752");
});
test("F05-T2-01: actual phone/tablet boundary is exact", () => {
  assert.match(renderSidebarSurface(767), /data-surface="phone"/u);
  assert.match(renderSidebarSurface(768), /data-surface="tablet"/u);
});
test("F05-T2-02: zero-width initial browser surface uses compact navigation", () => {
  assert.match(renderSidebarSurface(0), /data-narrow="true"/u);
});
test("F05-T2-03: actual tablet/desktop boundary is exact", () => {
  assert.match(renderSidebarSurface(1200), /data-surface="tablet"/u);
  assert.match(renderSidebarSurface(1201), /data-surface="desktop"/u);
});
test("F05-T2-04: ultrawide layout keeps desktop navigation", () => {
  assert.match(renderSidebarSurface(7680), /data-surface="desktop"/u);
});
test("F05-T2-05: repeated viewport fixtures do not leak responsive state", () => {
  assert.match(renderSidebarSurface(360), /data-surface="phone"/u);
  assert.match(renderSidebarSurface(1280), /data-surface="desktop"/u);
  assert.match(renderSidebarSurface(400), /data-surface="phone"/u);
});
test("F06-T2-01: negative spacing uses production absolute grid checks", () => {
  assert.equal(validateSpacingValue(-8), null);
  assert.equal(validateSpacingValue(-5)?.severity, "violation");
});
test("F06-T2-02: fractional pixels fail the production spacing rhythm", () => {
  for (const n of [4.5, 15.9])
    assert.equal(validateSpacingValue(n)?.severity, "violation");
});
test("F06-T2-03: two-pixel nudge remains a warning rather than a fabricated violation", () => {
  assert.equal(validateSpacingValue(2)?.severity, "warning");
  assert.equal(evaluateStyleDeclaration({ padding: "2px" }).valid, true);
});
test("F06-T2-04: safe transform and opacity transitions pass actual governance", () => {
  assert.equal(
    evaluateStyleDeclaration({ transition: "transform 120ms, opacity 120ms" })
      .valid,
    true,
  );
});
test("F06-T2-05: layout animation is rejected by actual governance", () => {
  assert.equal(
    evaluateStyleDeclaration({ transition: "width 120ms" }).valid,
    false,
  );
});
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
