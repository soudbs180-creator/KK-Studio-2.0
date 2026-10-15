import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { ACCENTS, contrast, themeTokens } from "../helpers/designSystem.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cli = path.join(root, "scripts/design-md/cli.mjs");
const css = `:root {
  --kk-accent: #21a673;
  --kk-on-accent: #0a0a0a;
  --kk-bg-app: #0a0a0a;
  --kk-bg-surface: #161616;
  --kk-bg-card: #1a1a1a;
  --kk-text-primary: #dbdbdb;
  --kk-button-primary-bg: #e9e9e9;
  --kk-button-primary-hover: #ffffff;
  --kk-button-primary-text: #161616;
  --kk-font-sans: "Inter", system-ui, sans-serif;
  --kk-font-body: 14px;
  --kk-line-body: 20px;
  --kk-font-weight-body: 400;
  --kk-radius-control: 8px;
  --kk-radius-full: 999px;
  --kk-radius-0: 0;
  --kk-space-1: 4px;
  --kk-control-px-md: 12px;
  --kk-button-radius: var(--kk-radius-full);
  --kk-button-h-standard: 32px;
  --kk-button-h-primary: 40px;
  --kk-raw-calc: calc(100dvh - 20px);
}
[data-theme="light"] {
  --kk-bg-surface: #ffffff;
  --kk-text-primary: #252525;
  --kk-button-primary-bg: #252525;
  --kk-button-primary-text: #ffffff;
}
[data-accent="blue"], [data-accent="green"] {
  --kk-focus-ring: var(--kk-accent);
}
@media (max-width: 767px) {
  :root { --kk-container-pad: 16px; }
}`;
const body =
  "\r\n\r\n## Overview\r\nHuman prose stays exact.\r\n\r\n## Iconography\r\n```md\r\n## Colors\r\n## Colors\r\n```\r\n";
const original = `---\r\nname: Custom name # keep name comment\r\nversion: alpha\r\ndescription: A human description\r\n# keep extension comment\r\nx-team:\r\n  note: 'human choice' # keep nested comment\r\n  palette: [red, blue]\r\n---${body}`;

async function api() {
  return {
    ...(await import("../../scripts/design-md/model.mjs")),
    ...(await import("../../scripts/design-md/document.mjs")),
  };
}

test("integration preserves approved runtime tokens and registered dimensions", async () => {
  const { buildDesignTokens } = await api();
  const source = fs.readFileSync(
    path.join(root, "src/styles/tokens.css"),
    "utf8",
  );
  // A new token baseline requires source review; sync alone cannot approve it.
  const approvedHash =
    "741f1739101b5cb1d407b65929a9e133d9a363390239a066005d95ee4d5d8138";
  assert.equal(
    createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex"),
    approvedHash,
  );
  const tokens = buildDesignTokens(source);
  assert.equal(tokens["x-kk-studio"].sha256, approvedHash);
  assert.equal(tokens["x-kk-studio"].hashEncoding, "utf8-lf");
  assert.equal(tokens.components["button-primary"].height, "40px");
  assert.equal(tokens.components["button-secondary"].height, "32px");
  assert.equal(tokens.components.input.height, "32px");
  assert.equal(tokens.components["icon-button"].height, "32px");
  for (const theme of ["dark", "light"])
    for (const accent of ACCENTS) {
      const token = themeTokens(theme, accent);
      for (const surface of [
        "--kk-bg-app",
        "--kk-bg-surface",
        "--kk-bg-elevated",
      ])
        for (const text of [
          "--kk-text-primary",
          "--kk-text-secondary",
          "--kk-text-tertiary",
        ])
          assert.ok(
            contrast(token(text), token(surface)) >= 4.5,
            `${theme}/${accent}: ${text} on ${surface}`,
          );
      assert.ok(
        contrast(
          token("--kk-button-primary-text"),
          token("--kk-button-primary-bg"),
        ) >= 4.5,
      );
    }
});

