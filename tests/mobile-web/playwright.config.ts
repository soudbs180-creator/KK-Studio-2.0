import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allocateTestEvidenceRun } from "../../scripts/testing/test-evidence.mjs";
import { headlessEdgeLaunchOptions } from "../../scripts/testing/headless-edge-options.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const productionOrigin = process.env.KK_MOBILE_WEB_ORIGIN;
if (productionOrigin !== undefined && productionOrigin !== "https://kkai.plus")
  throw new Error(
    "KK_MOBILE_WEB_ORIGIN must be exactly https://kkai.plus or unset",
  );
const origin = productionOrigin ?? "http://127.0.0.1:1423";
if (
  process.env.KK_TEST_PORT !== undefined &&
  process.env.KK_TEST_PORT !== "1423"
)
  throw new Error(
    "Mobile Web production verification requires fixed port 1423",
  );
if (process.env.TEST_WORKER_INDEX === undefined)
  process.env.KK_MOBILE_WEB_EVIDENCE = allocateTestEvidenceRun("mobile-web", {
    rootDir: root,
  }).directory;
const evidence = process.env.KK_MOBILE_WEB_EVIDENCE;
if (!evidence) throw new Error("Mobile Web worker is missing its evidence run");
export default defineConfig({
  testDir: ".",
  testMatch: "entry.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 45_000,
  outputDir: path.join(evidence, "artifacts"),
  metadata: {
    origin,
    sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).trim(),
  },
  use: {
    baseURL: origin,
    channel: "msedge",
    launchOptions: headlessEdgeLaunchOptions,
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: productionOrigin
    ? undefined
    : {
        command: "node tests/mobile-web/serve.mjs",
        cwd: root,
        url: "http://127.0.0.1:1423/mobile/",
        reuseExistingServer: false,
      },
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(evidence, "mobile-web-results.json") }],
  ],
});
