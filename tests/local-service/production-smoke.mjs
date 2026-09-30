import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { startCompanionService } from "../../src/features/local-service/main.ts";

const root = process.cwd();
const previewPort = 1423;
const previewUrl = `http://127.0.0.1:${previewPort}`;
const dataRoot = mkdtempSync(join(tmpdir(), "kk-companion-smoke-"));
let preview;
let service;
let browser;

function buildWeb() {
  execFileSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "--noEmit"],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: root,
    stdio: "inherit",
  });
}

function bundledFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...bundledFiles(path));
    else if (/\.(?:html|js|css)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function checkBundleBoundary() {
  const forbidden = [
    "node:fs",
    "node:http",
    "node:crypto",
    "Pairing code:",
    "KK_STUDIO_COMPANION_DATA",
  ];
  for (const file of bundledFiles(join(root, "dist"))) {
    const content = readFileSync(file, "utf8");
    for (const needle of forbidden)
      assert.equal(
        content.includes(needle),
        false,
        `Web bundle contains forbidden companion boundary ${needle}: ${file}`,
      );
  }
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${previewUrl}/`);
      if (response.ok) return;
    } catch {
      /* Preview is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite preview did not become ready.");
}

async function pair(page, currentService) {
  const endpoint = `http://127.0.0.1:${currentService.port}`;
  const result = await page.evaluate(
    async ({ endpoint: target, code }) => {
      const response = await fetch(`${target}/v1/pair`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      return { status: response.status, body: await response.json() };
    },
    { endpoint, code: currentService.pairingCode },
  );
  assert.equal(result.status, 200);
  await page.evaluate(
    ({ endpoint: target, body }) => {
      localStorage.setItem(
        "kk-studio-next:companion:v1",
        JSON.stringify({
          version: 1,
          endpoint: target,
          deviceId: body.deviceId,
          protocolVersion: body.protocolVersion,
          enabled: true,
        }),
      );
    },
    { endpoint, body: result.body },
  );
}

async function openSettings(page) {
  await page.reload();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("button", { name: "储存", exact: true }).click();
  return dialog.getByTestId("companion-settings");
}

async function waitForText(page, locator, expected) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      (
        await locator.textContent({ timeout: 100 }).catch(() => null)
      )?.trim() === expected
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `status mismatch: expected ${expected}; body=${(
      await page.locator("body").innerText()
    ).slice(0, 1200)}`,
  );
}

async function startService() {
  return startCompanionService({
    dataDirectory: dataRoot,
    port: 0,
    allowedOrigins: [previewUrl],
  });
}

async function closeService() {
  if (!service) return;
  await new Promise((resolve) => service.server.close(resolve));
  service = undefined;
}

try {
  buildWeb();
  checkBundleBoundary();
  preview = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(previewPort),
      "--strictPort",
    ],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  await waitForPreview();
  service = await startService();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${previewUrl}/`);
  await pair(page, service);
  let companion = await openSettings(page);
  await waitForText(
    page,
    companion.locator(".settings-companion-status"),
    "已连接",
  );
  const snapshot = {
    version: 2,
    revision: 1,
    activeProjectId: null,
    projects: [],
    homeDraft: {},
  };
  const save = await page.evaluate(
    async ({ endpoint, snapshot: value }) => {
      const response = await fetch(`${endpoint}/v1/snapshot`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: null, snapshot: value }),
      });
      return response.status;
    },
    { endpoint: `http://127.0.0.1:${service.port}`, snapshot },
  );
  assert.equal(save, 200);
  await closeService();
  service = await startService();
  await pair(page, service);
  companion = await openSettings(page);
  await waitForText(
    page,
    companion.locator(".settings-companion-status"),
    "已连接",
  );
  const persisted = await page.evaluate(async (endpoint) => {
    const response = await fetch(`${endpoint}/v1/snapshot`, {
      credentials: "include",
    });
    return { status: response.status, body: await response.json() };
  }, `http://127.0.0.1:${service.port}`);
  assert.equal(persisted.status, 200);
  assert.equal(persisted.body.snapshot.revision, 1);
  await context.close();
  console.log("Local companion production smoke: PASS");
} finally {
  await closeService();
  if (browser) await browser.close();
  if (preview) preview.kill();
  rmSync(dataRoot, { recursive: true, force: true });
}
