import { isDeepStrictEqual } from "node:util";
import { lint } from "@google/design.md/linter";
import { parseDocument, isMap } from "yaml";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { buildDesignTokens, managedPathsForScopes } from "./model.mjs";

const categories = ["colors", "typography", "rounded", "spacing", "components"];
const sections = [
  "Overview",
  "Colors",
  "Typography",
  "Layout",
  "Elevation & Depth",
  "Shapes",
  "Components",
  "Do's and Don'ts",
];
const aliases = {
  "Brand & Style": "Overview",
  "Layout & Spacing": "Layout",
  Elevation: "Elevation & Depth",
};
const reference = /^\{([\w.-]+)\}$/;
const dimension = /^-?(?:\d*\.)?\d+(?:px|em|rem)$/;
const typographyProperties = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontFeature",
  "fontVariation",
];
const componentProperties = [
  "backgroundColor",
  "textColor",
  "typography",
  "rounded",
  "padding",
  "size",
  "height",
  "width",
];
const checkedColors = new Map();

function error(message, path = "document") {
  return { severity: "error", path, message };
}

function readDocument(markdown) {
  const match = /^(\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(
    markdown,
  );
  if (!match)
    throw new Error(
      "DESIGN.md requires YAML frontmatter fenced by standalone --- lines",
    );
  const document = parseDocument(match[2], {
    keepSourceTokens: true,
    uniqueKeys: true,
  });
  if (document.errors.length)
    throw new Error(document.errors.map((item) => item.message).join("; "));
  if (!isMap(document.contents))
    throw new Error("Frontmatter must be a YAML mapping");
  const data = document.toJS({ maxAliasCount: 100 });
  return {
    document,
    data,
    body: markdown.slice(match[0].length),
    bom: match[1] ?? "",
    eol: markdown.includes("\r\n") ? "\r\n" : "\n",
  };
}

function headingText(node) {
  return node.value ?? (node.children ?? []).map(headingText).join("");
}

function inspectSections(body) {
  const findings = [];
  const seen = new Set();
  let previous = -1;
  const nodes = unified().use(remarkParse).parse(body).children;
  for (const node of nodes) {
    if (node.type !== "heading" || node.depth !== 2) continue;
    const text = headingText(node).trim();
    const canonical = aliases[text] ?? text;
    const index = sections.indexOf(canonical);
    if (index < 0) continue;
    if (seen.has(canonical))
      findings.push(
        error(
          `Duplicate section ${canonical} (including aliases)`,
          `sections.${canonical}`,
        ),
      );
    if (index < previous)
      findings.push(
        error(
          `Section ${canonical} is out of the canonical order`,
          `sections.${canonical}`,
        ),
      );
    seen.add(canonical);
    previous = index;
  }
  return findings;
}

function valueAt(data, path) {
  let value = data;
  for (const key of path) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.hasOwn(value, key)
    )
      return undefined;
    value = value[key];
  }
  return value;
}

function inspectReferences(data) {
  const findings = [];
  const active = new Set();
  function resolve(value, path, trail = []) {
    if (typeof value !== "string" || !reference.test(value)) return;
    const target = value.match(reference)[1];
    if (trail.includes(target)) {
      findings.push(
        error(
          `Cyclic token reference ${[...trail, target].join(" -> ")}`,
          path,
        ),
      );
      return;
    }
    const next = valueAt(data, target.split("."));
    if (next === undefined) {
      findings.push(error(`Broken token reference ${value}`, path));
      return;
    }
    if (typeof next === "string" && reference.test(next))
      resolve(next, path, [...trail, target]);
    else findings.push(...inspectProperty(next, kindAt(path), path));
  }
  function visit(value, path) {
    if (value === null || typeof value !== "object") {
      resolve(value, path);
      return;
    }
    if (active.has(value)) {
      findings.push(error("Cyclic YAML alias", path));
      return;
    }
    active.add(value);
    for (const [key, child] of Object.entries(value))
      visit(child, path ? `${path}.${key}` : key);
    active.delete(value);
  }
  for (const category of categories) {
    if (["typography", "components"].includes(category)) {
      const properties =
        category === "typography" ? typographyProperties : componentProperties;
      for (const [name, value] of Object.entries(data[category] ?? {}))
        if (value && typeof value === "object")
          for (const key of properties)
            if (Object.hasOwn(value, key))
              visit(value[key], `${category}.${name}.${key}`);
    } else visit(data[category], category);
  }
  return findings;
}

