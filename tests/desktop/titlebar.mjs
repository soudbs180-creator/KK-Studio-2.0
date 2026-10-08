import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable =
  process.env.KK_TITLEBAR_EXE ??
  path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(root, ".tmp/titlebar", `desktop-${Date.now()}`);
const dataRoot = path.join(evidence, "data");
const profile = path.join(evidence, "webview");
const port = 9363;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
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
      /* Starting WebView2. */
    }
    if (ready) break;
    await pause(200);
  }
  assert(ready, "isolated Desktop CDP did not start");
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop page missing");
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".topbar")).toBeVisible();
  const actualDataRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(
    path.resolve(actualDataRoot).toLowerCase(),
    dataRoot.toLowerCase(),
    "Desktop test must use its isolated data root",
  );
  const native = (command) =>
    page.evaluate(
      (command) =>
        window.__TAURI_INTERNALS__.invoke(`plugin:window|${command}`, {
          label: "main",
        }),
      command,
    );
  await page.screenshot({ path: path.join(evidence, "initial.png") });
  assert.equal(
    await native("is_decorated"),
    false,
    "Desktop must not stack a native titlebar above its menu",
  );
  await expect(page.locator(".window-controls")).toBeVisible();
  await expect(page.locator(".topbar .preview-label")).toHaveCount(0);
  const geometry = await page.locator(".topbar").evaluate((header) => {
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return {
      header: rect(header),
      brand: rect(header.querySelector("strong")),
      menu: rect(header.querySelector("nav button")),
      controls: rect(header.querySelector(".window-controls")),
    };
  });
  assert.equal(geometry.header.height, 40);
  for (const key of ["brand", "menu", "controls"]) {
    assert(
      Math.abs(geometry[key].y + geometry[key].height / 2 - 20) <= 1,
      `${key} must share the titlebar centerline`,
    );
  }
  const file = page
    .getByRole("navigation", { name: "应用菜单" })
    .getByRole("button", { name: "文件", exact: true });
  await file.click();
  await expect(page.locator(".menu-popover")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(file).toBeFocused();
  assert.equal(
    await native("is_maximized"),
    false,
    "menu must not maximize the window",
  );
  const movement = JSON.parse(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-File",
        path.join(root, "tests/desktop/titlebar-drag.ps1"),
        "-ProcessId",
        String(child.pid),
        "-ClientX",
        String(Math.round(geometry.header.width / 2)),
        "-ClientY",
        "20",
      ],
      { windowsHide: true, encoding: "utf8" },
    ),
  );
  assert(
    movement.after.x - movement.before.x >= 50,
    "drag region must move the actual native window horizontally",
  );
  assert(
    movement.after.y - movement.before.y >= 30,
    "drag region must move the actual native window vertically",
  );
  assert.equal(await native("is_resizable"), true);
  await page.getByRole("button", { name: "最大化窗口", exact: true }).click();
  await expect.poll(() => native("is_maximized")).toBe(true);
  await page.getByRole("button", { name: "还原窗口", exact: true }).click();
  await expect.poll(() => native("is_maximized")).toBe(false);
  // Native Tauri drag regions handle a second mousedown as maximize/restore.
  const drag = page.locator(".topbar > strong");
  await drag.dispatchEvent("mousedown", { button: 0, buttons: 1, detail: 2 });
  await expect.poll(() => native("is_maximized")).toBe(true);
  await expect(
    page.getByRole("button", { name: "还原窗口", exact: true }),
  ).toBeVisible();
  await drag.dispatchEvent("mousedown", { button: 0, buttons: 1, detail: 2 });
  await expect.poll(() => native("is_maximized")).toBe(false);
  await page.getByRole("button", { name: "最小化窗口", exact: true }).click();
  await expect.poll(() => native("is_minimized")).toBe(true);
  // Restore only this isolated test process, without adding application permissions.
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class TitlebarTest { [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int n); }'; [TitlebarTest]::ShowWindowAsync((Get-Process -Id ${child.pid}).MainWindowHandle, 9) | Out-Null`,
    ],
    { windowsHide: true },
  );
  await expect.poll(() => native("is_minimized")).toBe(false);
  await page.screenshot({ path: path.join(evidence, "single-row.png") });
  await page
    .locator(".topbar")
    .screenshot({ path: path.join(evidence, "titlebar.png") });
  const runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document.querySelector("[data-runtime-mode]")?.dataset.runtimeMode,
    entry: document.querySelector("[data-runtime-entry]")?.dataset.runtimeEntry,
    scripts: [...document.scripts].map((script) => script.src),
    styles: [...document.styleSheets].map((style) => style.href),
  }));
  await writeFile(
    path.join(evidence, "receipt.json"),
    JSON.stringify(
      {
        executable,
        sha256: createHash("sha256")
          .update(await readFile(executable))
          .digest("hex"),
        geometry,
        movement,
        runtime,
        dataRoot,
        profile,
      },
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
  await expect.poll(() => child.exitCode, { timeout: 10000 }).toBe(0);
  console.log(`PASS real Desktop titlebar: ${evidence}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
