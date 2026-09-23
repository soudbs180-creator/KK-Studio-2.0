import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { ACCENTS } from "../../tests/helpers/designSystem.ts";

// Own release process and isolated storage only. Never attach to a user's app.
const repo = process.cwd();
const evidence = path.join(
  repo,
  "docs/changes/2026-09-22-responsive-ui/evidence/desktop",
);
const exe = path.join(repo, "src-tauri/target/release/kk-studio.exe");
const cdp = "http://127.0.0.1:9338";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "kk-responsive-desktop-"));
const data = path.join(temp, "data");
const profile = path.join(temp, "profile");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = {
  timestamp: new Date().toISOString(),
  mode: "Tauri release",
  data,
  profile,
  matrix: [],
  sections: [],
  launches: [],
  errors: [],
  passed: false,
};
let browser, app, page;
await fs.mkdir(evidence, { recursive: true });

async function cdpAvailable() {
  return fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then(() => true)
    .catch(() => false);
}
async function closeOwnedApp() {
  if (app && app.exitCode === null) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${app.pid} -ErrorAction Stop).CloseMainWindow() | Out-Null`,
      ],
      { windowsHide: true },
    );
    await expect.poll(() => app.exitCode, { timeout: 10000 }).not.toBeNull();
  }
  await browser?.close();
  browser = undefined;
  page = undefined;
  await expect.poll(cdpAvailable, { timeout: 10000 }).toBe(false);
}
async function launch() {
  if (await cdpAvailable())
    throw new Error("Audit CDP port 9338 is occupied; no process was launched");
  app = spawn(exe, ["--data-dir", data], {
    cwd: repo,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9338 --remote-debugging-address=127.0.0.1",
    },
  });
  let launchError;
  app.on("error", (error) => {
    launchError = error;
  });
  for (let i = 0; i < 150; i++) {
    if (launchError) throw launchError;
    if (app.exitCode !== null)
      throw new Error(`Owned desktop exited early: ${app.exitCode}`);
    if (await cdpAvailable()) break;
    await delay(100);
  }
  browser = await chromium.connectOverCDP(cdp);
  await expect
    .poll(
      () => {
        page = browser
          .contexts()
          .flatMap((context) => context.pages())
          .find((item) => new URL(item.url()).hostname === "tauri.localhost");
        return Boolean(page);
      },
      { timeout: 15000 },
    )
    .toBe(true);
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const storageRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  expect(path.resolve(storageRoot).toLowerCase()).toBe(
    path.resolve(data).toLowerCase(),
  );
  const assets = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map((el) => el.getAttribute("src") ?? el.getAttribute("href")),
    );
  const loaded = [];
  for (const asset of assets) {
    if (!asset.startsWith("/assets/")) continue;
    const local = await fs.readFile(path.join(repo, "dist", asset.slice(1)));
    const actual = await page.evaluate(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Asset fetch ${response.status}`);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    }, asset);
    expect(sha(Buffer.from(actual))).toBe(sha(local));
    loaded.push({ asset, sha256: sha(local), bytes: local.length });
  }
  expect(loaded.some((item) => item.asset.endsWith(".js"))).toBe(true);
  expect(loaded.some((item) => item.asset.endsWith(".css"))).toBe(true);
  report.launches.push({
    pid: app.pid,
    url: page.url(),
    storageRoot,
    viewport: await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
    })),
    loaded,
  });
}
async function navigate(name) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.locator(".catalog-page h1")).toBeVisible();
}
async function openSettings() {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  return page.getByRole("dialog", { name: "设置" });
}

