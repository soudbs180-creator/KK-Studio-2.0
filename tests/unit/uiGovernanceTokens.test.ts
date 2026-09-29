import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, root), "utf8");

test("the application imports the Figma governance token source before compatibility tokens", () => {
  const main = read("src/main.tsx");
  const tokensIndex = main.indexOf('./styles/tokens.css');
  const uiTokensIndex = main.indexOf('./styles/ui-tokens.css');

  assert.notEqual(tokensIndex, -1, "tokens.css must be loaded by the application");
  assert.notEqual(uiTokensIndex, -1, "ui-tokens.css remains as a compatibility layer");
  assert.ok(tokensIndex < uiTokensIndex, "governance tokens must load before compatibility aliases");
});

test("canonical typography and control scales match the Figma governance page", () => {
  const tokens = read("src/styles/tokens.css");
  const expectedTokens = [
    "--kk-font-caption: 12px",
    "--kk-font-body: 14px",
    "--kk-font-body-strong: 14px",
    "--kk-font-subtitle: 16px",
    "--kk-font-title: 20px",
    "--kk-font-display: 26px",
    "--kk-line-caption: 16px",
    "--kk-line-body: 20px",
    "--kk-line-subtitle: 24px",
    "--kk-line-title: 28px",
    "--kk-line-display: 32px",
    "--kk-control-h-sm: 24px",
    "--kk-control-h-md: 32px",
    "--kk-control-h-lg: 40px",
    "--kk-icon-glyph-sm: 16px",
    "--kk-icon-glyph-md: 20px",
    "--kk-icon-glyph-lg: 24px",
  ];

  for (const token of expectedTokens) {
    assert.match(tokens, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), token);
  }
  assert.doesNotMatch(tokens, /--kk-font-(?:caption|body|body-strong|subtitle|title|display):\s*(?:[0-9]|1[01])px/);
});

test("governance primitives define one button and icon contract", () => {
  assert.equal(existsSync(new URL("src/styles/ui-governance.css", root)), true);
  const governance = read("src/styles/ui-governance.css");
  assert.match(governance, /\.kk-button[^{]*\{[\s\S]*min-(?:height|block-size):\s*var\(--kk-button-h-standard\)/);
  assert.match(governance, /border-radius:\s*var\(--kk-radius-control\)/);
  assert.match(governance, /\.kk-icon-slot\[data-size="sm"\][^{]*\{[\s\S]*width:\s*var\(--kk-icon-glyph-sm\)/);
  assert.match(governance, /\.kk-truncate-single/);
});

