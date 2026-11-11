import fs from "node:fs";
import path from "node:path";

// Shared registry of Figma sources. The authoritative file key and the node
// IDs that carry the current contract live in docs/UI_INDEX.md; this file only
// mirrors them in machine-readable form so tooling never has to parse prose.
export const SOURCES = {
  "kk-studio-current": {
    fileKey: "ZiadpErDoFweCjG3uHjkM3",
    fileName: "KK Studio · 最新 UI 全量编辑稿 · 2026-10-20",
    pages: {
      "01-design-spec": "91:2",
      "02-icons-brand": "91:4",
      "03-components": "91:3",
      "04-desktop": "2:47",
      "05-mobile": "91:11",
    },
    registeredNodes: [
      "546:21",
      "546:134",
      "546:156",
      "546:181",
      "546:184",
      "546:187",
      "597:67456",
      "1510:41557",
      "1514:90390",
      "1761:277",
      "2000:273",
      "2001:273",
      "2002:41259",
      "2022:41388",
      "2028:41424",
    ],
    authority: "docs/UI_INDEX.md",
  },
};

export const DEFAULT_SOURCE = "kk-studio-current";

export function resolveSource(name) {
  const source = SOURCES[name];
  if (!source)
    throw new Error(
      `Unknown source "${name}". Known: ${Object.keys(SOURCES).join(", ")}`,
    );
  return source;
}

export function snapshotDirectory(repository) {
  return path.join(repository, "docs", "reference", "figma-snapshots");
}

export function snapshotPath(repository, source, label) {
  return path.join(snapshotDirectory(repository), `${source}--${label}.json`);
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}

// Normalizes a Figma REST color payload (0..1 floats) into a hex string so it
// can be compared against CSS token values.
export function toHex(rgb, alpha) {
  const channel = (value) =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, "0");
  const base = `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
  if (alpha === undefined || alpha === 1) return base;
  return `${base}${channel(alpha)}`;
}

export function normalizeColor(value) {
  if (typeof value !== "string") return undefined;
  const text = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{8}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text))
    return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
  return text;
}

// Parses the Figma REST "fills"/"strokes" payload of a node into a flat list
// of { property, value } entries the differ can compare against CSS.
export function readPaints(node, property) {
  const paints = node?.[property];
  if (!Array.isArray(paints)) return [];
  const values = [];
  for (const paint of paints) {
    if (paint.visible === false) continue;
    if (paint.type === "SOLID" && paint.color)
      values.push({
        kind: "solid",
        value: toHex(
          paint.color,
          paint.opacity === undefined ? 1 : paint.opacity,
        ),
      });
    else if (paint.type === "GRADIENT")
      values.push({ kind: "gradient", value: paint.gradientHandlePositions });
  }
  return values;
}

// Extracts the typography subset the audit compares against local font tokens.
function readTextStyle(style) {
  if (!style) return null;
  return {
    fontFamily: style.fontFamily ?? null,
    fontWeight: style.fontWeight ?? null,
    fontSize: style.fontSize ?? null,
    lineHeightPx: style.lineHeightPx ?? null,
    letterSpacing: style.letterSpacing ?? null,
    textAlignHorizontal: style.textAlignHorizontal ?? null,
  };
}

// Flattens a Figma REST node into the comparable subset the audit cares about.
export function flattenNode(node) {
  if (!node || !node.id) return null;
  const bounds = node.absoluteBoundingBox ?? {};
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible !== false,
    width: bounds.width ?? null,
    height: bounds.height ?? null,
    x: bounds.x ?? null,
    y: bounds.y ?? null,
    fills: readPaints(node, "fills"),
    strokes: readPaints(node, "strokes"),
    strokeWeight: node.strokeWeight ?? null,
    cornerRadius: node.cornerRadius ?? node.rectangleCornerRadii ?? null,
    opacity: node.opacity ?? 1,
    characters: node.characters ?? null,
    style: readTextStyle(node.style),
    componentKey: node.componentKey ?? null,
    componentProperties: node.componentProperties ?? null,
  };
}

// Walks a REST /nodes tree and returns the flattened leaves.
export function collectNodes(document) {
  const result = [];
  const visit = (node, depth) => {
    if (!node) return;
    const flat = flattenNode(node);
    if (flat) result.push({ ...flat, depth });
    for (const child of node.children ?? []) visit(child, depth + 1);
  };
  visit(document, 0);
  return result;
}
