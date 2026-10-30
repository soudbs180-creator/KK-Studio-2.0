import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  lintBorderRadius,
  lintInlineStyles,
  runCheckUiStandards,
  TOKEN_DEFINITION_FILES,
} from "../../scripts/check-ui-standards.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("lintBorderRadius permits registered token definitions and token variables", () => {
  const validCss = `
    .my-button {
      border-radius: var(--kk-radius-control);
    }
    .my-card {
      border-radius: var(--kk-radius-card);
    }
    .my-menu {
      border-radius: var(--kk-radius-menu);
    }
  `;
  const issues = lintBorderRadius("src/components/MyComponent.css", validCss);
  assert.deepEqual(issues, []);
});

test("lintBorderRadius allows token definition files to declare 999px token", () => {
  for (const tokenFile of TOKEN_DEFINITION_FILES) {
    const content =
      ":root { --kk-radius-full: 999px; --ui-radius-pill: 999px; }";
    const issues = lintBorderRadius(tokenFile, content);
    assert.deepEqual(issues, []);
  }
});

test("lintBorderRadius blocks unauthorized hardcoded 999px and 9999px in css", () => {
  const badPillCss = `
    .bad-pill {
      border-radius: 999px;
    }
    .bad-long-pill {
      border-radius: 9999px;
    }
  `;
  const issues = lintBorderRadius(
    "src/components/BadComponent.css",
    badPillCss,
  );
  assert.equal(issues.length, 2);
  assert.match(issues[0], /禁止未授权的硬编码 999px\/9999px 圆角/);
  assert.match(issues[1], /禁止未授权的硬编码 999px\/9999px 圆角/);
});

test("lintInlineStyles blocks raw inline borderRadius in JSX", () => {
  const badTsx = `
    import React from "react";
    export function BadButton() {
      return <button style={{ borderRadius: "999px", background: "blue" }}>Click</button>;
    }
  `;
  const issues = lintInlineStyles("src/components/BadButton.tsx", badTsx);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /禁止在 JSX 中使用行内 borderRadius 样式/);
});

test("lintInlineStyles blocks raw inline 8px borderRadius in JSX", () => {
  const badTsx = `
    import React from "react";
    export function BadCard() {
      return <div style={{ borderRadius: "8px", padding: 12 }}>Card</div>;
    }
  `;
  const issues = lintInlineStyles("src/components/BadCard.tsx", badTsx);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /禁止在 JSX 中使用行内 borderRadius 样式/);
});

test("lintInlineStyles passes clean JSX without inline borderRadius", () => {
  const cleanTsx = `
    import React from "react";
    export function CleanButton() {
      return <button className="settings-action">Click</button>;
    }
  `;
  const issues = lintInlineStyles("src/components/CleanButton.tsx", cleanTsx);
  assert.deepEqual(issues, []);
});

test("project files under M1 ownership pass border-radius and inline linting", () => {
  const ownedFiles = [
    "src/styles/tokens.css",
    "src/styles/motion.css",
    "src/styles/composer.css",
    "src/components/settings/settings.css",
    "src/components/settings/SettingsCardGroup.tsx",
    "src/components/ui/SlidingPillIndicator.tsx",
  ];

  for (const file of ownedFiles) {
    const fullPath = path.join(root, file);
    assert.ok(fs.existsSync(fullPath), `Expected ${file} to exist`);
    const content = fs.readFileSync(fullPath, "utf8");

    if (file.endsWith(".css")) {
      const radiusIssues = lintBorderRadius(file, content, { strict: true });
      assert.deepEqual(
        radiusIssues,
        [],
        `File ${file} failed radius lint: ${JSON.stringify(radiusIssues)}`,
      );
    }

    if (file.endsWith(".tsx")) {
      const inlineIssues = lintInlineStyles(file, content, { strict: true });
      assert.deepEqual(
        inlineIssues,
        [],
        `File ${file} failed inline lint: ${JSON.stringify(inlineIssues)}`,
      );
    }
  }
});

test("runCheckUiStandards executes on custom files without errors", () => {
  const result = runCheckUiStandards([
    path.join(root, "src/components/settings/SettingsCardGroup.tsx"),
    path.join(root, "src/components/ui/SlidingPillIndicator.tsx"),
  ]);
  assert.ok(Array.isArray(result.issues));
  assert.ok(Array.isArray(result.inventory));
});
