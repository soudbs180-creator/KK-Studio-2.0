import assert from "node:assert/strict";
import { spawn, execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const isolated = await fs.mkdtemp(
  path.join(os.tmpdir(), "kk-project-landing-"),
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const output = path.join(root, "test-results/desktop/project-landing");
const cdp = "http://127.0.0.1:9345";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sharedPath = path.join(os.homedir(), ".kk-memory/memory.json");
const sharedBefore = await fs
  .readFile(sharedPath)
  .then(digest)
  .catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
const memoryPath = path.join(dataRoot, "memory/memory.json");
const report = {
  timestamp: new Date().toISOString(),
  mode: "Tauri release",
  checks: [],
  launches: [],
  errors: [],
  passed: false,
};
let app, browser, page;
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(output, { recursive: true });

async function available() {
  return fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
}
async function launch() {
  assert.equal(await available(), false, "Owned audit port must be free");
  app = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: false,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9345 --remote-debugging-address=127.0.0.1",
    },
  });
  await expect.poll(available, { timeout: 30000 }).toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((c) => c.pages())[0];
  assert(page, "Native WebView page missing");
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.waitForURL("http://tauri.localhost/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  const identity = await page.evaluate(async () => ({
    url: location.href,
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
    styles: [...document.styleSheets].map((s) => s.href).filter(Boolean),
    root: await window.__TAURI_INTERNALS__.invoke("get_storage_root"),
    memory: await window.__TAURI_INTERNALS__.invoke("memory_storage_info"),
  }));
  assert.equal(
    path.resolve(identity.root).toLowerCase(),
    dataRoot.toLowerCase(),
  );
  assert.equal(identity.memory.shared, false);
  assert.equal(
    path.resolve(identity.memory.path).toLowerCase(),
    memoryPath.toLowerCase(),
  );
  report.launches.push(identity);
}
async function close() {
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
  await expect.poll(available, { timeout: 10000 }).toBe(false);
}
async function expand() {
  const button = page.getByRole("button", { name: "展开侧边栏", exact: true });
  if (await button.isVisible()) await button.click();
}
async function memorySettings() {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "记忆", exact: true }).click();
  return dialog;
}
async function answerNative(answer) {
  await new Promise((resolve, reject) =>
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-File",
        path.join(root, "tests/desktop/native-confirm.ps1"),
        "-AppProcessId",
        String(app.pid),
        "-Answer",
        answer === "确认" ? "accept" : "cancel",
      ],
      { windowsHide: true, timeout: 15000, encoding: "utf8" },
      (error, stdout, stderr) =>
        error
          ? reject(new Error(`${error.message}\n${stderr}`))
          : resolve(stdout),
    ),
  );
}
try {
  await launch();
  await expect(page.locator(".sidebar .project-entry")).toHaveCount(0);
  for (const width of [390, 1099, 1920]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const metrics = await page.locator(".start-composer").evaluate((el) => {
      const box = el.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        overflow: document.documentElement.scrollWidth - innerWidth,
        actions: [...el.querySelectorAll(".composer-toolbar button")].map(
          (b) => b.getBoundingClientRect().height,
        ),
      };
    });
    assert.equal(metrics.height, 170);
    assert.equal(metrics.width, width === 390 ? 299 : 652);
    assert(metrics.overflow <= 1);
    assert.equal(metrics.actions.length, 6);
    assert(metrics.actions.every((height) => height === 24));
    report.checks.push({ viewport: width, home: metrics });
    await page.screenshot({ path: path.join(output, `home-${width}.png`) });
  }
  const dialog = await memorySettings();
  const toggle = dialog.getByRole("switch", { name: "记忆服务开关" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  assert.equal(
    await fs
      .stat(memoryPath)
      .then(() => true)
      .catch(() => false),
    false,
  );
  await toggle.click();
  await expect(
    dialog.getByText("仅当前数据目录", { exact: true }),
  ).toBeVisible();
  const preference = "本地验收偏好：使用简洁说明";
  await page.evaluate(
    async ({ content, fingerprint }) => {
      const invoke = window.__TAURI_INTERNALS__.invoke;
      const expected = await invoke("memory_read");
      const now = new Date().toISOString();
      await invoke("memory_write", {
        expected,
        store: {
          ...expected,
          records: [
            {
              id: "landing-preference",
              content,
              memoryType: "user_preference",
              confidence: 1,
              fingerprint,
              source: "manual_user",
              createdAt: now,
              updatedAt: now,
              active: true,
            },
          ],
        },
      });
    },
    { content: preference, fingerprint: digest(preference) },
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await memorySettings();
  await expect(page.locator(".settings-memory-section")).toContainText(
    preference,
  );
  await page.screenshot({ path: path.join(output, "memory-isolated.png") });
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await expand();
  await page
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const name = "项目落地原生验收";
  const input = page.getByRole("textbox", { name: "项目名称", exact: true });
  await input.fill(name);
  await input.press("Enter");
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  await expect(page.getByTestId(/^canvas-node-added-image-/)).toHaveCount(1);
  const canvas = page.getByTestId("infinite-canvas");
  await canvas.focus();
  await page.keyboard.press("Control+Z");
  await expect(page.getByTestId(/^canvas-node-added-image-/)).toHaveCount(0);
  await page.keyboard.press("Control+Y");
  await expect(page.getByTestId(/^canvas-node-added-image-/)).toHaveCount(1);
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + 40, box.y + 430, { button: "right" });
  let menu = page.getByRole("menu", { name: "画布菜单" });
  await menu.getByRole("menuitemcheckbox", { name: "网格吸附" }).click();
  await page.mouse.click(box.x + 40, box.y + 430, { button: "right" });
  menu = page.getByRole("menu", { name: "画布菜单" });
  await menu.getByRole("menuitem", { name: "图层管理" }).click();
  const layers = page.getByRole("region", { name: "画布图层" });
  await layers.getByRole("searchbox", { name: "搜索图层" }).fill("新图片");
  await expect(layers.getByRole("button", { name: /定位 新图片/ })).toHaveCount(
    1,
  );
  await page.screenshot({ path: path.join(output, "canvas-layers.png") });
  await expect
    .poll(
      async () =>
        (
          await page.evaluate(() =>
            window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
          )
        ).snapshot?.projects?.[0]?.items?.length,
    )
    .toBe(1);
  await close();
  await launch();
  await expand();
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId(/^canvas-node-added-image-/)).toHaveCount(1);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kk-canvas-ui-preferences-v1"))
          .snapEnabled,
    ),
    true,
  );
  await memorySettings();
  await expect(page.locator(".settings-memory-section")).toContainText(
    preference,
  );
  const deleteMemory = page
    .locator(".settings-memory-section")
    .getByRole("button", { name: /^删除记忆：/ });
  await deleteMemory.click();
  await answerNative("取消");
  await expect(page.locator(".settings-memory-section")).toContainText(
    preference,
  );
  await deleteMemory.click();
  await answerNative("确认");
  await expect(page.locator(".settings-memory-section")).not.toContainText(
    preference,
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  const entry = page
    .locator(".sidebar .project-entry")
    .filter({ hasText: name });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await entry.getByRole("menuitem", { name: "删除项目", exact: true }).click();
  await answerNative("取消");
  await expect(entry).toHaveCount(1);
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await entry.getByRole("menuitem", { name: "删除项目", exact: true }).click();
  await answerNative("确认");
  await expect(entry).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (
          await page.evaluate(() =>
            window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
          )
        ).snapshot?.projects?.length,
    )
    .toBe(0);
  await close();
  await launch();
  await expect(page.locator(".sidebar .project-entry")).toHaveCount(0);
  const sharedAfter = await fs
    .readFile(sharedPath)
    .then(digest)
    .catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
  assert.equal(
    sharedAfter,
    sharedBefore,
    "Isolated acceptance must not modify shared memory",
  );
  assert.deepEqual(report.errors, []);
  report.checks.push({
    memoryOffDoesNotRead: true,
    isolatedMemoryRetention: true,
    sharedMemoryUnchanged: true,
    nativeProjectRestartDelete: true,
    nativeConfirmationCancelAndAccept: true,
    nativeMemoryConfirmationCancelAndAccept: true,
    canvasHistorySnapLayers: true,
  });
  report.executableSha256 = digest(await fs.readFile(executable));
  report.passed = true;
} finally {
  await close().catch((e) => {
    report.shutdownError = String(e);
    app?.kill();
  });
  await fs.writeFile(
    path.join(output, "runtime.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(
  JSON.stringify({
    passed: report.passed,
    checks: report.checks,
    executableSha256: report.executableSha256,
  }),
);
