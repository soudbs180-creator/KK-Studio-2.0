import { createHash } from "node:crypto";
import { parseCssScopes, cssContexts, getValue } from "./css.mjs";

const colorRoles = {
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
const dimension = /^-?(?:\d*\.)?\d+(?:px|em|rem)$/;

function projectColors(tokens, values, prefix) {
  for (const [role, variable] of Object.entries(colorRoles)) {
    const value = getValue(values, variable);
    if (value !== undefined) tokens.colors[prefix + role] = value;
  }
}

function projectTypography(values) {
  const typography = {};
  for (const role of [
    "caption",
    "body",
    "body-strong",
    "subtitle",
    "title",
    "display",
  ]) {
    const fontSize = getValue(values, `font-${role}`);
    if (!fontSize) continue;
    const entry = {
      fontFamily: getValue(values, "font-sans").replace(/\s+/g, " "),
      fontSize,
    };
    if (!dimension.test(fontSize))
      throw new Error(`Unsupported typography dimension ${fontSize}`);
    const line = getValue(values, `line-${role}`);
    if (
      line &&
      dimension.test(line) &&
      line.replace(/[\d.-]/g, "") === fontSize.replace(/[\d.-]/g, "")
    )
      entry.lineHeight = String(parseFloat(line) / parseFloat(fontSize));
    else if (line && /^\d*\.?\d+$/.test(line)) entry.lineHeight = line;
    else if (line)
      throw new Error(
        `Cannot project ${role} line height ${line} as a multiplier`,
      );
    const weight = getValue(values, `font-weight-${role}`);
    if (weight !== undefined) entry.fontWeight = Number(weight);
    typography[role] = entry;
  }
  return typography;
}

function projectDimensions(values) {
  const rounded = {};
  const spacing = {};
  for (const key of values.keys()) {
    const name = key.replace(/^--kk-/, "");
    const value = getValue(values, name);
    if (name.startsWith("radius-") && (dimension.test(value) || value === "0"))
      rounded[name === "radius-0" ? "none" : name.slice(7)] =
        value === "0" ? "0px" : value;
    if (
      /^(space-|layout-gutter-|control-px-|control-gap-|container-pad$)/.test(
        name,
      ) &&
      dimension.test(value)
    )
      spacing[name] = value;
  }
  return { rounded, spacing };
}

function component(
  tokens,
  values,
  prefix,
  background,
  text,
  height,
  radius,
  typography,
) {
  const entry = {};
  if (tokens.colors[prefix + background])
    entry.backgroundColor = `{colors.${prefix + background}}`;
  if (tokens.colors[prefix + text])
    entry.textColor = `{colors.${prefix + text}}`;
  const rounding = getValue(values, radius);
  if (rounding && (dimension.test(rounding) || rounding === "0")) {
    const value = rounding === "0" ? "0px" : rounding;
    const registered = Object.keys(tokens.rounded).find(
      (name) => tokens.rounded[name] === value,
    );
    entry.rounded = registered ? `{rounded.${registered}}` : value;
  }
  const size = getValue(values, height);
  if (size && dimension.test(size)) entry.height = size;
  if (typography && tokens.typography[typography])
    entry.typography = `{typography.${typography}}`;
  return entry;
}

function projectComponents(tokens, values, prefix) {
  const definitions = [
    [
      "button-primary",
      "button-primary",
      "on-button-primary",
      "button-h-primary",
      "button-radius",
      "body-strong",
    ],
    [
      "button-primary-hover",
      "button-primary-hover",
      "on-button-primary",
      "button-h-primary",
      "button-radius",
      "body-strong",
    ],
    [
      "button-secondary",
      "surface-container-high",
      "on-surface",
      "button-h-standard",
      "button-radius",
      "body-strong",
    ],
    ["input", "input", "on-surface", "input-h", "input-radius", "body"],
    [
      "icon-button",
      null,
      "on-surface-variant",
      "icon-button-h",
      "icon-button-radius",
    ],
  ];
  for (const [
    name,
    background,
    text,
    height,
    radius,
    typography,
  ] of definitions) {
    const entry = component(
      tokens,
      values,
      prefix,
      background,
      text,
      height,
      radius,
      typography,
    );
    if (name === "icon-button") {
      const padding = getValue(values, "space-1");
      if (padding) entry.padding = padding;
    }
    if (entry.textColor && (!background || entry.backgroundColor))
      tokens.components[prefix + name] = entry;
  }
}

function projectScopes(scopes) {
  const { base, light } = cssContexts(scopes);
  const tokens = {
    colors: {},
    typography: projectTypography(base),
    ...projectDimensions(base),
    components: {},
  };
  for (const [prefix, values] of [
    ["", base],
    ["light-", light],
  ]) {
    projectColors(tokens, values, prefix);
    projectComponents(tokens, values, prefix);
  }
  return tokens;
}

function pathsOf(tokens) {
  return Object.entries(tokens).flatMap(([category, entries]) =>
    Object.entries(entries).flatMap(([name, value]) =>
      typeof value === "object"
        ? Object.keys(value).map((property) => [category, name, property])
        : [[category, name]],
    ),
  );
}

export function managedPathsForScopes(scopes) {
  return pathsOf(projectScopes(scopes));
}

export function buildDesignTokens(css) {
  const scopes = parseCssScopes(css);
  const tokens = projectScopes(scopes);
  tokens["x-kk-studio"] = {
    source: "src/styles/tokens.css",
    sha256: createHash("sha256")
      .update(css.replace(/\r\n/g, "\n"))
      .digest("hex"),
    hashEncoding: "utf8-lf",
    scopes,
    managedPaths: pathsOf(tokens),
  };
  return tokens;
}
