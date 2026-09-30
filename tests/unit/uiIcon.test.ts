import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUiIconSize } from "../../src/components/uiIconSizing.ts";

test("UiIcon normalizes glyphs to the three Figma size tiers", () => {
  assert.equal(normalizeUiIconSize(), 20);
  assert.equal(normalizeUiIconSize(14), 16);
  assert.equal(normalizeUiIconSize(16), 16);
  assert.equal(normalizeUiIconSize(18), 20);
  assert.equal(normalizeUiIconSize(20), 20);
  assert.equal(normalizeUiIconSize(23), 24);
  assert.equal(normalizeUiIconSize(32), 24);
});
