import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { allocateTestEvidenceRun } from "./scripts/testing/test-evidence.mjs";
const productionPort = "1423";
const configuredPort = process.env.KK_TEST_PORT;
if (configuredPort !== undefined && configuredPort !== productionPort)
  throw new Error(
    `Production browser verification requires fixed port ${productionPort}; unsupported KK_TEST_PORT=${configuredPort} rejected before starting tests.`,
  );
const port = productionPort;
const baseURL = `http://127.0.0.1:${port}`;
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: new URL(".", import.meta.url),
  encoding: "utf8",
  windowsHide: true,
  timeout: 10_000,
}).trim();
const evidence = allocateTestEvidenceRun("browser");
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: evidence.artifactsDir,
  metadata: { sourceHead },
  timeout: 30000,
  retries: 1,
  use: {
    baseURL,
    channel: "msedge",
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: evidence.reportFile }]],
});