try {
  report.exe = { path: exe, sha256: sha(await fs.readFile(exe)) };
  await launch();
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
  }));
  expect(await page.locator(".app").boundingBox()).toEqual({
    x: 0,
    y: 0,
    ...viewport,
  });
  await expect(page.locator(".app")).toHaveAttribute(
    "data-responsive-surface",
    "desktop",
  );
  await expect(page.locator(".topbar nav button").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await page.screenshot({
    path: path.join(evidence, "landing-native.png"),
    animations: "disabled",
  });
  await navigate("项目库");
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const canvas = page.getByTestId("infinite-canvas");
  await expect(canvas).toBeVisible();
  await canvas.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("Control+-");
  await expect(
    page.getByRole("button", { name: "画布缩放", exact: true }),
  ).toHaveText("20%");
  for (const theme of ["dark", "light"]) {
    for (const accent of ACCENTS) {
      const settings = await openSettings();
      await settings.getByLabel("主题", { exact: true }).selectOption(theme);
      await settings.getByLabel("强调色", { exact: true }).selectOption(accent);
      await page.keyboard.press("Escape");
      const a = await page.locator(".task-button").boundingBox();
      const b = await page.locator(".project-task-status").boundingBox();
      expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
      const patterns = [];
      for (const pattern of ["dots", "grid"]) {
        if (
          !(await canvas.getAttribute("class")).includes(
            `canvas-pattern-${pattern}`,
          )
        ) {
          await page
            .getByRole("button", {
              name: pattern === "dots" ? "切换为点状背景" : "切换为网格背景",
              exact: true,
            })
            .click();
        }
        const paint = await canvas.evaluate((el) => {
          const css = getComputedStyle(el);
          return {
            pitch: parseFloat(css.backgroundSize),
            image: css.backgroundImage,
            opacity: Number(css.getPropertyValue("--canvas-pattern-opacity")),
          };
        });
        expect(paint.pitch).toBeGreaterThanOrEqual(12);
        expect(paint.image).not.toBe("none");
        expect(paint.opacity).toBeGreaterThan(0.1);
        patterns.push({ pattern, ...paint });
      }
      report.matrix.push({ theme, accent, task: a, status: b, patterns });
    }
    await page.screenshot({
      path: path.join(evidence, `workspace-${theme}-20.png`),
      animations: "disabled",
    });
  }
  for (const [label, selector] of [
    ["打开任务列表", ".task-panel"],
    ["添加资源", ".add-node-menu"],
    ["选择画布工具", ".canvas-tool-menu"],
    ["画布缩放", ".canvas-zoom-menu"],
    ["小地图", ".canvas-minimap"],
  ]) {
    const trigger = page.getByRole("button", { name: label, exact: true });
    await trigger.click();
    await expect(page.locator(selector)).toBeVisible();
    await trigger.click();
    await expect(page.locator(selector)).toHaveCount(0);
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.locator(selector)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  const tasks = page.getByRole("button", { name: "打开任务列表", exact: true });
  await tasks.click();
  const card = page.getByRole("button", {
    name: "查看演示任务 2026/9/5",
    exact: true,
  });
  await card.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "任务详情", exact: true }),
  ).toHaveCount(0);
  await expect(card).toBeFocused();
  await page.getByRole("button", { name: "关闭任务列表", exact: true }).click();
  await expect(tasks).toBeFocused();
  const row = page.locator(".sidebar .project-entry").first();
  await row.locator(".project-link").click({ button: "right" });
  await page.getByRole("menuitem", { name: "改名字", exact: true }).click();
  await page.getByLabel("项目名称", { exact: true }).fill("桌面折叠保留名称");
  await page.keyboard.press("Enter");
  await page.locator(".project-groups-title").click();
  await page.locator(".project-groups-title").click();
  await expect(
    page.getByRole("button", { name: "桌面折叠保留名称", exact: true }),
  ).toBeVisible();
  const settings = await openSettings();
  const box = await settings.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(3, 3, { steps: 10 });
  await page.mouse.up();
  await expect(settings).toBeVisible();
  await page.mouse.click(3, 3);
  await expect(settings).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  report.flows = {
    popupToggleEscapeFocus: true,
    nestedTaskDismiss: true,
    projectFoldState: true,
    backdropDrag: true,
    conversationFold: true,
  };
  await page.screenshot({
    path: path.join(evidence, "workspace-final.png"),
    animations: "disabled",
  });
  expect(report.errors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.failure = error.message;
  if (page)
    await page
      .screenshot({
        path: path.join(evidence, "failure.png"),
        animations: "disabled",
      })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  try {
    await closeOwnedApp();
  } catch (error) {
    report.cleanupFailure = error.message;
    report.passed = false;
    process.exitCode = 1;
  }
  await fs.writeFile(
    path.join(evidence, "runtime.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        matrix: report.matrix.length,
        launches: report.launches.length,
        failure: report.failure,
        cleanupFailure: report.cleanupFailure,
        evidence,
      },
      null,
      2,
    ),
  );
}
