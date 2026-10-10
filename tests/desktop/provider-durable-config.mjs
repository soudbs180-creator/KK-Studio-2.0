import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const runId = `${Date.now()}-${randomUUID()}`;
const output = path.resolve(
  process.env.KK_PROVIDER_EVIDENCE ??
    path.join(root, "test-results/desktop/provider-durable-config", runId),
);
const executable =
  process.env.KK_PROVIDER_EXE ??
  path.join(root, "src-tauri/target/debug/kk-studio.exe");
const isolated = path.join(root, "src-tauri/target/provider-durable-acceptance", runId);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const cdp = "http://127.0.0.1:9349";
const report = {
  startedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dataRoot,
  profile,
  checks: [],
  errors: [],
  passed: false,
};
const CONNECTION = {
  id: "byok-acceptance",
  provider: "验收供应商",
  kind: "user_byok",
  displayName: "验收连接",
  baseUrl: "https://api.example.com/v1",
  credentialRef: "provider-acceptance-test",
  model: "acceptance-model",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    maxOutputs: 4,
    async: false,
  },
  state: "active",
  concurrencyLimit: 2,
  verificationStatus: "unverified",
};
report.versions = JSON.parse(await fs.readFile("config/platform-versions.json", "utf8"));
report.sourceHashes = {};
for (const file of [
  "src-tauri/src/provider_config.rs",
  "src-tauri/src/creation_storage.rs",
  "src-tauri/src/main.rs",
  "src/features/creation/providerRegistry.ts",
  "src/components/settings/ModelProviderSettings.tsx",
  "src/App.tsx",
  "tests/desktop/provider-durable-config.mjs",
])
  report.sourceHashes[file] = createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(output, { recursive: true });

function record(name, passed, detail) {
  report.checks.push({ name, passed: Boolean(passed), detail });
  if (!passed) report.errors.push(`${name}: ${detail ?? "failed"}`);
}

let app;
let browser;
let page;

async function startApp(tag) {
  const startup = { tag, pid: null };
  app = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9349 --remote-debugging-address=127.0.0.1",
    },
  });
  startup.pid = app.pid ?? null;
  let spawnFailure;
  app.once("error", (cause) => {
    spawnFailure = cause;
  });
  let stderr = "";
  app.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (spawnFailure) throw spawnFailure;
    try {
      browser = await chromium.connectOverCDP(cdp);
      page = browser.contexts().flatMap((context) => context.pages())[0];
      if (page) break;
    } catch {
      /* WebView still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(page, `WebView page missing for ${tag}`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (page.url().includes("tauri.localhost")) break;
    await page.waitForTimeout(250);
  }
  assert(page.url().includes("tauri.localhost"), `app URL ${page.url()}`);
  page.on("pageerror", (cause) => report.errors.push(cause.message));
  report.checks.push({ name: `start-${tag}`, passed: true, detail: `pid=${startup.pid}` });
  return startup;
}

function killTree() {
  if (!app?.pid) return;
  try {
    execFileSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    /* Already exited */
  }
  app = undefined;
}

try {
  const first = await startApp("first");
  await page.waitForTimeout(1500);
  const revision = await page.evaluate(
    async (connection) =>
      window.__TAURI_INTERNALS__.invoke("write_provider_config", {
        connections: [connection],
        expectedRevision: null,
      }),
    CONNECTION,
  );
  record("durable-write-command", revision === 1, `revision=${revision}`);

  const filePath = path.join(dataRoot, "providers", "connections.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  record("file-exists-with-connection", parsed.connections?.[0]?.id === CONNECTION.id);
  record(
    "file-has-no-secrets",
    !raw.includes("sk-") && !raw.includes("apiKey") && !raw.includes("secret"),
    raw.slice(0, 120),
  );
  record("file-revision", parsed.revision === 1, JSON.stringify(parsed));

  killTree();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  await startApp("second");
  await page.waitForTimeout(1500);
  const loaded = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("read_provider_config"),
  );
  record(
    "restart-restores-connection",
    loaded.status === "loaded" && loaded.connections?.[0]?.id === CONNECTION.id,
    JSON.stringify(loaded).slice(0, 200),
  );
  record(
    "restart-keeps-credential-ref",
    loaded.connections?.[0]?.credentialRef === CONNECTION.credentialRef,
  );
  killTree();
  await new Promise((resolve) => setTimeout(resolve, 800));

  report.passed = report.errors.length === 0;
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
  report.passed = false;
} finally {
  killTree();
  try {
    await browser?.close();
  } catch {
    /* CDP already closed */
  }
}
await fs.writeFile(
  path.join(output, "provider-durable-config.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);
const summary = report.checks.map((check) => `${check.passed ? "PASS" : "FAIL"} ${check.name}`).join("\n");
console.log(summary);
console.log(report.errors.length ? `ERRORS:\n${report.errors.join("\n")}` : "no errors");
if (report.passed) {
  console.log(`evidence: ${output}`);
  process.exit(0);
}
process.exit(1);