test("source identity and generated checks survive Windows and Linux line endings", async () => {
  const { buildDesignTokens, syncDesignMarkdown, inspectDesignMarkdown } =
    await api();
  const unix = css.replace(/\r\n/g, "\n");
  const windows = unix.replace(/\n/g, "\r\n");
  assert.equal(
    buildDesignTokens(unix)["x-kk-studio"].sha256,
    buildDesignTokens(windows)["x-kk-studio"].sha256,
  );
  const synced = syncDesignMarkdown(original, windows);
  assert.deepEqual(
    inspectDesignMarkdown(synced, unix).findings.filter(
      (finding) => finding.severity === "error",
    ),
    [],
  );
});

test("portable CSS declaration projection reconstructs selectors, media and importance losslessly", async () => {
  const { buildDesignTokens } = await api();
  const { parseCssScopes } = await import("../../scripts/design-md/css.mjs");
  const source = `${css}\n@media (min-width: 768px) { :root { --kk-space-1: 8px !important; --kk-roundtrip: var(--missing, rgb(1, 2, 3)); } }`;
  const markdown = `---\n${stringify(buildDesignTokens(source))}---\n`;
  const scopes = parse(markdown.split("---")[1])["x-kk-studio"].scopes;
  const restored = scopes
    .map(({ selector, atRules, declarations }) => {
      let rule = `${selector} { ${declarations.map(({ property, value, important }) => `${property}: ${value}${important ? " !important" : ""};`).join(" ")} }`;
      for (const atRule of [...atRules].reverse())
        rule = `${atRule} { ${rule} }`;
      return rule;
    })
    .join("\n");
  assert.deepEqual(parseCssScopes(restored), parseCssScopes(source));
  assert.equal(scopes.at(-1).declarations[0].important, true);
  assert.equal(
    scopes.at(-1).declarations[1].value,
    "var(--missing, rgb(1, 2, 3))",
  );
});

test("projection keeps the brand accent distinct from neutral primary buttons and light values", async () => {
  const { buildDesignTokens } = await api();
  const tokens = buildDesignTokens(css);
  assert.equal(tokens.colors.primary, "#21a673");
  assert.equal(tokens.colors["button-primary"], "#e9e9e9");
  assert.equal(tokens.colors["light-button-primary"], "#252525");
  assert.equal(
    tokens.components["button-primary"].backgroundColor,
    "{colors.button-primary}",
  );
  assert.equal(
    tokens.components["light-button-primary"].textColor,
    "{colors.light-on-button-primary}",
  );
  assert.equal(
    tokens.typography.body.fontFamily,
    '"Inter", system-ui, sans-serif',
  );
  assert.equal(tokens.typography.body.lineHeight, String(20 / 14));
  assert.equal(tokens.rounded.none, "0px");
  assert.equal(tokens.spacing["space-1"], "4px");
});

test("runtime extension covers multi-selectors and media declarations without inventing a theme schema", async () => {
  const { buildDesignTokens } = await api();
  const runtime = buildDesignTokens(css)["x-kk-studio"];
  assert.ok(
    runtime.scopes.some(
      (scope) =>
        scope.selector.includes('data-accent="blue"') &&
        scope.selector.includes('data-accent="green"'),
    ),
  );
  assert.ok(
    runtime.scopes.some(
      (scope) =>
        scope.atRules.includes("@media (max-width: 767px)") &&
        scope.declarations.some(
          (declaration) =>
            declaration.property === "--kk-container-pad" &&
            declaration.value === "16px",
        ),
    ),
  );
  assert.ok(
    runtime.scopes[0].declarations.some(
      (declaration) =>
        declaration.property === "--kk-raw-calc" &&
        declaration.value === "calc(100dvh - 20px)",
    ),
  );
});

