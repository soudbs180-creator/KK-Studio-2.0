import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (relative: string) =>
  readFileSync(new URL(relative, root), "utf8");

test("the application imports the Figma governance token source before compatibility tokens", () => {
  const main = read("src/main.tsx");
  const tokensIndex = main.indexOf("./styles/tokens.css");
  const uiTokensIndex = main.indexOf("./styles/ui-tokens.css");

  assert.notEqual(
    tokensIndex,
    -1,
    "tokens.css must be loaded by the application",
  );
  assert.notEqual(
    uiTokensIndex,
    -1,
    "ui-tokens.css remains as a compatibility layer",
  );
  assert.ok(
    tokensIndex < uiTokensIndex,
    "governance tokens must load before compatibility aliases",
  );
});

test("canonical typography and control scales match the Figma governance page", () => {
  const tokens = read("src/styles/tokens.css");
  const expectedTokens = [
    "--kk-font-caption: 12px",
    "--kk-font-body: 16px",
    "--kk-font-body-strong: 16px",
    "--kk-font-subtitle: 16px",
    "--kk-font-title: 20px",
    "--kk-font-display: 28px",
    "--kk-line-caption: 16px",
    "--kk-line-body: 24px",
    "--kk-line-subtitle: 24px",
    "--kk-line-title: 28px",
    "--kk-line-display: 36px",
    "--kk-control-h-sm: 24px",
    "--kk-control-h-md: 32px",
    "--kk-control-h-lg: 40px",
    "--kk-icon-glyph-sm: 16px",
    "--kk-icon-glyph-md: 20px",
    "--kk-icon-glyph-lg: 24px",
  ];

  for (const token of expectedTokens) {
    assert.match(
      tokens,
      new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")),
      token,
    );
  }
  assert.doesNotMatch(
    tokens,
    /--kk-font-(?:caption|body|body-strong|subtitle|title|display):\s*(?:[0-9]|1[01])px/,
  );
});

test("Figma mapping dimensions are exposed as shared component tokens", () => {
  const tokens = read("src/styles/tokens.css");
  const expectedTokens = [
    "--kk-sidebar-width: 292px",
    "--kk-canvas-toolbar-h: 44px",
    "--kk-canvas-toolbar-tools-width: 254px",
    "--kk-canvas-browser-switch-w: 144px",
    "--kk-icon-glyph-xl: 28px",
    "--kk-icon-glyph-xxl: 32px",
    "--kk-generation-count-trigger-w: 40px",
    "--kk-generation-count-trigger-touch-w: 52px",
    "--kk-material-panel-width: 748px",
    "--kk-material-panel-compact-width: 308px",
    "--kk-material-range-row-compact-width: 280px",
    "--kk-material-range-row-expanded-width: 720px",
    "--kk-card-header-h: 36px",
    "--kk-card-header-action-h: 32px",
    "--kk-control-surface-idle: #1b1b1b",
    "--kk-control-surface-hover: #202020",
    "--kk-control-surface-selected: #252525",
    "--kk-control-surface-idle: #f7f7f7",
    "--kk-control-surface-hover: #f2f2f2",
    "--kk-control-surface-selected: #ededed",
    "--kk-motion-hover-fade: 650ms",
  ];

  for (const token of expectedTokens) {
    assert.match(
      tokens,
      new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")),
      token,
    );
  }

  const cssContracts = [
    ["src/styles/canvas-navigation.css", "var(--kk-canvas-toolbar-h)"],
    ["src/styles/generation-count.css", "var(--kk-generation-count-trigger-w)"],
    [
      "src/components/assets/assets.css",
      "var(--kk-material-panel-compact-width)",
    ],
    ["src/styles/sidebar.css", "var(--kk-sidebar-width)"],
    ["src/styles/conversation-panel.css", "var(--kk-card-header-action-h)"],
  ] as const;

  for (const [file, value] of cssContracts) {
    assert.ok(read(file).includes(value), `${file} must consume ${value}`);
  }
});

test("governance primitives define one button and icon contract", () => {
  assert.equal(existsSync(new URL("src/styles/ui-governance.css", root)), true);
  const governance = read("src/styles/ui-governance.css");
  assert.match(
    governance,
    /\.kk-button[^{]*\{[\s\S]*min-(?:height|block-size):\s*var\(--kk-button-h-standard\)/,
  );
  assert.match(
    governance,
    /\.kk-button\s*\{[^}]*border-radius:\s*var\(--kk-button-radius\)/,
  );
  assert.match(
    governance,
    /\.kk-icon-slot\[data-size="sm"\][^{]*\{[\s\S]*width:\s*var\(--kk-icon-glyph-sm\)/,
  );
  assert.match(governance, /\.kk-truncate-single/);

  // 8 canonical interaction states on .kk-button
  assert.match(governance, /\.kk-button:[^{]*:hover/);
  assert.match(governance, /\.kk-button:focus-visible/);
  assert.match(governance, /\.kk-button\[aria-selected="true"\]/);
  assert.match(governance, /\.kk-button\[aria-pressed="true"\]/);
  assert.match(governance, /\.kk-button:[^{]*:active/);
  assert.match(
    governance,
    /\.kk-button\.is-loading|\.kk-button\[aria-busy="true"\]/,
  );
  assert.match(
    governance,
    /\.kk-button:disabled|\.kk-button\[aria-disabled="true"\]/,
  );
  assert.match(governance, /\.kk-button\[aria-expanded="true"\]/);

  // Control height tiers (24, 32, 40)
  assert.match(governance, /\.kk-button--sm\s*\{[^}]*var\(--kk-control-h-sm\)/);
  assert.match(governance, /\.kk-button--md\s*\{[^}]*var\(--kk-control-h-md\)/);
  assert.match(governance, /\.kk-button--lg\s*\{[^}]*var\(--kk-control-h-lg\)/);
});

test("settings nav, channel tabs, and dialog close buttons implement explicit focus and interaction states", () => {
  const settings = read("src/components/settings/settings.css");
  assert.match(settings, /\.settings-nav-item:focus-visible/);
  assert.match(settings, /\.settings-nav-item:active/);
  assert.match(settings, /\.settings-close:focus-visible/);
  assert.match(settings, /\.settings-close:active/);
  assert.match(settings, /\.channel-tab-button:focus-visible/);
  assert.match(settings, /\.channel-tab-button:active/);

  const shortcuts = read("src/styles/shortcuts.css");
  assert.match(shortcuts, /\.shortcuts-close:focus-visible/);
  assert.match(shortcuts, /\.shortcuts-close:active/);

  const taskWorkbench = read("src/styles/task-workbench.css");
  assert.match(taskWorkbench, /\.task-workbench-close:focus-visible/);
  assert.match(taskWorkbench, /\.task-workbench-close:active/);

  const catalog = read("src/styles/catalog.css");
  assert.match(catalog, /\.catalog-close:focus-visible/);
  assert.match(catalog, /\.catalog-close:active/);
});
