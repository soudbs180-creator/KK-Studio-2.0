import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { ACCENTS } from "../../tests/helpers/designSystem.ts";
import { startAgentServer } from "../../tests/helpers/agentServer.ts";

// Own release process and isolated storage only. Never attach to a user's app.
const repo = process.cwd();
const evidence = path.join(
  repo,
  "docs/changes/2026-09-22-ui-feature-parity/evidence/desktop",
);
const exe = path.join(repo, "src-tauri/target/release/kk-studio.exe");
const cdp = "http://127.0.0.1:9338";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "kk-ui-parity-desktop-"));
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

const agentFixture = await startAgentServer();
try {
  report.exe = { path: exe, sha256: sha(await fs.readFile(exe)) };
  await launch();
  await expect(page.locator(".preview-label")).toHaveText("桌面版");
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      json: [
        { id: "desktop", title: "桌面提示词", prompt: "保留产品形状与光影" },
      ],
    }),
  );
  await page.getByLabel("创作提示词").fill("桌面草稿");
  await page.getByRole("button", { name: "提示词库", exact: true }).click();
  let library = page.getByRole("dialog", { name: "提示词库" });
  await library.getByRole("button", { name: "加载来源" }).click();
  await library
    .getByRole("button", { name: "桌面提示词", exact: true })
    .click();
  await page.screenshot({
    path: path.join(evidence, "prompt-library.png"),
    animations: "disabled",
  });
  await library.getByRole("button", { name: "加入草稿" }).click();
  await expect(page.getByLabel("创作提示词")).toHaveValue(
    "桌面草稿\n\n保留产品形状与光影",
  );
  await navigate("项目库");
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const panel = page.locator(".conversation-panel");
  await panel.getByRole("button", { name: "本地 Agent", exact: true }).click();
  await panel.getByRole("button", { name: "连接设置", exact: true }).click();
  await page.getByLabel("Agent 地址").fill(agentFixture.url);
  await page
    .getByLabel("连接 Token", { exact: true })
    .fill("desktop-fixture-token");
  await page.getByRole("button", { name: "连接 Agent", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已连接", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  for (const theme of ["dark", "light"]) {
    for (const accent of ACCENTS) {
      const settings = await openSettings();
      await settings.getByRole("button", { name: "通用", exact: true }).click();
      await settings.getByLabel("主题", { exact: true }).selectOption(theme);
      await settings.getByLabel("强调色", { exact: true }).selectOption(accent);
      await page.keyboard.press("Escape");
      await expect(
        panel.getByLabel("Agent 权限", { exact: true }),
      ).toBeVisible();
      expect(
        await panel.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      report.matrix.push({ theme, accent, agentVisible: true });
    }
    await page.screenshot({
      path: path.join(evidence, `agent-${theme}.png`),
      animations: "disabled",
    });
  }
  await panel.getByLabel("Agent 指令").fill("读取当前画布");
  await panel.getByRole("button", { name: "发送给 Agent" }).click();
  await expect.poll(() => agentFixture.turns.length).toBe(1);
  expect(agentFixture.turns[0]).toMatchObject({
    messageText: "读取当前画布",
    permissionMode: "request",
    attachments: [],
  });
  await expect(
    panel.getByRole("button", { name: "Agent 执行中…" }),
  ).toBeDisabled();
  agentFixture.failActions(true);
  await panel.getByRole("button", { name: "停止", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("受控服务暂时不可用");
  agentFixture.failActions(false);
  await panel.getByRole("button", { name: "停止", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "发送给 Agent" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("canvas-agent-token")))
    .toBeNull();
  await page.screenshot({
    path: path.join(evidence, "agent-stopped.png"),
    animations: "disabled",
  });
  report.flows = {
    promptApplied: true,
    agentFixtureRequest: true,
    stopErrorAndRetry: true,
    tokenNotPersisted: true,
  };
  await closeOwnedApp();
  await launch();
  await page.getByRole("button", { name: "开始创作", exact: true }).click();
  await expect(page.getByLabel("创作提示词")).toHaveValue(
    "桌面草稿\n\n保留产品形状与光影",
  );
  await page.getByRole("button", { name: "提示词库", exact: true }).click();
  library = page.getByRole("dialog", { name: "提示词库" });
  await expect(library.getByRole("status")).toContainText("本地缓存");
  await page.keyboard.press("Escape");
  const settings = await openSettings();
  await settings.getByRole("button", { name: "网络", exact: true }).click();
  await expect(settings.getByLabel("连接 Token", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    settings.getByRole("button", { name: "连接 Agent", exact: true }),
  ).toBeVisible();
  report.restart = {
    draftPreserved: true,
    promptCachePreserved: true,
    tokenCleared: true,
    agentDisconnected: true,
  };
  expect(report.errors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  await agentFixture.close();
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
