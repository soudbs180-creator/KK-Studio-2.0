import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkRules, extractRuleIds } from "../../scripts/check-rules.mjs";
import {
  collectionTier,
  figmaToCssVar,
} from "../../scripts/design-tokens/naming.mjs";
import {
  colorToHex,
  flattenDtcg,
  renderCss,
  snapshotToDtcg,
} from "../../scripts/design-tokens/figma.mjs";
import {
  checkComponentMap,
  checkDrift,
  checkLayering,
  checkPrimitiveLeaks,
  compareRatchet,
  runTokenChecks,
} from "../../scripts/design-tokens/check.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("checkRules passes on repository root and enforces numbered non-duplicative rules", () => {
  const { issues, ruleCount } = checkRules(root);
  assert.deepEqual(issues, []);
  assert.ok(ruleCount >= 25, `expected >= 25 rule IDs, got ${ruleCount}`);
  assert.deepEqual(
    extractRuleIds("- **[RULE-NO-DRIVEBY] test** and [D-SYNC-01]"),
    ["RULE-NO-DRIVEBY", "D-SYNC-01"],
  );
});

test("figmaToCssVar maps Figma paths deterministically and rejects non-ASCII names", () => {
  assert.equal(
    figmaToCssVar("button/primary/bg/hover"),
    "--kk-button-primary-bg-hover",
  );
  assert.equal(
    figmaToCssVar("Surface / Container High"),
    "--kk-surface-container-high",
  );
  assert.equal(collectionTier("Primitive"), 1);
  assert.equal(collectionTier("semantic"), 2);
  assert.equal(collectionTier("component"), 3);
  assert.equal(collectionTier("unknown"), null);
  assert.throws(() => figmaToCssVar("按钮/背景"), /cannot map to a CSS token/);
});

test("snapshotToDtcg and renderCss round-trip Figma variables into tiered CSS", () => {
  const snapshot = {
    fileKey: "ZiadpErDoFweCjG3uHjkM3",
    version: "1",
    lastModified: "2026-11-05T00:00:00Z",
    variables: {
      collections: {
        c1: {
          name: "primitive",
          defaultModeId: "m1",
          modes: [{ modeId: "m1", name: "default" }],
        },
        c2: {
          name: "semantic",
          defaultModeId: "mDark",
          modes: [
            { modeId: "mDark", name: "dark" },
            { modeId: "mLight", name: "light" },
          ],
        },
        c3: {
          name: "component",
          defaultModeId: "m1",
          modes: [{ modeId: "m1", name: "default" }],
        },
      },
      variables: {
        "gray/900": {
          id: "v1",
          type: "COLOR",
          collection: "primitive",
          valuesByMode: { m1: { r: 0.086, g: 0.086, b: 0.086, a: 1 } },
        },
        "gray/100": {
          id: "v2",
          type: "COLOR",
          collection: "primitive",
          valuesByMode: { m1: { r: 0.95, g: 0.95, b: 0.95, a: 1 } },
        },
        "surface/base": {
          id: "v3",
          type: "COLOR",
          collection: "semantic",
          valuesByMode: {
            mDark: { type: "VARIABLE_ALIAS", id: "v1" },
            mLight: { type: "VARIABLE_ALIAS", id: "v2" },
          },
        },
        "button/primary/bg": {
          id: "v4",
          type: "COLOR",
          collection: "component",
          valuesByMode: { m1: { type: "VARIABLE_ALIAS", id: "v3" } },
        },
      },
    },
  };

  assert.equal(colorToHex({ r: 1, g: 1, b: 1, a: 1 }), "#ffffff");
  const { document, warnings } = snapshotToDtcg(snapshot);
  assert.deepEqual(warnings, []);
  const flat = flattenDtcg(document);
  assert.equal(flat.length, 4);
  const css = renderCss(document);
  assert.match(css, /--kk-gray-900: #161616;/);
  assert.match(css, /--kk-surface-base: var\(--kk-gray-900\);/);
  assert.match(
    css,
    /\[data-theme="light"\] \{\s*--kk-surface-base: var\(--kk-gray-100\);/,
  );
  assert.match(css, /--kk-button-primary-bg: var\(--kk-surface-base\);/);
  assert.equal(checkDrift(document, css).size, 0);
});

test("checkLayering and checkPrimitiveLeaks detect upward refs, literals, and Tier 1 leaks", () => {
  const sampleCss = `
    :root {
      /* Tier 1 */
      --kk-dark-1: #161616;
      --kk-bad-upward: var(--kk-surface);
      /* Tier 2 */
      --kk-surface: var(--kk-dark-1);
      /* Tier 3 */
      --kk-btn-bg: #ff0000;
      --kk-btn-fg: var(--kk-surface);
    }
  `;
  const { tiers, findings } = checkLayering(sampleCss);
  assert.ok(findings.has("upward|--kk-bad-upward->--kk-surface"));
  assert.ok(findings.has("tier3-literal|--kk-btn-bg"));
  assert.ok(findings.has("tier3-color|--kk-btn-bg"));
  assert.ok(!findings.has("tier3-literal|--kk-btn-fg"));

  const leaks = checkPrimitiveLeaks(
    [
      {
        name: "src/components/Demo.css",
        content: ".x { color: var(--kk-dark-1); }",
      },
    ],
    tiers,
  );
  assert.equal(leaks.get("leak|src/components/Demo.css|--kk-dark-1"), 1);

  const ratchet = compareRatchet(leaks, {
    "leak|src/components/Demo.css|--kk-dark-1": 0,
  });
  assert.equal(ratchet.regressions.length, 1);
});

test("checkComponentMap and runTokenChecks validate repository component map and token baseline", () => {
  const { strict } = runTokenChecks(root);
  assert.deepEqual(strict, []);

  const badIssues = checkComponentMap(
    {
      schema: "kk-studio.figma-component-map/1",
      fileKey: "ZiadpErDoFweCjG3uHjkM3",
      components: [
        {
          id: "Bad_ID",
          figma: { nodeId: "invalid" },
          local: { paths: ["src/does-not-exist.tsx"] },
          tokens: ["--kk-missing-prefix"],
          status: "RUNTIME_VERIFIED",
        },
      ],
    },
    { tiers: new Map([["--kk-btn-bg", 3]]), exists: () => false },
  );
  assert.ok(badIssues.length >= 4);
});
