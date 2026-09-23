import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import {
  ACCENTS,
  contrast,
  cssRgb,
  themeTokens,
} from "../../tests/helpers/designSystem.ts";

// Own release process and isolated storage only. Never attach to a user's app.
const repo = process.cwd();
const evidence = path.join(
  repo,
  "docs/changes/2026-09-22-design-system-pages/evidence/desktop",
);
const exe = path.join(repo, "src-tauri/target/release/kk-studio.exe");
const cdp = "http://127.0.0.1:9338";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "kk-ds-desktop-"));
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
  for (const theme of ["dark", "light"]) {
    for (const accent of ACCENTS) {
      const token = themeTokens(theme, accent);
      const dialog = await openSettings();
      await dialog.getByRole("button", { name: "通用", exact: true }).click();
      await dialog.getByLabel("主题", { exact: true }).selectOption(theme);
      await dialog.getByLabel("强调色", { exact: true }).selectOption(accent);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
      await dialog
        .getByRole("button", { name: "模型供应商", exact: true })
        .click();
      const primary = dialog.getByRole("button", {
        name: "保存供应商",
        exact: true,
      });
      await page.mouse.move(0, 0);
      await expect(primary).toHaveCSS(
        "background-color",
        cssRgb(token("--bg-accent")),
      );
      await expect(primary).toHaveCSS(
        "color",
        cssRgb(token("--text-on-accent")),
      );
      await primary.hover();
      await expect(primary).toHaveCSS(
        "background-color",
        cssRgb(token("--bg-accent-hover")),
      );
      const paint = await primary.evaluate((el) => ({
        text: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
      }));
      expect(contrast(paint.text, paint.bg)).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "打开设置", exact: true }),
      ).toBeFocused();
      for (const name of ["项目库", "Skill", "ComfyUI 工作流"]) {
        await navigate(name);
        const section = page.locator(".catalog-page");
        await expect(section.locator("h1")).toHaveCSS("font-size", "24px");
        await expect(section.locator(".catalog-page-search")).toHaveCSS(
          "height",
          "32px",
        );
        await expect(section.locator(".catalog-page-search")).toHaveCSS(
          "background-color",
          cssRgb(token("--bg-input")),
        );
        await expect(
          section.locator(".catalog-card, .project-library-action").first(),
        ).toHaveCSS("border-radius", "28px");
        if (accent === "white")
          await page.screenshot({
            path: path.join(evidence, `${theme}-${name}.png`),
            animations: "disabled",
          });
      }
      report.matrix.push({
        theme,
        accent,
        hoverContrast: contrast(paint.text, paint.bg),
        catalogPages: 3,
      });
    }
  }
  const settings = await openSettings();
  for (const section of [
    "账号管理",
    "储存",
    "网络",
    "记忆",
    "模型供应商",
    "Skill",
    "MCP",
    "插件",
    "Comfy UI",
    "高级",
    "软件更新",
  ]) {
    await settings
      .locator(".settings-nav")
      .getByRole("button", { name: section, exact: true })
      .click();
    await expect(settings.locator(".settings-content h2")).toHaveText(section);
    expect(
      await settings
        .locator(".settings-content")
        .evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    report.sections.push(section);
  }
  await page.keyboard.press("Escape");
  await navigate("Skill");
  await page
    .getByRole("button", { name: "新建本地 Skill", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "编辑本地 Skill" });
  await expect(editor).toHaveCSS("border-radius", "20px");
  await editor.getByLabel("ID", { exact: true }).fill("desktop-design-system");
  await editor.getByLabel("名称", { exact: true }).fill("桌面设计系统验收");
  await editor
    .getByLabel("描述", { exact: true })
    .fill("验证真实桌面重启后的本地记录");
  await editor
    .getByLabel("指令文本", { exact: true })
    .fill("保留用户选择的主题、强调色和本地指令。");
  await page.screenshot({
    path: path.join(evidence, "skill-editor.png"),
    animations: "disabled",
  });
  await editor.getByRole("button", { name: "保存 Skill", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "新建本地 Skill", exact: true }),
  ).toBeFocused();
  const finalSettings = await openSettings();
  await finalSettings.getByLabel("主题", { exact: true }).selectOption("light");
  await finalSettings
    .getByLabel("强调色", { exact: true })
    .selectOption("green");
  await page.keyboard.press("Escape");
  await closeOwnedApp();
  await launch();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "green");
  await navigate("Skill");
  await expect(
    page.locator(".catalog-card").filter({ hasText: "桌面设计系统验收" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(evidence, "restarted-skill.png"),
    animations: "disabled",
  });
  report.restart = {
    theme: "light",
    accent: "green",
    skillPreserved: true,
    sameDataAndProfile: true,
  };
  expect(report.errors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.failure = error.message;
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