test("portable input and icon controls retain their actual shared control semantics", async () => {
  const { buildDesignTokens } = await api();
  const tokens = buildDesignTokens(
    fs.readFileSync(path.join(root, "src/styles/tokens.css"), "utf8"),
  );
  assert.equal(tokens.components.input.typography, "{typography.body}");
  assert.equal(tokens.typography.body.fontWeight, 400);
  assert.equal(
    tokens.components["icon-button"].textColor,
    "{colors.on-surface-variant}",
  );
  assert.equal(tokens.components["icon-button"].backgroundColor, undefined);
  assert.equal(tokens.components["icon-button"].typography, undefined);
  assert.equal(tokens.components["icon-button"].padding, "4px");
  assert.equal(
    tokens.components["button-primary"].typography,
    "{typography.body-strong}",
  );
  assert.equal(tokens.components["button-primary"].padding, undefined);
});

test("CSS variables resolve fallback commas and inherited references without using an unused fallback", async () => {
  const { buildDesignTokens } = await api();
  const changed = css.replace(
    "--kk-accent: #21a673;",
    "--kk-base: #21a673; --kk-accent: var(--kk-base, var(--missing));",
  );
  assert.equal(buildDesignTokens(changed).colors.primary, "#21a673");
  assert.doesNotThrow(() =>
    buildDesignTokens(
      `${css}\n:root { --kk-fallback: var(--missing, rgb(1, 2, 3)); --kk-literal: 'var(--not-a-reference)'; }`,
    ),
  );
});

test("CSS validation combines declarations in overlapping theme, accent, density and media contexts", async () => {
  const { buildDesignTokens } = await api();
  const base = `${css}\n:root { --kk-a: red; --kk-b: blue; }`;
  for (const extra of [
    '[data-theme="light"] { --kk-a: var(--kk-b); } [data-theme="light"] { --kk-b: var(--kk-a); }',
    '[data-theme="light"] { --kk-a: var(--kk-b); } [data-accent="blue"] { --kk-b: var(--kk-a); }',
    '[data-density="compact"] { --kk-a: var(--kk-b); } @media (max-width: 767px) { :root { --kk-b: var(--kk-a); } }',
  ])
    assert.throws(() => buildDesignTokens(base + extra), /[Cc]yclic/);
});

test("unused fallbacks still cannot create CSS variable dependency cycles", async () => {
  const { buildDesignTokens } = await api();
  assert.throws(
    () =>
      buildDesignTokens(
        `${css}\n:root { --kk-cycle: var(--kk-accent, var(--kk-cycle)); }`,
      ),
    /[Cc]yclic/,
  );
  assert.doesNotThrow(() =>
    buildDesignTokens(
      `${css}\n:root { --kk-repeat: var(--kk-accent, var(--kk-accent)); }`,
    ),
  );
});

test("component role overrides follow CSS rather than fixed radius names", async () => {
  const { buildDesignTokens } = await api();
  const changed = css.replace(
    "--kk-button-radius: var(--kk-radius-full);",
    "--kk-button-radius: var(--kk-radius-control);",
  );
  assert.equal(
    buildDesignTokens(changed).components["button-primary"].rounded,
    "{rounded.control}",
  );
});

for (const [name, extra] of [
  ["missing", ":root { --kk-fault: var(--undefined); }"],
  ["cyclic", ":root { --kk-a: var(--kk-b); --kk-b: var(--kk-a); }"],
  [
    "scoped cycle",
    '[data-theme="light"] { --kk-a: var(--kk-b); --kk-b: var(--kk-a); }',
  ],
  ["malformed CSS", ":root { --kk-fault: red;"],
]) {
  test(`projection rejects ${name} CSS references or syntax`, async () => {
    const { buildDesignTokens } = await api();
    assert.throws(() => buildDesignTokens(css + extra));
  });
}

