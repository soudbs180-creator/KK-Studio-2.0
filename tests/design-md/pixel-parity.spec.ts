import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { comparePixels } from "../../scripts/figma-audit/pixel.mjs";

// Pixel-level regression gate (L4).
//
// Each registered state pairs a Figma-authored reference image with the
// locally rendered screenshot of the same route, theme and viewport. The
// reference is the authority, so the local render must match it within a
// bounded pixel ratio.
//
// L4 strict equality is not achievable: the Figma renderer and the browser
// rasteriser differ in font hinting, antialiasing and shadow blurring. The
// gate therefore enforces a tolerance and fails loudly when the difference
// exceeds it.
//
// A state without a Figma reference is skipped rather than silently passing.
// That keeps the gate honest while the reference set grows.

const baselineRoot = fileURLToPath(
  new URL("../../design/preview/baselines/", import.meta.url),
);

function loadStates() {
  if (!fs.existsSync(baselineRoot)) return [];
  return fs
    .readdirSync(baselineRoot)
    .filter((name) => name.endsWith(".json"))
    .map((name) =>
      JSON.parse(fs.readFileSync(path.join(baselineRoot, name), "utf8")),
    )
    .flatMap((entry) => entry.states ?? []);
}

const states = loadStates();

test.describe("L4 pixel parity against Figma references", () => {
  test("compares every registered state against its Figma reference", async ({
    page,
  }, info) => {
    if (states.length === 0) {
      info.annotations.push({
        type: "no-baselines",
        description:
          "No Figma reference baselines registered in design/preview/baselines/",
      });
      test.skip(
        true,
        "No Figma reference baselines registered in design/preview/baselines/",
      );
      return;
    }

    for (const state of states) {
      const referencePath = path.join(baselineRoot, state.reference);
      if (!fs.existsSync(referencePath)) {
        info.annotations.push({
          type: "reference-missing",
          description: `Figma reference ${state.reference} is not present`,
        });
        continue;
      }

      await page.setViewportSize(
        state.viewport ?? { width: 1920, height: 1080 },
      );
      await page.goto(state.route ?? "/");
      if (state.theme) {
        await page.evaluate((theme) => {
          document.documentElement.setAttribute("data-theme", theme);
        }, state.theme);
      }
      await page.waitForTimeout(state.settle ?? 250);

      const actual = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        scale: "css",
      });
      const reference = fs.readFileSync(referencePath);
      const result = comparePixels(reference, actual, {
        channelTolerance: state.channelTolerance ?? 8,
      });

      if (!result.comparable) {
        throw new Error(
          `Screenshot geometry does not match the Figma reference for "${state.name}": ` +
            `reference ${result.reference.width}x${result.reference.height}, ` +
            `actual ${result.actual.width}x${result.actual.height}`,
        );
      }

      const tolerance = state.maxDiffPixelRatio ?? 0.01;
      expect(
        result.diffRatio,
        `Pixel difference for "${state.name}" is ${(result.diffRatio * 100).toFixed(3)}% ` +
          `(${result.diffPixels}/${result.totalPixels} px), tolerance ${(tolerance * 100).toFixed(3)}%`,
      ).toBeLessThanOrEqual(tolerance);
    }
  });
});
