import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://127.0.0.1:1423",
    channel: "msedge",
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort",
    url: "http://127.0.0.1:1423",
    reuseExistingServer: false,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
});
