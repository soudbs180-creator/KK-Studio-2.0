// Design token governance checks (docs/FIGMA-SYNC.md §5).
// Every finding has a stable key so the ratchet compares identities, not totals.
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { flattenDtcg, cssValue, selectorForMode } from "./figma.mjs";

export const TOKEN_FILES = Object.freeze([
  "src/styles/tokens.css",
  "src/styles/ui-tokens.css",
  "src/styles/tokens.figma.css",
]);
export const RETIRED_SOURCES = Object.freeze(["src/styles/tokens.json"]);
export const MAP_FILE = "design/figma-component-map.json";
export const DTCG_FILE = "design/tokens/figma.tokens.json";
export const BASELINE_FILE = "config/design-token-baseline.json";
export const MAP_STATUSES = Object.freeze([
  "DESIGN_PENDING",
  "FIGMA_READY",
  "LOCAL_PENDING",
  "SYNCED",
  "RUNTIME_VERIFIED",
]);

const VAR_REF = /var\(\s*(--[\w-]+)/g;
const COLOR_LITERAL = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i;

function normalizeValue(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse tokens.css into tier membership, :root declarations and themed overrides. */
export function parseTokenTiers(css) {
  const tiers = new Map();
  const declarations = [];
  postcss.parse(css).walkRules((rule) => {
    const isRoot =
      rule.selector.trim() === ":root" && rule.parent?.type === "root";
    let tier = 0;
    for (const node of rule.nodes ?? []) {
      if (isRoot && node.type === "comment") {
        const match = /Tier\s*([123])/i.exec(node.text);
        if (match) tier = Number(match[1]);
      }
      if (node.type !== "decl" || !node.prop.startsWith("--")) continue;
      if (isRoot && !tiers.has(node.prop)) tiers.set(node.prop, tier);
      declarations.push({
        name: node.prop,
        value: node.value,
        selector: rule.selector.trim(),
        root: isRoot,
        tier: isRoot ? tier : null,
      });
    }
  });
  return { tiers, declarations };
}

function addFinding(findings, key, count = 1) {
  findings.set(key, (findings.get(key) ?? 0) + count);
}

/** D-TOKEN-01 / D-TOKEN-05 layering rules for the token registry. */
export function checkLayering(css) {
  const { tiers, declarations } = parseTokenTiers(css);
  const findings = new Map();
  for (const decl of declarations) {
    const tier = decl.root ? decl.tier : tiers.get(decl.name);
    if (decl.root && tier === 0)
      addFinding(findings, `unclassified|${decl.name}`);
    if (tier === 3 && !decl.root)
      addFinding(findings, `tier3-themed|${decl.name}|${decl.selector}`);
    if (tier === 3 && !decl.value.includes("var("))
      addFinding(findings, `tier3-literal|${decl.name}`);
    if (tier === 3 && COLOR_LITERAL.test(decl.value))
      addFinding(findings, `tier3-color|${decl.name}`);
    for (const [, ref] of decl.value.matchAll(VAR_REF)) {
      const target = tiers.get(ref);
      if (tier && target && target > tier)
        addFinding(findings, `upward|${decl.name}->${ref}`);
    }
  }
  return { tiers, findings };
}

/** D-TOKEN-02: business code must not consume Tier 1 primitives. */
export function checkPrimitiveLeaks(files, tiers) {
  const findings = new Map();
  for (const { name, content } of files) {
    if (TOKEN_FILES.includes(name)) continue;
    for (const [, ref] of content.matchAll(VAR_REF))
      if (tiers.get(ref) === 1) addFinding(findings, `leak|${name}|${ref}`);
  }
  return findings;
}

function cssValueFor(declarations, name, mode) {
  const selector = selectorForMode(mode);
  const match =
    declarations.find((d) => d.name === name && d.selector === selector) ??
    declarations.find((d) => d.name === name && d.root);
  return match?.value;
}

/** Drift between the adopted Figma DTCG snapshot and the CSS registry. */
export function checkDrift(dtcg, css) {
  const findings = new Map();
  if (!dtcg) return findings;
  const { declarations } = parseTokenTiers(css);
  for (const token of flattenDtcg(dtcg))
    for (const [mode, value] of Object.entries(token.modes)) {
      const actual = cssValueFor(declarations, token.cssVar, mode);
      if (actual === undefined)
        addFinding(findings, `drift-missing|${token.cssVar}|${mode}`);
      else if (
        normalizeValue(actual) !== normalizeValue(cssValue(token, value))
      )
        addFinding(findings, `drift-value|${token.cssVar}|${mode}`);
    }
  return findings;
}

function validateEntryIdentity(entry, where, ids) {
  const issues = [];
  if (!entry?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id))
    issues.push(`${where}: id must be kebab-case`);
  if (ids.has(entry?.id)) issues.push(`${where}: duplicate id`);
  ids.add(entry?.id);
  if (!/^\d+:\d+$/.test(entry?.figma?.nodeId ?? ""))
    issues.push(`${where}: figma.nodeId must look like 123:456`);
  if (!MAP_STATUSES.includes(entry?.status))
    issues.push(`${where}: status must be one of ${MAP_STATUSES.join(", ")}`);
  return issues;
}

function validateEntryLinks(entry, where, { tiers, exists }) {
  const issues = [];
  const paths = entry?.local?.paths ?? [];
  if (!paths.length) issues.push(`${where}: local.paths is required`);
  for (const file of paths)
    if (!exists(file))
      issues.push(`${where}: local path does not exist: ${file}`);
  const advanced =
    MAP_STATUSES.indexOf(entry?.status) >= MAP_STATUSES.indexOf("SYNCED");
  if (advanced && !entry?.tokens?.length)
    issues.push(`${where}: ${entry.status} requires tokens`);
  for (const prefix of entry?.tokens ?? [])
    if (![...tiers.keys()].some((name) => name.startsWith(prefix)))
      issues.push(`${where}: token prefix ${prefix} is not registered`);
  if (entry?.status === "RUNTIME_VERIFIED" && !entry?.evidence)
    issues.push(`${where}: RUNTIME_VERIFIED requires evidence`);
  if (advanced && !/^\d{4}-\d{2}-\d{2}$/.test(entry?.verifiedAt ?? ""))
    issues.push(`${where}: ${entry.status} requires verifiedAt (YYYY-MM-DD)`);
  return issues;
}

function validateEntry(entry, context) {
  const where = `${MAP_FILE}: ${entry?.id ?? "?"}`;
  return [
    ...validateEntryIdentity(entry, where, context.ids),
    ...validateEntryLinks(entry, where, context),
  ];
}

/** Strict schema validation for the Figma component map. */
export function checkComponentMap(map, { tiers, exists }) {
  if (!map) return [`${MAP_FILE}: missing`];
  const issues = [];
  if (map.schema !== "kk-studio.figma-component-map/1")
    issues.push(`${MAP_FILE}: unknown schema`);
  if (!/^[0-9a-zA-Z]{22,128}$/.test(map.fileKey ?? ""))
    issues.push(`${MAP_FILE}: invalid fileKey`);
  if (!Array.isArray(map.components))
    return [...issues, `${MAP_FILE}: components must be an array`];
  const context = { ids: new Set(), tiers, exists };
  for (const entry of map.components)
    issues.push(...validateEntry(entry, context));
  return issues;
}

/** Ratchet: new keys or higher counts fail; lower counts are reported as reductions. */
export function compareRatchet(current, baseline) {
  const regressions = [];
  const reductions = [];
  for (const [key, count] of current) {
    const allowed = baseline[key] ?? 0;
    if (count > allowed) regressions.push(`${key} (${allowed} -> ${count})`);
  }
  for (const [key, allowed] of Object.entries(baseline))
    if ((current.get(key) ?? 0) < allowed) reductions.push(key);
  return { regressions, reductions };
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

/** Run every check against a repository root. */
export function runTokenChecks(root) {
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const css = read("src/styles/tokens.css");
  const { tiers, findings } = checkLayering(css);
  const sources = walk(path.join(root, "src"))
    .filter((file) => /\.(css|tsx?)$/.test(file))
    .map((file) => ({
      name: path.relative(root, file).replaceAll("\\", "/"),
      content: fs.readFileSync(file, "utf8"),
    }));
  for (const [key, count] of checkPrimitiveLeaks(sources, tiers))
    addFinding(findings, key, count);
  for (const [key, count] of checkDrift(
    readJson(path.join(root, DTCG_FILE)),
    css,
  ))
    addFinding(findings, key, count);
  const strict = checkComponentMap(readJson(path.join(root, MAP_FILE)), {
    tiers,
    exists: (rel) => fs.existsSync(path.join(root, rel)),
  });
  for (const file of RETIRED_SOURCES)
    if (fs.existsSync(path.join(root, file)))
      strict.push(`${file}: retired token source must not exist (D-SYNC-02)`);
  return { findings, strict };
}