test("sync preserves human metadata, unknown YAML/comments and the exact body, then is idempotent", async () => {
  const { syncDesignMarkdown, inspectDesignMarkdown } = await api();
  const next = syncDesignMarkdown(original, css);
  assert.ok(next.endsWith(body));
  for (const comment of [
    "# keep name comment",
    "# keep extension comment",
    "# keep nested comment",
  ])
    assert.ok(next.includes(comment));
  const frontmatter = parse(next.split("---")[1]);
  assert.equal(frontmatter.name, "Custom name");
  assert.equal(frontmatter.description, "A human description");
  assert.deepEqual(frontmatter["x-team"], {
    note: "human choice",
    palette: ["red", "blue"],
  });
  assert.equal(syncDesignMarkdown(next, css), next);
  assert.deepEqual(
    inspectDesignMarkdown(next, css).findings.filter(
      (finding) => finding.severity === "error",
    ),
    [],
  );
});

test("check reports CSS and generated-token drift without changing document bytes", async () => {
  const { syncDesignMarkdown, inspectDesignMarkdown } = await api();
  const next = syncDesignMarkdown(original, css);
  const errors = inspectDesignMarkdown(
    next,
    css.replace("#21a673", "#000000"),
  ).findings;
  assert.ok(
    errors.some(
      (finding) => finding.severity === "error" && finding.path === "colors",
    ),
  );
  assert.ok(
    inspectDesignMarkdown(
      next.replace("#e9e9e9", "#eeeeee"),
      css,
    ).findings.some((finding) => finding.severity === "error"),
  );
});

test("sync preserves custom tokens and component properties inside managed groups", async () => {
  const { syncDesignMarkdown, inspectDesignMarkdown } = await api();
  const next = syncDesignMarkdown(original, css)
    .replace(
      "colors:",
      "colors:\n  custom-brand: '#123456' # keep custom color",
    )
    .replace(
      /components:\r?\n {2}button-primary:/,
      "components:\n  button-primary:\n    borderColor: '#345678' # keep custom property",
    );
  const synced = syncDesignMarkdown(next, css);
  assert.ok(synced.includes("# keep custom color"));
  assert.ok(synced.includes("# keep custom property"));
  const data = parse(synced.split("---")[1]);
  assert.equal(data.colors["custom-brand"], "#123456");
  assert.equal(data.components["button-primary"].borderColor, "#345678");
  assert.deepEqual(
    inspectDesignMarkdown(synced, css).findings.filter(
      (finding) => finding.severity === "error",
    ),
    [],
  );
});

test("sync removes obsolete generated paths instead of mistaking them for custom tokens", async () => {
  const { syncDesignMarkdown } = await api();
  const next = syncDesignMarkdown(original, css);
  const changed = syncDesignMarkdown(
    next,
    css.replace("--kk-space-1: 4px;", ""),
  );
  assert.equal(parse(changed.split("---")[1]).spacing["space-1"], undefined);
});

test("forged ownership cannot delete an unmanaged custom token", async () => {
  const { syncDesignMarkdown } = await api();
  const synced = syncDesignMarkdown(original, css);
  const data = parse(synced.split("---")[1]);
  data.colors["custom-brand"] = "#123456";
  data["x-kk-studio"].managedPaths.push(["colors", "custom-brand"]);
  const forged = `---\n${stringify(data)}---${body}`;
  assert.throws(
    () => syncDesignMarkdown(forged, css),
    /[Mm]anaged|[Oo]wnership/,
  );
});

test("opaque extension literals are preserved without being interpreted as token references", async () => {
  const { syncDesignMarkdown } = await api();
  const source = original.replace(
    "x-team:",
    "x-plugin: { note: '{not.a.token}' }\r\nx-team:",
  );
  const synced = syncDesignMarkdown(source, css);
  assert.equal(parse(synced.split("---")[1])["x-plugin"].note, "{not.a.token}");
});

for (const value of [42, "40", "banana", true, null, []]) {
  test(`known component dimensions reject ${JSON.stringify(value)} instead of upstream permissive recovery`, async () => {
    const { syncDesignMarkdown } = await api();
    const data = { name: "Invalid", components: { custom: { height: value } } };
    assert.throws(() =>
      syncDesignMarkdown(`---\n${stringify(data)}---\n`, css),
    );
  });
}

