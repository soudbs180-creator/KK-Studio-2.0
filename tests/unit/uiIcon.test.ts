import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCheckUiStandards } from "../../scripts/check-ui-standards.mjs";
import {
  getUiIconSizeName,
  normalizeUiIconSize,
} from "../../src/components/uiIconSizing.ts";

test("UiIcon preserves the Figma graphic size for every button tier", () => {
  assert.equal(normalizeUiIconSize(), 20);
  assert.equal(normalizeUiIconSize(14), 12);
  assert.equal(normalizeUiIconSize(12), 12);
  assert.equal(normalizeUiIconSize(16), 16);
  assert.equal(normalizeUiIconSize(18), 20);
  assert.equal(normalizeUiIconSize(20), 20);
  assert.equal(normalizeUiIconSize(23), 24);
  assert.equal(normalizeUiIconSize(28), 28);
  assert.equal(getUiIconSizeName(normalizeUiIconSize(28)), "xl");
  assert.equal(normalizeUiIconSize(32), 32);
  assert.equal(getUiIconSizeName(normalizeUiIconSize(32)), "xxl");
  assert.equal(normalizeUiIconSize(100), 32);
});

test("only the shared icon facade can add Figma Lucide glyphs", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const facade = path.join(root, "src/components/UiIcon.tsx");
  const tokens = path.join(root, "src/styles/tokens.css");
  assert.equal(
    runCheckUiStandards([facade, tokens]).issues.some((issue: string) =>
      issue.includes("Lucide"),
    ),
    false,
  );
  const tempRoot = path.join(root, ".tmp");
  fs.mkdirSync(tempRoot, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(tempRoot, "icon-import-"));
  try {
    const consumer = path.join(temporary, "Consumer.tsx");
    fs.writeFileSync(
      consumer,
      'import { Plus } from "lucide-react"; export default Plus;',
    );
    assert.equal(
      runCheckUiStandards([consumer, tokens]).issues.some((issue: string) =>
        issue.includes("新增 Lucide"),
      ),
      true,
    );
  } finally {
    assert.ok(
      path.resolve(temporary).startsWith(path.resolve(tempRoot) + path.sep),
    );
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
