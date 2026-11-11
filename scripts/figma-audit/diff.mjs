import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { parseDocument } from "yaml";
import { parseCssScopes, cssContexts, getValue } from "../design-md/css.mjs";
import { normalizeColor, resolveSource } from "./sources.mjs";

// Reads the DESIGN.md frontmatter into a plain object. Only the frontmatter is
// authoritative for tokens; the body is prose and is deliberately ignored here.
export function readDesignDocument(file) {
  const markdown = fs.readFileSync(file, "utf8");
  const match = /^(\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(
    markdown,
  );
  if (!match) throw new Error("DESIGN.md requires YAML frontmatter");
  const document = parseDocument(match[2]);
  if (document.errors.length)
    throw new Error(document.errors.map((item) => item.message).join("; "));
  return document.toJS({ maxAliasCount: 100 });
}

// Resolves the runtime value of every CSS custom property that the local
// stylesheet actually ships, so the audit compares shipped values rather than
// declared placeholders.
export function readLocalScopes(cssFile) {
  const css = fs.readFileSync(cssFile, "utf8").replace(/\r\n/g, "\n");
  return cssContexts(parseCssScopes(css));
}

// Reads the default `:root` declarations of a legacy alias stylesheet. The
// project resolves accent variants through `[data-accent]` selectors, so the
// plain `:root` block carries the default value the runtime actually starts
// from.
export function readAliasScope(cssFile) {
  const css = fs.readFileSync(cssFile, "utf8").replace(/\r\n/g, "\n");
  const root = postcss.parse(css);
  const values = new Map();
  root.walkRules((rule) => {
    if (rule.selector !== ":root") return;
    for (const declaration of rule.nodes ?? []) {
      if (declaration.type !== "decl") continue;
      if (!declaration.prop.startsWith("--")) continue;
      values.set(declaration.prop, {
        property: declaration.prop,
        value: declaration.value.trim(),
        important: declaration.important === true,
        specificity: 10,
      });
    }
  });
  return { base: values };
}

// Resolves an alias value to the literal colour it ultimately points at.
// The alias stylesheet normally forwards to the contract variable, so a
// forwarded value is consistent by definition; a literal in the alias file
// is a genuine divergence.
function resolveAliasLiteral(aliasScopes, contractVariable, aliasName) {
  const raw = aliasScopes.base.get(`--${aliasName}`)?.value;
  if (raw === undefined) return { kind: "missing" };
  const trimmed = raw.trim();
  const reference = /^var\(--([\w-]+)\)$/.exec(trimmed);
  if (!reference) return { kind: "literal", value: trimmed };
  if (reference[1] === contractVariable) return { kind: "forwarded" };
  const forwarded = aliasScopes.base.get(`--${reference[1]}`)?.value;
  if (forwarded === undefined) return { kind: "literal", value: trimmed };
  return { kind: "literal", value: forwarded.trim() };
}

// The project ships two variable systems: the --kk-* design contract in
// tokens.css and the legacy --bg-*/--text-* aliases in global.css. Both
// describe the same surface, so their default values must agree; a silent
// divergence here means the runtime renders a different colour than the
// design contract declares.
export function auditAliasAgreement(scopes, aliasScopes) {
  const findings = [];
  const pairs = [
    ["accent", "bg-accent", "主强调色"],
    ["bg-app", "bg-app", "应用背景"],
    ["bg-surface", "bg-surface", "表面色"],
    ["bg-card", "bg-card", "卡片色"],
    ["bg-elevated", "bg-elevated", "抬升面"],
    ["bg-input", "bg-input", "输入框底色"],
    ["border-default", "border-default", "默认描边"],
  ];
  for (const [contract, alias, label] of pairs) {
    const expected = getValue(scopes.base, contract);
    if (expected === undefined) continue;
    const resolved = resolveAliasLiteral(aliasScopes, contract, alias);
    if (resolved.kind !== "literal") continue;
    const distance = hexDistance(expected, resolved.value);
    if (distance === null || distance === 0) continue;
    findings.push({
      layer: "L2",
      severity: "error",
      role: `alias.${alias}`,
      cssVariable: `--${alias}`,
      expected: normalizeColor(expected),
      actual: normalizeColor(resolved.value),
      delta: distance,
      note:
        `别名体系 --${alias} 实际取值与设计契约 --kk-${contract}（${label}）不一致：` +
        `契约 ${normalizeColor(expected)}，别名 ${normalizeColor(resolved.value)}`,
    });
  }
  return findings;
}

// Maps a DESIGN.md color role onto the CSS variable that carries it. This
// mirrors scripts/design-md/model.mjs so both directions agree on ownership.
const COLOR_ROLES = {
  primary: "accent",
  "primary-hover": "accent-hover",
  "primary-soft": "accent-soft",
  "on-primary": "on-accent",
  background: "bg-app",
  surface: "bg-surface",
  "surface-container": "bg-card",
  "surface-container-high": "bg-elevated",
  "surface-variant": "bg-soft",
  outline: "border-default",
  "outline-control": "border-control",
  "outline-variant": "border-subtle",
  input: "bg-input",
  selected: "neutral-selected",
  "on-surface": "text-primary",
  "on-surface-variant": "text-secondary",
  "text-tertiary": "text-tertiary",
  "text-accent": "text-accent",
  error: "danger",
  "on-error": "text-danger",
  success: "success",
  warning: "warning",
  focus: "focus-ring",
  "button-primary": "button-primary-bg",
  "button-primary-hover": "button-primary-hover",
  "on-button-primary": "button-primary-text",
};

function hexDistance(a, b) {
  const parse = (hex) => {
    const text = normalizeColor(hex);
    if (!text || !/^#[0-9a-f]{6}$/i.test(text)) return null;
    return [
      parseInt(text.slice(1, 3), 16),
      parseInt(text.slice(3, 5), 16),
      parseInt(text.slice(5, 7), 16),
    ];
  };
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;
  return Math.max(
    Math.abs(left[0] - right[0]),
    Math.abs(left[1] - right[1]),
    Math.abs(left[2] - right[2]),
  );
}

// Compares DESIGN.md tokens against the shipped CSS variables. This is the
// L2 token layer: both sides are already machine-readable.
export function auditTokens(design, scopes) {
  const findings = [];
  const colors = design.colors ?? {};

  for (const [role, variable] of Object.entries(COLOR_ROLES)) {
    const expected = colors[role];
    if (expected === undefined) continue;
    const actual = getValue(scopes.base, variable);
    if (actual === undefined) {
      findings.push({
        layer: "L2",
        severity: "error",
        role: `colors.${role}`,
        cssVariable: `--kk-${variable}`,
        expected: String(expected),
        actual: null,
        delta: null,
        note: "CSS variable is not declared in the shipped stylesheet",
      });
      continue;
    }
    const distance = hexDistance(expected, actual);
    if (distance !== null && distance > 0) {
      findings.push({
        layer: "L2",
        severity: distance > 8 ? "error" : "warning",
        role: `colors.${role}`,
        cssVariable: `--kk-${variable}`,
        expected: normalizeColor(expected),
        actual: normalizeColor(actual),
        delta: distance,
        note:
          distance > 8
            ? "Colour differs materially from the design contract"
            : "Colour differs within rounding tolerance",
      });
    }
  }

  // Primitives that are shipped but never bound to a semantic role can drift
  // silently: the design contract owns semantics, not raw palette entries.
  const semanticValues = new Set(
    Object.values(COLOR_ROLES)
      .map((variable) => getValue(scopes.base, variable))
      .filter((value) => typeof value === "string")
      .map((value) => normalizeColor(value)),
  );
  for (const [name, entry] of scopes.base) {
    if (!/^--kk-(dark|light)-\d+$/.test(name)) continue;
    const raw = typeof entry?.value === "string" ? entry.value.trim() : "";
    if (!/^#[0-9a-f]{3,8}$/i.test(raw)) continue;
    if (semanticValues.has(normalizeColor(raw))) continue;
    findings.push({
      layer: "L2",
      severity: "info",
      role: name,
      cssVariable: name,
      expected: null,
      actual: normalizeColor(raw),
      delta: null,
      note: "Primitive colour is not bound to any semantic role in the design contract",
    });
  }

  return findings;
}

// Compares a Figma node's measured geometry against a locally recorded
// rectangle. This is the L3 geometry layer.
export function auditGeometry(figmaNodes, localRects, tolerance = 0.5) {
  const findings = [];
  const byId = new Map(figmaNodes.map((node) => [node.id, node]));
  for (const [selector, record] of Object.entries(localRects)) {
    const node = byId.get(record.nodeId);
    if (!node) {
      findings.push({
        layer: "L3",
        severity: "warning",
        selector,
        nodeId: record.nodeId,
        note: "Figma node is absent from the snapshot; the mapping may be stale",
      });
      continue;
    }
    const source = record.source ?? [node.x, node.y, node.width, node.height];
    const actual = [node.x, node.y, node.width, node.height];
    const error = Math.max(
      ...source.map((value, index) =>
        value === null || actual[index] === null
          ? 0
          : Math.abs(value - actual[index]),
      ),
    );
    if (error > tolerance) {
      findings.push({
        layer: "L3",
        severity: error > 2 ? "error" : "warning",
        selector,
        nodeId: record.nodeId,
        expected: source,
        actual,
        delta: Number(error.toFixed(3)),
        note: `Geometry differs by ${error.toFixed(3)}px (tolerance ${tolerance}px)`,
      });
    }
  }
  return findings;
}

// Compares the component inventory exposed by Figma against the components the
// local codebase actually ships. This is the L1 structure layer.
export function auditComponents(figmaComponents, localComponents) {
  const findings = [];
  const local = new Set(localComponents);
  for (const component of figmaComponents) {
    if (!local.has(component.name)) {
      findings.push({
        layer: "L1",
        severity: "warning",
        component: component.name,
        nodeId: component.nodeId,
        variants: component.variants ?? [],
        note: "No local component implements this Figma component",
      });
    }
  }
  return findings;
}

// Builds the Figma-side component inventory from a snapshot.
export function snapshotComponents(snapshot) {
  const components = new Map();
  for (const page of snapshot.pages ?? []) {
    for (const node of page.nodes ?? []) {
      if (!node.componentKey) continue;
      const key = `${page.pageName} :: ${node.name}`;
      if (!components.has(key))
        components.set(key, {
          name: key,
          nodeId: node.id,
          variants: node.componentProperties
            ? Object.keys(node.componentProperties)
            : [],
        });
    }
  }
  return [...components.values()];
}

export function loadLocalComponents(repository) {
  const roots = [
    path.join(repository, "src", "components"),
    path.join(repository, "src", "features"),
  ];
  const found = new Set();
  const walk = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name))
        found.add(entry.name.replace(/\.tsx?$/, ""));
    }
  };
  for (const root of roots) walk(root);
  return [...found];
}

export function readLocalRects(file) {
  if (!file || !fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function summarize(findings) {
  const counts = { error: 0, warning: 0, info: 0 };
  const layers = {};
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    layers[finding.layer] = (layers[finding.layer] ?? 0) + 1;
  }
  return { counts, layers, total: findings.length };
}

export { resolveSource };
