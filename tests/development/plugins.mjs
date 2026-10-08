import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import {
  bundledPlugins as plugins,
  addAndEditBundledPlugins,
  expectBundledPluginContents,
} from "../support/pluginFlow.mjs";

const root = process.cwd();
const evidenceDir =
  process.env.KK_PLUGIN_EVIDENCE_DIR ??
  path.join(root, "test-results", "development-plugins", String(Date.now()));
const receipt = {
  runtime: "Vite development",
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim(),
  loaderSha256: createHash("sha256")
    .update(
      await readFile(path.join(root, "src/features/plugins/pluginLoader.ts")),
    )
    .digest("hex"),
  startedAt: new Date().toISOString(),
  url: "http://127.0.0.1:1421/",
  requests: [],
  responses: [],
  errors: [],
  steps: [],
  result: "FAIL",
};
await mkdir(evidenceDir, { recursive: true });
let server;
let browser;
let page;
let failure;
try {
  // The real project config and normal HMR overlay remain enabled.
  // A busy port fails listen(); another task's server is never reused.
  server = await createServer({
    root,
    server: { host: "127.0.0.1", port: 1421, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ channel: "msedge" });
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => receipt.errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") receipt.errors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/plugins/"))
      receipt.requests.push(request.url());
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/plugins/"))
      receipt.responses.push({
        url: response.url(),
        status: response.status(),
      });
  });
  // Bundled nodes must work without loading executable code from a CDN.
  await page.route("https://esm.sh/**", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(receipt.url);
  const entry = page.locator('[data-runtime-entry="src/main.tsx"]');
  await expect(entry).toHaveAttribute("data-runtime-mode", "development");
  receipt.entry = await entry.getAttribute("data-runtime-entry");
  receipt.mode = await entry.getAttribute("data-runtime-mode");

  async function openPluginSettings() {
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "设置" });
    await settings
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "MCP", exact: true })
      .click();
    await expect(settings.locator(".plugin-manager-row")).toHaveCount(4);
    return settings;
  }
  let settings = await openPluginSettings();
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  receipt.steps.push("discover-four-plugins-without-overlay");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  const menu = page.locator(".add-node-menu");
  await addAndEditBundledPlugins(page);
  receipt.steps.push("add-edit-and-render-four-plugin-nodes-without-cdn");
  settings = await openPluginSettings();
  const svgRow = settings
    .locator(".plugin-manager-row")
    .filter({ hasText: "SVG" });
  await expect(svgRow).toHaveCount(1);
  await svgRow.getByRole("switch").click();
  await expect(svgRow.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await expect(
    menu.getByRole("menuitem", { name: "SVG", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  settings = await openPluginSettings();
  const restoredRow = settings
    .locator(".plugin-manager-row")
    .filter({ hasText: "SVG" });
  await expect(restoredRow).toHaveCount(1);
  await expect(restoredRow.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await restoredRow.getByRole("switch").click();
  await expect(restoredRow.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  // Reload returns to the normal home route. Reopen the persisted project
  // through the real library before checking the canvas menu.
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  const savedProject = page.locator(".project-library-card");
  await expect(savedProject).toHaveCount(1);
  await savedProject.click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expectBundledPluginContents(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await expect(
    menu.getByRole("menuitem", { name: "SVG", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  receipt.steps.push("disable-reload-restore-enable");

  let unsafeRequests = 0;
  await page.route("http://example.invalid/unsafe-plugin.js", (route) => {
    unsafeRequests += 1;
    return route.abort();
  });
  settings = await openPluginSettings();
  await settings
    .getByRole("textbox", { name: "插件地址" })
    .fill("http://example.invalid/unsafe-plugin.js");
  await settings.getByRole("button", { name: "安装", exact: true }).click();
  await expect(settings.getByRole("alert")).toContainText(
    "仅支持 HTTPS 插件地址",
  );
  assert.equal(unsafeRequests, 0);
  receipt.steps.push("reject-unsafe-remote-before-request");
  for (const plugin of plugins) {
    const responses = receipt.responses.filter(
      (response) =>
        new URL(response.url).pathname === `/plugins/${plugin.file}`,
    );
    assert(responses.length > 0, `Missing module response: ${plugin.file}`);
    assert(responses.every((response) => response.status === 200));
  }
  assert(
    receipt.requests.every(
      (url) => new URL(url).origin === "http://127.0.0.1:1421",
    ),
  );
  assert(
    receipt.requests.every((url) => !new URL(url).searchParams.has("import")),
  );
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  assert.deepEqual(receipt.errors, []);
  receipt.result = "PASS";
} catch (error) {
  failure = error;
  receipt.failure = String(error);
} finally {
  if (page && !page.isClosed()) {
    receipt.finalUrl = page.url();
    const overlay = page.locator("vite-error-overlay");
    receipt.overlay = (await overlay.count())
      ? await overlay.evaluate(
          (element) =>
            element.shadowRoot?.textContent ?? element.textContent ?? "",
        )
      : "";
    await page
      .screenshot({ path: path.join(evidenceDir, "plugins.png") })
      .catch(() => {});
  }
  await browser?.close();
  await server?.close();
  receipt.completedAt = new Date().toISOString();
  await writeFile(
    path.join(evidenceDir, "receipt.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      result: receipt.result,
      sourceHead: receipt.sourceHead,
      steps: receipt.steps,
      errors: receipt.errors,
      evidenceDir,
    }),
  );
}
if (failure) throw failure;
