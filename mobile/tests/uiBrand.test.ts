import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  actionAppearance,
  type ActionTheme,
} from "../src/ui/actionAppearance.ts";

const generated: {
  source: string;
  reference: { sha: string };
  colors: Record<"dark" | "light", ActionTheme>;
} = JSON.parse(
  readFileSync(
    new URL("../src/ui/colorTokens.generated.json", import.meta.url),
    "utf8",
  ),
);

test("mobile primary actions use the neutral foreground hierarchy in both themes", () => {
  for (const theme of Object.values(generated.colors)) {
    const normal = actionAppearance(theme, { primary: true });
    const pressed = actionAppearance(theme, { primary: true, pressed: true });
    assert.equal(normal.foreground, theme.background);
    assert.equal(pressed.foreground, theme.background);
    assert.equal(normal.background, theme.text);
    assert.equal(pressed.background, theme.text);
  }
});
test("phone colors have their own pinned reference and readable text on each content surface", () => {
  assert.equal(generated.source, "mobile/src/ui/mobileColors.source.json");
  assert.equal(
    generated.reference.sha,
    "24a45b54a4225499488842d09405731bab3cd4be",
  );
  function luminance(hex: string) {
    const rgb = hex
      .slice(1)
      .match(/.{2}/g)!
      .map((part) => {
        const c = Number.parseInt(part, 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  for (const theme of Object.values(generated.colors)) {
    for (const surface of [theme.background, theme.pageSurface]) {
      const a = luminance(theme.text),
        b = luminance(surface);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5);
    }
  }
});
test("KK selected and pressed secondary actions retain neutral surfaces with an accent marker", () => {
  for (const theme of Object.values(generated.colors)) {
    const selected = actionAppearance(theme, { selected: true });
    const pressed = actionAppearance(theme, { pressed: true });
    assert.equal(selected.background, theme.selected);
    assert.equal(pressed.background, theme.selected);
    assert.equal(selected.foreground, theme.text);
    assert.equal(selected.marker, theme.accent);
    assert.notEqual(selected.background, theme.accentSoft);
  }
});
