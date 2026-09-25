import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";

const repo = process.cwd();
const output = path.join(repo, "docs/changes/2026-09-25-sidebar-real-projects/evidence");
const exe = path.join(repo, "src-tauri/target/release/kk-studio.exe");
const port = 9347;
const cdp = `http://127.0.0.1:${port}`;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "kk-ui009-integration-desktop-"));
const data = path.join(temp, "data");
const profile = path.join(temp, "profile");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const available = () =>
  fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then(() => true)
    .catch(() => false);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
  timestamp: new Date().toISOString(),
  mode: "Tauri release",
  exe,
  isolatedData: data,
  isolatedProfile: profile,
  loadedAssets: [],
  pageErrors: [],
  passed: false,
};
let app;
let browser;

await fs.mkdir(output, { recursive: true });
try {
  if (await available()) throw new Error(`CDP port ${port} is occupied`);
  report.exeSha256 = sha(await fs.readFile(exe));
  app = spawn(exe, ["--data-dir", data], {
    cwd: repo,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
    },
  });
  for (let i = 0; i < 150 && !(await available()); i++) {
    if (app.exitCode !== null) throw new Error(`Desktop exited: ${app.exitCode}`);
    await delay(100);
  }
  if (!(await available())) throw new Error("Desktop CDP did not start");
  browser = await chromium.connectOverCDP(cdp);
  let page;
  await expect
    .poll(() => {
      page = browser
        .contexts()
        .flatMap((context) => context.pages())
        .find((candidate) => new URL(candidate.url()).hostname === "tauri.localhost");
      return Boolean(page);
    }, { timeout: 15000 })
    .toBe(true);
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  await page.waitForLoadState("domcontentloaded");
  await page.emulateMedia({ reducedMotion: "reduce" });
  report.url = page.url();
  report.runtime = await page.locator(".app").evaluate((element) => ({
    entry: element.dataset.runtimeEntry,
    mode: element.dataset.runtimeMode,
  }));
  expect(report.runtime).toEqual({ entry: "src/main.tsx", mode: "production" });
  const storageRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  expect(path.resolve(storageRoot).toLowerCase()).toBe(path.resolve(data).toLowerCase());
  report.storageRoot = storageRoot;

  const assets = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("src") ?? element.getAttribute("href")),
    );
  for (const asset of assets) {
    if (!asset.startsWith("/assets/")) continue;
    const local = await fs.readFile(path.join(repo, "dist", asset.slice(1)));
    const actual = await page.evaluate(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Asset fetch ${response.status}`);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    }, asset);
    expect(sha(Buffer.from(actual))).toBe(sha(local));
    report.loadedAssets.push({ asset, sha256: sha(local), bytes: local.length });
  }
  expect(report.loadedAssets.some((asset) => asset.asset.endsWith(".js"))).toBe(true);
  expect(report.loadedAssets.some((asset) => asset.asset.endsWith(".css"))).toBe(true);

  await expect(page.getByRole("region", { name: "开始创作" })).toBeVisible();
  const home = await page.locator(".start-composer").boundingBox();
  expect(home.width).toBe(652);
  expect(home.height).toBeGreaterThanOrEqual(170);
  await expect(page.locator(".start-prompt-library")).toHaveCount(0);
  await page.screenshot({ path: path.join(output, "desktop-native-home.png") });
  await page.getByRole("button", { name: "添加素材与生成设置" }).click();
  await expect(
    page.getByRole("dialog", { name: "添加素材与生成设置" }).getByLabel("生成数量"),
  ).toBeVisible();
  await page.getByRole("button", { name: "添加素材与生成设置" }).click();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(page.locator(".settings-page-title")).toHaveText("通用");
  report.settings = await page.evaluate(() => {
    const panel = document.querySelector(".settings-panel").getBoundingClientRect();
    const title = document.querySelector(".settings-page-title").getBoundingClientRect();
    return {
      width: panel.width,
      height: panel.height,
      titleOffsetX: title.x - panel.x,
      titleOffsetY: title.y - panel.y,
    };
  });
  expect(report.settings.width).toBe(920);
  expect(report.settings.height).toBe(700);
  expect(Math.round(report.settings.titleOffsetX)).toBe(364);
  expect(Math.round(report.settings.titleOffsetY)).toBe(38);
  await page.getByRole("button", { name: "插件·技能·伙伴", exact: true }).click();
  await page.getByRole("tab", { name: /伙伴/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Codex 主 Agent");
  await page.screenshot({ path: path.join(output, "desktop-native-partners.png") });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-card")).toHaveCount(0);
  await expect(page.getByText("还没有本地项目", { exact: false })).toBeVisible();
  await page.screenshot({ path: path.join(output, "desktop-native-empty-projects.png") });
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(page.locator(".canvas-node")).toHaveCount(0);
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar.locator(".project-entry")).toHaveCount(1);
  const project = sidebar.locator(".project-entry").first();
  await project.getByRole("button", { name: "更多项目设置" }).click();
  await project.getByRole("menuitem", { name: "改名字" }).click();
  await sidebar.getByRole("textbox", { name: "项目名称" }).fill("原生侧栏验证项目");
  await sidebar.getByRole("textbox", { name: "项目名称" }).press("Enter");
  await expect(sidebar.getByRole("button", { name: "原生侧栏验证项目" })).toBeVisible();
  await page.reload();
  await expect(sidebar.getByRole("button", { name: "原生侧栏验证项目" })).toBeVisible();
  await sidebar.getByRole("button", { name: "原生侧栏验证项目" }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  await expect(sidebar.locator(".project-folder-group")).toHaveCount(1);
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.screenshot({ path: path.join(output, "desktop-native-real-sidebar.png") });
  const panel = page.locator(".conversation-panel");
  const close = panel.getByRole("button", { name: "收起对话" });
  if (await close.isVisible()) {
    await page.locator(".topbar").click({ position: { x: 8, y: 8 } });
    await expect(panel).toBeVisible();
    const before = await close.boundingBox();
    await close.click();
    const reopen = page.getByRole("button", { name: "打开对话" });
    const after = await reopen.boundingBox();
    expect(Math.abs(before.x - after.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1);
    await reopen.click();
  }
  await page.screenshot({ path: path.join(output, "desktop-native-blank-canvas.png") });
  expect(report.pageErrors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
} finally {
  if (app && app.exitCode === null) {
    try {
      execFileSync("powershell.exe", [
        "-NoProfile", "-Command",
        `(Get-Process -Id ${app.pid} -ErrorAction Stop).CloseMainWindow() | Out-Null`,
      ], { windowsHide: true });
      for (let i = 0; i < 100 && app.exitCode === null; i++) await delay(100);
    } catch {
      // Only the process started above may be stopped.
    }
    if (app.exitCode === null) app.kill();
  }
  await browser?.close();
  await fs.writeFile(path.join(output, "desktop-runtime.json"), JSON.stringify(report, null, 2) + "\n");
}
if (!report.passed) throw new Error(report.error ?? "Desktop acceptance failed");
console.log(`Desktop UI acceptance PASS: ${path.join(output, "desktop-runtime.json")}`);
