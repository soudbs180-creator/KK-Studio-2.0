import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// shortcut: Playwright 1.63 private defaults API; revalidate this guard on upgrade.
assert.equal(
  require("playwright-core/package.json").version,
  "1.63.0",
  "Revalidate the headless Edge Shell guard before upgrading Playwright",
);
const { server } = require("playwright-core/lib/coreBundle");
const defaults = server
  .createPlaywright({ sdkLanguage: "javascript" })
  .chromium._innerDefaultArgs({});
const disabledFeatures = defaults.filter((arg) =>
  arg.startsWith("--disable-features="),
);
assert.equal(disabledFeatures.length, 1, "Playwright feature defaults changed");

export const headlessEdgeLaunchOptions = {
  ignoreDefaultArgs: disabledFeatures,
  args: [`${disabledFeatures[0]},msWindowTabManagerPublic`],
};
