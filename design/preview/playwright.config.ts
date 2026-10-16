import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig } from "@playwright/test";
import { headlessEdgeLaunchOptions } from "../../scripts/testing/headless-edge-options.mjs";
import { allocateTestEvidenceRun } from "../../scripts/testing/test-evidence.mjs";

const repository = fileURLToPath(new URL("../../", import.meta.url));
if (
  process.env.KK_TEST_PORT !== undefined &&
  process.env.KK_TEST_PORT !== "1423"
)
  throw new Error("Design browser verification requires fixed port 1423");
if (process.env.TEST_WORKER_INDEX === undefined)
  process.env.KK_DESIGN_EVIDENCE_RUN = allocateTestEvidenceRun("design-md", {
    rootDir: repository,
  }).directory;
const evidenceDirectory = process.env.KK_DESIGN_EVIDENCE_RUN;
if (!evidenceDirectory)
  throw new Error("Design worker is missing its evidence run");
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repository,
  encoding: "utf8",
  windowsHide: true,
  timeout: 10_000,
}).trim();

export default defineConfig({
  testDir: fileURLToPath(new URL("../../tests/design-md", import.meta.url)),
  testMatch: "preview.spec.ts",
  outputDir: path.join(evidenceDirectory, "artifacts"),
  metadata: { sourceHead, runtime: "design-preview" },
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:1423",
    channel: "msedge",
    launchOptions: {
      ...headlessEdgeLaunchOptions,
      args: [...headlessEdgeLaunchOptions.args, "--enable-automation"],
    },
    viewport: { width: 1920, height: 1080 },
    trace: "retain-on-failure",
  },
  webServer: {
    cwd: repository,
    command:
      "node node_modules/vite/bin/vite.js preview --config design/preview/vite.config.ts --host 127.0.0.1 --port 1423 --strictPort",
    url: "http://127.0.0.1:1423",
    reuseExistingServer: false,
  },
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: path.join(evidenceDirectory, "design-md-results.json") },
    ],
  ],
});