function managedPaths(data) {
  const paths = data["x-kk-studio"]?.managedPaths ?? [];
  if (
    !Array.isArray(paths) ||
    paths.some(
      (entry) =>
        !Array.isArray(entry) ||
        ![2, 3].includes(entry.length) ||
        !categories.includes(entry[0]) ||
        entry.some(
          (key) =>
            typeof key !== "string" ||
            !key ||
            ["__proto__", "constructor", "prototype"].includes(key),
        ),
    )
  )
    throw new Error("Invalid x-kk-studio.managedPaths ownership manifest");
  if (data["x-kk-studio"]?.managedPaths !== undefined) {
    const scopes = data["x-kk-studio"].scopes;
    if (
      !Array.isArray(scopes) ||
      !isDeepStrictEqual(paths, managedPathsForScopes(scopes))
    )
      throw new Error(
        "Managed ownership manifest does not match the generated paths from recorded CSS scopes",
      );
  }
  return paths;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validColor(value) {
  if (!checkedColors.has(value)) {
    const report = lint(
      `---\nname: Color validation\ncolors:\n  primary: ${JSON.stringify(value)}\n---\n`,
    );
    checkedColors.set(value, report.summary.errors === 0);
  }
  return checkedColors.get(value);
}

function propertyKind(property) {
  if (["backgroundColor", "textColor"].includes(property)) return "color";
  if (
    [
      "fontSize",
      "letterSpacing",
      "rounded",
      "padding",
      "size",
      "height",
      "width",
    ].includes(property)
  )
    return "dimension";
  if (property === "fontWeight") return "weight";
  if (property === "lineHeight") return "line";
  if (property === "typography") return "typography";
  return "string";
}

function kindAt(path) {
  const parts = path.split(".");
  if (parts[0] === "colors") return "color";
  if (parts[0] === "rounded") return "dimension";
  if (parts[0] === "spacing") return "spacing";
  return propertyKind(parts.at(-1));
}

function inspectProperty(value, kind, path) {
  if (typeof value === "string" && reference.test(value)) return [];
  let valid;
  if (kind === "dimension")
    valid = typeof value === "string" && dimension.test(value);
  else if (kind === "color")
    valid = typeof value === "string" && validColor(value);
  else if (kind === "weight")
    valid =
      ["number", "string"].includes(typeof value) &&
      String(value).trim() !== "" &&
      Number.isFinite(Number(value));
  else if (kind === "line")
    valid =
      (typeof value === "string" && dimension.test(value)) ||
      (["number", "string"].includes(typeof value) &&
        /^\d*\.?\d+$/.test(String(value)) &&
        Number(value) > 0);
  else if (kind === "typography") valid = isRecord(value);
  else if (kind === "spacing")
    valid =
      typeof value === "string" ||
      (typeof value === "number" && Number.isFinite(value));
  else valid = typeof value === "string";
  return valid ? [] : [error(`Invalid ${kind} value at ${path}`, path)];
}

function inspectTypedGroups(data) {
  const findings = [];
  for (const [name, value] of Object.entries(data.colors ?? {}))
    findings.push(...inspectProperty(value, "color", `colors.${name}`));
  for (const [name, value] of Object.entries(data.rounded ?? {}))
    findings.push(...inspectProperty(value, "dimension", `rounded.${name}`));
  for (const [category, properties] of [
    ["typography", typographyProperties],
    ["components", componentProperties],
  ])
    for (const [name, entry] of Object.entries(data[category] ?? {})) {
      if (!isRecord(entry)) {
        findings.push(
          error(`${category}.${name} must be a mapping`, `${category}.${name}`),
        );
        continue;
      }
      for (const property of properties) {
        if (!Object.hasOwn(entry, property)) continue;
        findings.push(
          ...inspectProperty(
            entry[property],
            propertyKind(property),
            `${category}.${name}.${property}`,
          ),
        );
      }
    }
  return findings;
}

function inspectSchema(data) {
  const findings = [];
  if (typeof data.name !== "string" || !data.name.trim())
    findings.push(error("name must be a nonempty string", "name"));
  for (const key of ["version", "description"])
    if (data[key] !== undefined && typeof data[key] !== "string")
      findings.push(error(`${key} must be a string`, key));
  for (const key of categories)
    if (
      data[key] !== undefined &&
      (data[key] === null ||
        typeof data[key] !== "object" ||
        Array.isArray(data[key]))
    )
      findings.push(error(`${key} must be a mapping`, key));
  managedPaths(data);
  if (!findings.length) findings.push(...inspectTypedGroups(data));
  return findings;
}

function validateDocument(markdown) {
  const parsed = readDocument(markdown);
  const findings = [
    ...inspectSchema(parsed.data),
    ...inspectSections(parsed.body),
    ...inspectReferences(parsed.data),
  ];
  if (!findings.some((finding) => finding.severity === "error")) {
    const report = lint(markdown);
    findings.push(
      ...report.findings.map((finding) => ({
        ...finding,
        path: finding.path ?? "official",
      })),
    );
  }
  return { ...parsed, findings };
}

export function inspectDesignMarkdown(markdown, css) {
  const findings = [];
  let tokens;
  try {
    tokens = buildDesignTokens(css);
  } catch (cause) {
    findings.push(error(cause.message, "css"));
  }
  try {
    const parsed = validateDocument(markdown);
    findings.push(...parsed.findings);
    if (tokens) {
      for (const category of categories) {
        const paths = tokens["x-kk-studio"].managedPaths.filter(
          (entry) => entry[0] === category,
        );
        if (
          paths.some(
            (entry) =>
              !isDeepStrictEqual(
                valueAt(parsed.data, entry),
                valueAt(tokens, entry),
              ),
          )
        )
          findings.push(
            error(
              `Generated ${category} drifted from tokens.css; run design:sync`,
              category,
            ),
          );
      }
      if (!isDeepStrictEqual(parsed.data["x-kk-studio"], tokens["x-kk-studio"]))
        findings.push(
          error(
            "Runtime CSS projection or managed paths drifted; run design:sync",
            "x-kk-studio",
          ),
        );
    }
  } catch (cause) {
    findings.push(error(cause.message));
  }
  return { findings, tokens };
}

export function syncDesignMarkdown(markdown, css) {
  const parsed = validateDocument(markdown);
  const invalid = parsed.findings.filter(
    (finding) => finding.severity === "error",
  );
  if (invalid.length)
    throw new Error(
      invalid
        .map((finding) => `${finding.path}: ${finding.message}`)
        .join("; "),
    );
  const tokens = buildDesignTokens(css);
  const document = parsed.document;
  const nextPaths = tokens["x-kk-studio"].managedPaths;
  for (const entry of managedPaths(parsed.data))
    if (!nextPaths.some((next) => isDeepStrictEqual(entry, next)))
      document.deleteIn(entry);
  for (const category of categories)
    if (!document.has(category))
      document.set(category, document.createNode({}));
  for (const entry of nextPaths) document.setIn(entry, valueAt(tokens, entry));
  document.set("x-kk-studio", document.createNode(tokens["x-kk-studio"]));
  const yaml = document
    .toString({ lineWidth: 0 })
    .replace(/\r?\n/g, parsed.eol);
  const next = `${parsed.bom}---${parsed.eol}${yaml}---${parsed.body}`;
  const errors = inspectDesignMarkdown(next, css).findings.filter(
    (finding) => finding.severity === "error",
  );
  if (errors.length)
    throw new Error(errors.map((finding) => finding.message).join("; "));
  return next;
}
