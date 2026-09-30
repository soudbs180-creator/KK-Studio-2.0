import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(root, "test-results/desktop/image-compare");
const isolated = path.join(
  root,
  "src-tauri/target/image-compare-acceptance",
  String(Date.now()),
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "webview-profile");
const port = 9342;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
await mkdir(evidence, { recursive: true });

const child = spawn(executable, ["--data-dir", dataRoot], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_USER_DATA_FOLDER: profile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
  },
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(`Desktop exited: ${child.exitCode}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
    } catch {
      // WebView2 is still starting.
    }
    if (ready) break;
    await pause(200);
  }
  assert(ready, "Desktop WebView2 CDP did not start");
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop WebView2 page missing");
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.waitForURL("http://tauri.localhost/");
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  const actualRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(path.resolve(actualRoot).toLowerCase(), dataRoot.toLowerCase());

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const fixture = path.join(root, "public/fixtures/demo/blue-hour.png");
  const first = page.getByTestId(/^canvas-node-added-image-/).first();
  await first.locator('input[type="file"]').first().setInputFiles(fixture);
  await expect(first.locator(".uploaded-image")).toBeVisible();
  await first.getByRole("button", { name: /加入对比/ }).click();
  await page.getByRole("button", { name: "添加资源" }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const second = page.getByTestId(/^canvas-node-added-image-/).last();
  await second.locator('input[type="file"]').first().setInputFiles(fixture);
  await expect(second.locator(".uploaded-image")).toBeVisible();
  await second.getByRole("button", { name: /加入对比/ }).click();
  const selection = page.getByRole("region", { name: "图片对比选择" });
  await expect(selection).toContainText("2/4");
  await selection.getByRole("button", { name: "打开对比" }).click();
  const dialog = page.getByRole("dialog", { name: "图片对比" });
  await expect(dialog.locator(".compare-pane")).toHaveCount(2);
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  await page.screenshot({ path: path.join(evidence, "compare-desktop.png") });
  await dialog.getByRole("button", { name: "滑块" }).click();
  const slider = dialog.getByRole("slider", { name: "对比位置" });
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("51");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  assert.deepEqual(errors, []);

  const runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document
      .querySelector("[data-runtime-mode]")
      ?.getAttribute("data-runtime-mode"),
    entry: document
      .querySelector("[data-runtime-entry]")
      ?.getAttribute("data-runtime-entry"),
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    styles: [...document.styleSheets]
      .map((sheet) => sheet.href)
      .filter(Boolean),
  }));
  const executableSha256 = createHash("sha256")
    .update(await readFile(executable))
    .digest("hex");
  await writeFile(
    path.join(evidence, "desktop-acceptance.json"),
    `${JSON.stringify({ runtime, dataRoot, executableSha256, errors, comparison: "PASS" }, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ runtime, dataRoot, executableSha256, errors })}\n`,
  );
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
