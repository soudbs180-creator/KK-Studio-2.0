import assert from "node:assert/strict";
import test from "node:test";
import { PNG } from "playwright-core/lib/utilsBundle";
import {
  auditAliasAgreement,
  auditGeometry,
  auditTokens,
  readAliasScope,
  readDesignDocument,
  readLocalScopes,
  snapshotComponents,
  summarize,
} from "../../scripts/figma-audit/diff.mjs";
import { comparePixels } from "../../scripts/figma-audit/pixel.mjs";
import {
  collectNodes,
  flattenNode,
  normalizeColor,
  resolveSource,
  toHex,
} from "../../scripts/figma-audit/sources.mjs";

const repository = new URL("../../", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

test("toHex converts Figma float colours into hex strings", () => {
  assert.equal(toHex({ r: 0, g: 0, b: 0 }), "#000000");
  assert.equal(toHex({ r: 1, g: 1, b: 1 }), "#ffffff");
  assert.equal(toHex({ r: 0.129, g: 0.651, b: 0.451 }), "#21a673");
});

test("normalizeColor expands shorthand hex and lowercases", () => {
  assert.equal(normalizeColor("#ABC"), "#aabbcc");
  assert.equal(normalizeColor("#21A673"), "#21a673");
});

test("flattenNode extracts the comparable geometry subset", () => {
  const flat = flattenNode({
    id: "1:2",
    name: "Frame",
    type: "FRAME",
    absoluteBoundingBox: { x: 10, y: 20, width: 300, height: 40 },
    fills: [
      { type: "SOLID", color: { r: 1, g: 1, b: 1 } },
      { type: "SOLID", visible: false, color: { r: 0, g: 0, b: 0 } },
    ],
    cornerRadius: 8,
  });
  assert.equal(flat.width, 300);
  assert.equal(flat.height, 40);
  assert.equal(flat.cornerRadius, 8);
  assert.equal(flat.fills.length, 1);
  assert.equal(flat.fills[0].value, "#ffffff");
});

test("collectNodes walks nested children", () => {
  const nodes = collectNodes({
    id: "root",
    name: "Page",
    children: [{ id: "a", name: "A", children: [{ id: "b", name: "B" }] }],
  });
  assert.deepEqual(
    nodes.map((node) => node.id),
    ["root", "a", "b"],
  );
});

test("auditTokens reports a colour that drifted from the design contract", () => {
  const scopes = {
    base: new Map([
      ["--kk-accent", { property: "--kk-accent", value: "#635bff" }],
      ["--kk-bg-app", { property: "--kk-bg-app", value: "#0a0a0a" }],
    ]),
    light: new Map(),
  };
  const design = { colors: { primary: "#21a673", background: "#0a0a0a" } };
  const findings = auditTokens(design, scopes);
  const accent = findings.find((item) => item.role === "colors.primary");
  assert.ok(accent, "the drifted colour must be reported");
  assert.equal(accent.severity, "error");
  assert.equal(accent.layer, "L2");
  assert.equal(accent.cssVariable, "--kk-accent");
});

test("auditTokens stays silent when colours match the contract", () => {
  const scopes = {
    base: new Map([
      ["--kk-accent", { property: "--kk-accent", value: "#21a673" }],
      ["--kk-bg-app", { property: "--kk-bg-app", value: "#0a0a0a" }],
    ]),
    light: new Map(),
  };
  const design = { colors: { primary: "#21a673", background: "#0a0a0a" } };
  const findings = auditTokens(design, scopes);
  assert.equal(findings.filter((item) => item.severity === "error").length, 0);
});

test("auditGeometry flags a rectangle beyond the tolerance", () => {
  const findings = auditGeometry(
    [{ id: "1:1", x: 0, y: 0, width: 100, height: 40 }],
    { ".toolbar": { nodeId: "1:1", source: [0, 0, 100, 44] } },
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].layer, "L3");
  assert.equal(findings[0].severity, "error");
  assert.equal(findings[0].delta, 4);
});

test("auditGeometry accepts differences inside the tolerance", () => {
  const findings = auditGeometry(
    [{ id: "1:1", x: 0, y: 0, width: 100, height: 40 }],
    { ".toolbar": { nodeId: "1:1", source: [0, 0, 100, 40.25] } },
  );
  assert.equal(findings.length, 0);
});