test("a standard component must be a property mapping", async () => {
  const { syncDesignMarkdown } = await api();
  assert.throws(() =>
    syncDesignMarkdown(
      "---\nname: Invalid\ncomponents:\n  custom: 42\n---\n",
      css,
    ),
  );
});

for (const [property, value] of [
  ["height", "{typography.body}"],
  ["typography", "{colors.primary}"],
  ["backgroundColor", "banana"],
]) {
  test(`standard ${property} rejects a value with the wrong resolved token type`, async () => {
    const { syncDesignMarkdown } = await api();
    const data = {
      name: "Invalid",
      colors: { primary: "#ffffff" },
      typography: { body: { fontFamily: "Inter", fontSize: "14px" } },
      components: { custom: { [property]: value } },
    };
    assert.throws(() =>
      syncDesignMarkdown(`---\n${stringify(data)}---\n`, css),
    );
  });
}

for (const [name, markdown] of [
  ["malformed YAML", "---\nname: [\n---\n## Overview\n"],
  ["duplicate YAML keys", "---\nname: A\nname: B\n---\n"],
  ["duplicate aliased section", original + "\n## Brand & Style\n"],
  ["out-of-order sections", original + "\n## Typography\n\n## Colors\n"],
  [
    "broken reference",
    original.replace(
      "x-team:",
      'colors:\r\n  custom: "{colors.missing}"\r\nx-team:',
    ),
  ],
  [
    "cyclic reference",
    original.replace(
      "x-team:",
      'colors:\r\n  a: "{colors.b}"\r\n  b: "{colors.a}"\r\nx-team:',
    ),
  ],
]) {
  test(`sync refuses ${name} instead of replacing invalid input`, async () => {
    const { syncDesignMarkdown, inspectDesignMarkdown } = await api();
    assert.throws(() => syncDesignMarkdown(markdown, css));
    assert.ok(
      inspectDesignMarkdown(markdown, css).findings.some(
        (finding) => finding.severity === "error",
      ),
    );
  });
}

test("CLI check is read-only, sync is repeatable, and invalid originals stay untouched", async (t) => {
  const { syncDesignMarkdown } = await api();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kk-design-md-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "DESIGN.md");
  const cssFile = path.join(directory, "tokens.css");
  fs.writeFileSync(file, original);
  fs.writeFileSync(cssFile, css);
  const run = (command: string) =>
    spawnSync(
      process.execPath,
      [cli, command, "--file", file, "--css", cssFile],
      { cwd: root, encoding: "utf8" },
    );
  assert.notEqual(run("check").status, 0);
  assert.equal(fs.readFileSync(file, "utf8"), original);
  assert.equal(run("sync").status, 0);
  assert.equal(
    fs.readFileSync(file, "utf8"),
    syncDesignMarkdown(original, css),
  );
  const stat = fs.statSync(file);
  assert.equal(run("check").status, 0);
  assert.equal(run("sync").status, 0);
  assert.equal(fs.statSync(file).mtimeMs, stat.mtimeMs);
  const invalid = "---\nname: [\n---\n";
  fs.writeFileSync(file, invalid);
  assert.notEqual(run("sync").status, 0);
  assert.equal(fs.readFileSync(file, "utf8"), invalid);
  assert.deepEqual(fs.readdirSync(directory).sort(), [
    "DESIGN.md",
    "tokens.css",
  ]);
});

test("atomic replacement rejects a concurrent document change", async (t) => {
  const { replaceDesignMarkdown } =
    await import("../../scripts/design-md/cli.mjs");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kk-design-cas-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "DESIGN.md");
  fs.writeFileSync(file, "new editor content");
  assert.throws(
    () => replaceDesignMarkdown(file, "old content", "generated content"),
    /changed/i,
  );
  assert.equal(fs.readFileSync(file, "utf8"), "new editor content");
  assert.deepEqual(fs.readdirSync(directory), ["DESIGN.md"]);
});
