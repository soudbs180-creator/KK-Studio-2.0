import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { capturePageAlignment } from "./capture-page-alignment.mjs";

const repo = process.cwd();
const desktop = process.argv.includes("--desktop");
const url =
  process.argv.find((arg) => /^http/.test(arg)) ?? "http://127.0.0.1:1421/";
const mode = desktop
  ? "desktop"
  : url.includes(":1423")
    ? "preview"
    : "development";
const evidence = path.join(repo, "docs/evidence/2026-09-20-ui-main-alignment");
await fs.mkdir(path.join(evidence, "screenshots"), { recursive: true });
await fs.mkdir(path.join(evidence, "runtime"), { recursive: true });
const report = { mode, checks: [], pageErrors: [] };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;
let app;
let cleanupError;
try {
  let page;
  if (desktop) {
    const endpoint = "http://127.0.0.1:9337";
    const occupied = await fetch(`${endpoint}/json/version`)
      .then(() => true)
      .catch(() => false);
    if (occupied) throw new Error("Audit CDP port is occupied");
    const temp = path.join(repo, ".tmp/ui-main-alignment-20260920");
    await fs.mkdir(temp, { recursive: true });
    const data = await fs.mkdtemp(path.join(temp, "native-data-"));
    const profile = await fs.mkdtemp(path.join(temp, "native-profile-"));
    app = spawn(
      path.join(repo, "src-tauri/target/release/kk-studio.exe"),
      ["--data-dir", data],
      {
        cwd: repo,
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          WEBVIEW2_USER_DATA_FOLDER: profile,
          WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
            "--remote-debugging-port=9337 --remote-debugging-address=127.0.0.1",
        },
      },
    );
    for (let i = 0; i < 150; i++) {
      if (app.exitCode !== null)
        throw new Error(`Desktop exited: ${app.exitCode}`);
      if (
        await fetch(`${endpoint}/json/version`)
          .then(() => true)
          .catch(() => false)
      )
        break;
      await delay(100);
    }
    browser = await chromium.connectOverCDP(endpoint);
    for (let i = 0; i < 100 && !page; i++) {
      page = browser
        .contexts()
        .flatMap((c) => c.pages())
        .find((p) => p.url().includes("tauri.localhost"));
      if (!page) await delay(100);
    }
    if (!page) throw new Error("Desktop page missing");
    await page.waitForLoadState("domcontentloaded");
    const actualRoot = await page.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke("get_storage_root"),
    );
    expect(path.resolve(actualRoot).toLowerCase()).toBe(
      path.resolve(data).toLowerCase(),
    );
    report.isolatedDataRoot = true;
  } else {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(url);
  }
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByLabel("创作提示词")).toBeVisible();
  const sort = page.getByRole("button", {
    name: "项目显示与排序",
    exact: true,
  });
  const account = page.getByRole("button", { name: "个人信息", exact: true });
  await sort.click();
  await account.click();
  await expect(page.getByRole("menu", { name: "项目显示与排序" })).toHaveCount(
    0,
  );
  await expect(page.locator(".account-popup")).toBeVisible();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".account-popup")).toHaveCount(0);
  report.checks.push(
    "sidebar popup switches exclusively and closes on navigation",
  );
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const panel = page.locator(".conversation-panel");
  await expect(panel).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const rects = () =>
    panel
      .locator(
        ".chat-composer button:not([role]), .chat-composer button[aria-haspopup]",
      )
      .evaluateAll((els) =>
        els
          .filter((e) => !e.closest('[role="menu"]'))
          .map((e) => {
            const r = e.getBoundingClientRect();
            return {
              label: e.getAttribute("aria-label") ?? e.textContent,
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
            };
          }),
      );
  const baseline = await rects();
  const triggers = ["模型", "Skill", "插件", "AI权限模式"].map((name) =>
    panel.getByRole("button", { name, exact: true }),
  );
  for (const trigger of triggers) {
    await trigger.click();
    await expect(panel.getByRole("menu")).toHaveCount(1);
    expect(await rects()).toEqual(baseline);
  }
  await panel.getByRole("menu").locator("button").first().focus();
  await page.keyboard.press("Escape");
  await expect(triggers[3]).toBeFocused();
  await expect(panel.getByRole("menu")).toHaveCount(0);
  report.checks.push(
    "four exclusive menus; stable control rectangles; Escape restores focus",
  );
  await triggers[0].click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await expect(panel.getByRole("menu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  report.checks.push("toolbar pointer propagation does not block dismissal");
  await page.getByRole("button", { name: "选择画布工具", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "资产管理" })).toBeVisible();
  await expect(page.locator(".canvas-tool-menu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "画布缩放", exact: true }).click();
  await page.locator(".canvas-background").click();
  await expect(page.getByRole("menu", { name: "画布缩放比例" })).toHaveCount(0);
  // Restore the screenshot's original background after exercising the toggle.
  await page.locator(".canvas-background").click();
  report.checks.push(
    "toolbar-to-dialog and navigation actions leave no stale menu",
  );
  report.runtime = await page.evaluate(() => ({
    url: location.href,
    viewport: [innerWidth, innerHeight],
    runtime: document.querySelector("[data-runtime-entry]")?.dataset,
    scripts: [...document.scripts].map((s) => s.src),
    stylesheets: [...document.styleSheets].map((s) => s.href),
  }));
  report.controlRects = baseline;
  await page.screenshot({
    path: path.join(evidence, `screenshots/${mode}-workspace.png`),
  });
  await triggers[0].click();
  await panel.screenshot({
    path: path.join(evidence, `screenshots/${mode}-model-open.png`),
  });
  if (process.argv.includes("--pages")) {
    await page.keyboard.press("Escape");
    report.capturedPageStates = await capturePageAlignment(
      page,
      evidence,
      mode,
    );
  }
  expect(report.pageErrors).toEqual([]);
  report.passed = true;
} finally {
  await fs.writeFile(
    path.join(evidence, `runtime/${mode}.json`),
    JSON.stringify(report, null, 2),
  );
  if (app && app.exitCode === null) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${app.pid}).CloseMainWindow() | Out-Null`,
      ],
      { windowsHide: true },
    );
    for (let i = 0; i < 80 && app.exitCode === null; i++) await delay(100);
    if (app.exitCode === null)
      cleanupError = new Error(
        `Owned desktop process ${app.pid} did not close`,
      );
  }
  await browser?.close();
}
if (cleanupError) throw cleanupError;
console.log(JSON.stringify(report, null, 2));