test("auditGeometry reports a stale node mapping", () => {
  const findings = auditGeometry([], {
    ".toolbar": { nodeId: "9:9", source: [0, 0, 1, 1] },
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "warning");
});

test("snapshotComponents lists components with their variants", () => {
  const components = snapshotComponents({
    pages: [
      {
        pageName: "03 · 组件与交互",
        nodes: [
          {
            id: "2002:1",
            name: "Button",
            componentKey: "abc",
            componentProperties: { size: "Large", state: "Default" },
          },
        ],
      },
    ],
  });
  assert.equal(components.length, 1);
  assert.deepEqual(components[0].variants, ["size", "state"]);
});

test("summarize counts severities and layers", () => {
  const summary = summarize([
    { severity: "error", layer: "L2" },
    { severity: "warning", layer: "L2" },
    { severity: "warning", layer: "L3" },
  ]);
  assert.equal(summary.total, 3);
  assert.equal(summary.counts.error, 1);
  assert.equal(summary.counts.warning, 2);
  assert.equal(summary.layers.L2, 2);
  assert.equal(summary.layers.L3, 1);
});

test("the shipped design document and stylesheet agree on the accent colour", () => {
  const design = readDesignDocument(`${repository}/DESIGN.md`);
  const scopes = readLocalScopes(`${repository}/src/styles/tokens.css`);
  const findings = auditTokens(design, scopes).filter(
    (item) => item.role === "colors.primary" && item.severity === "error",
  );
  assert.deepEqual(
    findings,
    [],
    "DESIGN.md and tokens.css must not disagree on the primary colour",
  );
});

test("resolveSource exposes the authoritative file key", () => {
  const source = resolveSource("kk-studio-current");
  assert.equal(source.fileKey, "ZiadpErDoFweCjG3uHjkM3");
  assert.equal(source.pages["01-design-spec"], "91:2");
  assert.ok(source.registeredNodes.includes("546:21"));
});

test("the alias stylesheet forwards to the design contract", () => {
  const scopes = readLocalScopes(`${repository}/src/styles/tokens.css`);
  const alias = readAliasScope(`${repository}/src/styles/global.css`);
  const findings = auditAliasAgreement(scopes, alias);
  assert.deepEqual(
    findings,
    [],
    "global.css aliases must resolve to the same colour as the design contract",
  );
});

test("auditAliasAgreement reports a literal that drifts from the contract", () => {
  const scopes = {
    base: new Map([
      ["--kk-accent", { property: "--kk-accent", value: "#21a673" }],
    ]),
    light: new Map(),
  };
  const alias = {
    base: new Map([
      ["--bg-accent", { property: "--bg-accent", value: "#635bff" }],
    ]),
  };
  const findings = auditAliasAgreement(scopes, alias);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.equal(findings[0].expected, "#21a673");
  assert.equal(findings[0].actual, "#635bff");
});

test("comparePixels reports no difference for identical images", () => {
  const make = () => {
    const png = new PNG({ width: 4, height: 4 });
    for (let index = 0; index < 16; index += 1) {
      png.data[index * 4] = 255;
      png.data[index * 4 + 3] = 255;
    }
    return PNG.sync.write(png);
  };
  const result = comparePixels(make(), make());
  assert.equal(result.comparable, true);
  assert.equal(result.diffRatio, 0);
});

test("comparePixels honours the channel tolerance", () => {
  const make = (firstPixelRed) => {
    const png = new PNG({ width: 4, height: 4 });
    for (let index = 0; index < 16; index += 1) {
      png.data[index * 4] = 255;
      png.data[index * 4 + 3] = 255;
    }
    png.data[0] = firstPixelRed;
    return PNG.sync.write(png);
  };
  const near = comparePixels(make(255), make(250), { channelTolerance: 8 });
  assert.equal(near.diffRatio, 0, "a 5 step delta is inside the tolerance");
  const far = comparePixels(make(255), make(100), { channelTolerance: 8 });
  assert.equal(far.diffRatio, 1 / 16, "only the altered pixel differs");
});

test("comparePixels refuses images of different size without cropping", () => {
  const make = (size) => PNG.sync.write(new PNG({ width: size, height: size }));
  const result = comparePixels(make(4), make(8));
  assert.equal(result.comparable, false);
  assert.equal(result.reason, "dimensions differ");
});

test("comparePixels crops a one pixel border difference when allowed", () => {
  const tall = new PNG({ width: 4, height: 5 });
  const short = new PNG({ width: 4, height: 4 });
  for (let index = 0; index < 20; index += 1) {
    tall.data[index * 4] = 255;
    tall.data[index * 4 + 3] = 255;
  }
  for (let index = 0; index < 16; index += 1) {
    short.data[index * 4] = 255;
    short.data[index * 4 + 3] = 255;
  }
  const result = comparePixels(PNG.sync.write(tall), PNG.sync.write(short), {
    allowCrop: true,
  });
  assert.equal(result.comparable, true);
  assert.equal(result.aligned, true);
  assert.equal(result.diffRatio, 0);
});
