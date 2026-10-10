import { defineConfig } from "@playwright/test";

if (
  process.env.KK_TEST_PORT !== undefined &&
  process.env.KK_TEST_PORT !== "1423"
)
  throw new Error(
    "Production browser verification requires fixed port 1423; unsupported KK_TEST_PORT rejected before starting tests.",
  );
const port = "1423";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
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
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
});
