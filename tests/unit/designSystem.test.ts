import assert from "node:assert/strict";
import test from "node:test";
import { ACCENTS, contrast, themeTokens } from "../helpers/designSystem.ts";

const surfaces = [
  "--bg-app",
  "--bg-surface",
  "--bg-card",
  "--bg-input",
  "--bg-elevated",
  "--bg-soft",
  "--neutral-selected",
];

test("contrast reference examples use the WCAG relative luminance formula", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  assert.equal(contrast("#ffffff", "#ffffff"), 1);
  assert.ok(Math.abs(contrast("#635bff", "#ffffff") - 4.697) < 0.001);
});

for (const theme of ["dark", "light"]) {
  for (const accent of ACCENTS) {
    test(`${theme}/${accent}: regular text, placeholders, focus and filled controls stay readable`, () => {
      const token = themeTokens(theme, accent);
      const check = (fg: string, bg: string, min: number) => {
        const ratio = contrast(token(fg), token(bg));
        assert.ok(
          ratio >= min,
          `${fg} ${token(fg)} on ${bg} ${token(bg)} = ${ratio.toFixed(3)} < ${min}`,
        );
      };
      for (const bg of surfaces) {
        for (const fg of [
          "--text-primary",
          "--text-secondary",
          "--text-tertiary",
          "--text-danger",
          "--text-success",
          "--text-warning",
          "--text-accent",
        ])
          check(fg, bg, 4.5);
        check("--focus-ring", bg, 3);
      }
      for (const bg of ["--bg-accent", "--bg-accent-hover"])
        check("--text-on-accent", bg, 4.5);
      check("--text-on-accent-soft", "--bg-accent-soft", 4.5);
      for (const status of ["success", "warning", "danger"])
        check(`--text-on-${status}`, `--bg-${status}`, 4.5);
      check("--text-on-danger", "--bg-danger-hover", 4.5);
      check("--border-control", "--bg-input", 3);
      check("--ui-control-thumb-off", "--ui-control-off", 3);
    });
  }
}

test("status semantics do not follow the selected accent", () => {
  for (const theme of ["dark", "light"]) {
    const base = themeTokens(theme, "default");
    for (const accent of ACCENTS) {
      const token = themeTokens(theme, accent);
      for (const name of [
        "--text-danger",
        "--text-success",
        "--text-warning",
        "--bg-danger",
        "--text-on-danger",
      ])
        assert.equal(token(name), base(name));
    }
  }
});
