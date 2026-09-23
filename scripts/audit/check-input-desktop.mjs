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
  "docs/changes/2026-09-23-input-contract/evidence/desktop",
);
const exe = path.join(repo, "src-tauri/target/release/kk-studio.exe");
const cdp = "http://127.0.0.1:9338";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "kk-input-desktop-"));
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

async function inspectInput(kind) {
  const form = page.locator(`.${kind}-composer`),
    input = form.locator("textarea");
  await input.fill("清晰的输入区域\n文字与工具分别排列\n");
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(form).toHaveCSS("outline-width", "2px");
  await expect(input).toHaveCSS("font-size", "14px");
  await input.fill("多行内容与限制\n".repeat(20));
  expect((await input.boundingBox()).height).toBe(160);
  expect(await input.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await input.fill("正常输入，保留草稿");
  expect((await input.boundingBox()).height).toBe(60);
  const geometry = await form
    .locator(".composer-toolbar button")
    .evaluateAll((buttons) =>
      buttons
        .filter((el) => el.getClientRects().length)
        .map((el) => {
          const b = el.getBoundingClientRect(),
            image = el.querySelector("img"),
            i = image?.getBoundingClientRect();
          return {
            name: el.getAttribute("aria-label") || el.textContent,
            width: b.width,
            height: b.height,
            icon: i
              ? {
                  width: i.width,
                  height: i.height,
                  centerOffsetY: Math.abs(
                    i.y + i.height / 2 - b.y - b.height / 2,
                  ),
                }
              : null,
          };
        }),
    );
  for (const b of geometry) {
    expect(b.height).toBe(32);
    if (b.icon) expect(b.icon.centerOffsetY).toBeLessThanOrEqual(1);
  }
  return {
    kind,
    geometry,
    colors: await form.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        border: style.borderColor,
        background: style.backgroundColor,
        focus: style.outlineColor,
        text: getComputedStyle(el.querySelector("textarea")).color,
      };
    }),
  };
}
try {
  report.exe = { path: exe, sha256: sha(await fs.readFile(exe)) };
  await launch();
  for (const theme of ["dark", "light"]) {
    for (const accent of ACCENTS) {
      const settings = await openSettings();
      await settings.getByLabel("主题", { exact: true }).selectOption(theme);
      await settings.getByLabel("强调色", { exact: true }).selectOption(accent);
      await page.keyboard.press("Escape");
      report.matrix.push({ theme, accent, ...(await inspectInput("start")) });
    }
    await page.screenshot({ path: path.join(evidence, `home-${theme}.png`) });
  }
  const files = Array.from({ length: 4 }, (_, i) => ({
    name: `native-reference-${i}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  }));
  await page.locator(".start-composer input[type=file]").setInputFiles(files);
  await expect(
    page.locator(".start-composer .start-attachment-chip"),
  ).toHaveCount(4);
  await page
    .locator(".start-composer textarea")
    .fill("较长创意条件\n".repeat(20));
  const hero = await page.locator(".start-hero").boundingBox(),
    discovery = await page.locator(".start-discovery").boundingBox();
  expect(discovery.y).toBeGreaterThanOrEqual(hero.y + hero.height + 24);
  await page
    .locator(".start-composer")
    .screenshot({ path: path.join(evidence, "home-attachments.png") });
  await navigate("项目库");
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await page.getByLabel("对话内容", { exact: true }).fill("独立 Agent 草稿");
  await page.getByLabel("执行方式").selectOption("direct");
  await page.getByLabel("对话内容", { exact: true }).fill("独立 API 草稿");
  await page.getByLabel("执行方式").selectOption("codex");
  await expect(page.getByLabel("对话内容", { exact: true })).toHaveValue(
    "独立 Agent 草稿",
  );
  await page.getByLabel("执行方式").selectOption("direct");
  await expect(page.getByLabel("对话内容", { exact: true })).toHaveValue(
    "独立 API 草稿",
  );
  for (const theme of ["dark", "light"]) {
    for (const accent of ACCENTS) {
      const settings = await openSettings();
      await settings.getByLabel("主题", { exact: true }).selectOption(theme);
      await settings.getByLabel("强调色", { exact: true }).selectOption(accent);
      await page.keyboard.press("Escape");
      report.matrix.push({ theme, accent, ...(await inspectInput("chat")) });
    }
    await page.screenshot({ path: path.join(evidence, `chat-${theme}.png`) });
  }
  const form = page.locator(".chat-composer");
  await form.locator("input[type=file]").setInputFiles(files);
  await expect(form.locator(".start-attachment-chip")).toHaveCount(4);
  const attachment = await form.locator(".start-attachment-row").boundingBox(),
    actions = await form.locator(".composer-toolbar").boundingBox();
  expect(actions.y).toBeGreaterThanOrEqual(
    attachment.y + attachment.height + 7,
  );
  await form
    .getByRole("button", {
      name: "移除素材 native-reference-2.png",
      exact: true,
    })
    .click();
  await expect(form.locator(".start-attachment-chip")).toHaveCount(3);
  for (const name of ["模型", "Skill", "插件", "AI权限模式"]) {
    const trigger = form.getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  }
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(form.locator("textarea")).toHaveValue("正常输入，保留草稿");
  await expect(form.locator(".start-attachment-chip")).toHaveCount(3);
  await page.screenshot({
    path: path.join(evidence, "chat-attachments-final.png"),
  });
  expect(report.errors).toEqual([]);
  report.flows = {
    agentApiDraftIsolation: true,
    attachmentFlowAndRemove: true,
    menuEscapeFocus: true,
    foldPreservesDraft: true,
    homeDiscoveryFlow: true,
  };
  report.passed = true;
} catch (error) {
  report.failure = error.message;
  if (page)
    await page
      .screenshot({ path: path.join(evidence, "failure.png") })
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
