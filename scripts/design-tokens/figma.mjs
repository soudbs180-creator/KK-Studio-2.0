// Figma snapshot (scripts/figma-audit/pull.mjs output) -> DTCG token file ->
// generated CSS. Pure functions; file IO lives in cli.mjs.
import {
  TIER_COLLECTIONS,
  collectionTier,
  figmaToCssVar,
  normalizeCollection,
} from "./naming.mjs";

export const DTCG_SCHEMA = "kk-studio.figma-tokens/1";
const UNITLESS =
  /(?:^|-)(?:weight|opacity|z|ratio|scale|line-height-ratio)(?:-|$)/;
const DURATION = /(?:^|-)(?:duration|delay)(?:-|$)/;

function hexByte(value) {
  return Math.round(Math.min(1, Math.max(0, value)) * 255)
    .toString(16)
    .padStart(2, "0");
}

export function colorToHex({ r, g, b, a = 1 }) {
  const hex = `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;
  return a >= 1 ? hex : `${hex}${hexByte(a)}`;
}

function dtcgType(resolvedType) {
  return (
    { COLOR: "color", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" }[
      resolvedType
    ] ?? "string"
  );
}

function convertValue(raw, resolvedType, namesById) {
  if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
    const target = namesById.get(raw.id);
    if (!target) throw new Error(`Unresolved Figma alias ${raw.id}`);
    return `{${target}}`;
  }
  if (resolvedType === "COLOR") return colorToHex(raw);
  return raw;
}

function modeNames(collection) {
  return new Map(
    (collection?.modes ?? []).map((mode) => [
      mode.modeId,
      normalizeCollection(mode.name),
    ]),
  );
}

function indexVariables(snapshot) {
  const variables = snapshot?.variables?.variables ?? {};
  const collections = snapshot?.variables?.collections ?? {};
  const namesById = new Map();
  const collectionOf = (variable) => {
    const entry = Object.values(collections).find(
      (item) =>
        normalizeCollection(item?.name) ===
        normalizeCollection(variable.collection),
    );
    return entry ?? null;
  };
  for (const [name, variable] of Object.entries(variables))
    namesById.set(
      variable.id,
      `${normalizeCollection(variable.collection)}.${name.replaceAll("/", ".")}`,
    );
  return { variables, namesById, collectionOf };
}

/** Convert a Figma snapshot into a deterministic DTCG token document. */
export function snapshotToDtcg(snapshot) {
  const { variables, namesById, collectionOf } = indexVariables(snapshot);
  const tokens = {};
  const warnings = [];
  const seen = new Map();
  for (const name of Object.keys(variables).sort()) {
    const variable = variables[name];
    const collectionName = normalizeCollection(variable.collection);
    if (!collectionTier(collectionName))
      warnings.push(
        `Collection "${variable.collection}" is not one of ${TIER_COLLECTIONS.join("/")}`,
      );
    const cssVar = figmaToCssVar(name);
    if (seen.has(cssVar))
      throw new Error(
        `Token collision: "${name}" and "${seen.get(cssVar)}" both map to ${cssVar}`,
      );
    seen.set(cssVar, name);
    const collection = collectionOf(variable);
    const modes = modeNames(collection);
    const values = {};
    for (const [modeId, raw] of Object.entries(variable.valuesByMode ?? {}))
      values[modes.get(modeId) ?? modeId] = convertValue(
        raw,
        variable.type,
        namesById,
      );
    const defaultMode =
      modes.get(collection?.defaultModeId) ?? Object.keys(values)[0];
    const leaf = {
      $type: dtcgType(variable.type),
      $value: values[defaultMode],
      $extensions: {
        "kk.cssVar": cssVar,
        "kk.figmaId": variable.id,
        "kk.modes": values,
      },
    };
    const group = (tokens[collectionName] ??= {});
    const path = name.split("/");
    let cursor = group;
    for (const segment of path.slice(0, -1)) cursor = cursor[segment] ??= {};
    cursor[path.at(-1)] = leaf;
  }
  return {
    document: {
      $schema: DTCG_SCHEMA,
      $extensions: {
        "kk.source": {
          fileKey: snapshot.fileKey ?? null,
          version: snapshot.version ?? null,
          lastModified: snapshot.lastModified ?? null,
        },
      },
      ...tokens,
    },
    warnings,
  };
}

/** Flatten a DTCG document into [{ cssVar, tier, type, modes }]. */
export function flattenDtcg(document) {
  const result = [];
  const visit = (node, tier) => {
    if (!node || typeof node !== "object") return;
    if ("$value" in node) {
      result.push({
        cssVar: node.$extensions?.["kk.cssVar"],
        tier,
        type: node.$type,
        modes: node.$extensions?.["kk.modes"] ?? { default: node.$value },
      });
      return;
    }
    for (const [key, child] of Object.entries(node))
      if (!key.startsWith("$")) visit(child, tier);
  };
  for (const [collection, group] of Object.entries(document ?? {}))
    if (!collection.startsWith("$")) visit(group, collectionTier(collection));
  return result.filter((token) => token.cssVar);
}

function aliasToVar(value) {
  const match = /^\{([^}]+)\}$/.exec(String(value));
  if (!match) return null;
  const [, ...path] = match[1].split(".");
  return `var(${figmaToCssVar(path.join("/"))})`;
}

/** Format a token value the way it must appear in CSS. */
export function cssValue(token, value) {
  const alias = aliasToVar(value);
  if (alias) return alias;
  if (token.type !== "number") return String(value);
  if (DURATION.test(token.cssVar)) return `${value}ms`;
  if (UNITLESS.test(token.cssVar)) return String(value);
  return `${value}px`;
}

const MODE_SELECTOR = { default: ":root", dark: ":root" };

export function selectorForMode(mode) {
  return MODE_SELECTOR[mode] ?? `[data-theme="${mode}"]`;
}

/** Render the generated CSS layer. Output is stable for identical input. */
export function renderCss(document) {
  const blocks = new Map();
  for (const token of flattenDtcg(document)) {
    const modes = Object.entries(token.modes);
    for (const [mode, value] of modes) {
      const selector = modes.length === 1 ? ":root" : selectorForMode(mode);
      if (!blocks.has(selector)) blocks.set(selector, []);
      blocks
        .get(selector)
        .push(`  ${token.cssVar}: ${cssValue(token, value)};`);
    }
  }
  const header = [
    "/* GENERATED by `npm run tokens:css` from design/tokens/figma.tokens.json.",
    " * Do not edit by hand. Source of truth: Figma variables (docs/FIGMA-SYNC.md). */",
  ];
  const body = [...blocks].map(
    ([selector, lines]) => `${selector} {\n${lines.join("\n")}\n}`,
  );
  return `${[...header, "", ...body].join("\n")}\n`;
}
