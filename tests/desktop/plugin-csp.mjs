import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidenceDir = path.join(
  root,
  "docs/changes/2026-09-29-plugin-desktop-csp/evidence",
);
const isolated = path.join(
  root,
  "src-tauri/target/plugin-csp-acceptance",
  String(Date.now()),
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "webview-profile");
const port = 9344;

await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
await mkdir(evidenceDir, { recursive: true });
assert.equal(
  (
    await readFile(path.join(root, "src-tauri/tauri.conf.json"), "utf8")
  ).includes("script-src 'self' 'wasm-unsafe-eval'"),
  true,
  "Desktop CSP must keep script-src self without blob",
);

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
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(`Desktop exited: ${child.exitCode}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
    } catch {
      // WebView2 is still starting.
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert(ready, "Desktop WebView2 CDP did not start");
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop WebView2 page missing");
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.waitForURL("http://tauri.localhost/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  const menu = page.locator(".add-node-menu");
  await expect(
    menu.getByRole("menuitem", { name: "SVG", exact: true }),
  ).toBeVisible();
  await menu.getByRole("menuitem", { name: "SVG", exact: true }).click();
  await expect(page.locator('[data-plugin-type="svg:vector"]')).toBeVisible();

  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await settings.getByRole("button", { name: "插件", exact: true }).click();
  const pluginRow = settings
    .locator(".plugin-manager-row")
    .filter({ hasText: "SVG" })
    .first();
  await expect(pluginRow).toBeVisible();
  await pluginRow.getByRole("switch").click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await expect(
    menu.getByRole("menuitem", { name: "SVG", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const settingsAgain = page.getByRole("dialog", { name: "设置" });
  await settingsAgain
    .getByRole("button", { name: "插件", exact: true })
    .click();
  await settingsAgain
    .locator(".plugin-manager-row")
    .filter({ hasText: "SVG" })
    .first()
    .getByRole("switch")
    .click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await expect(
    menu.getByRole("menuitem", { name: "SVG", exact: true }),
  ).toBeVisible();

  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.includes("/plugins/")),
  );
  assert(resources.some((name) => name.includes("/plugins/svg.js")));
  assert(resources.every((name) => !name.startsWith("blob:")));
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: path.join(evidenceDir, "desktop-plugin-csp.png"),
  });
  await writeFile(
    path.join(evidenceDir, "desktop-runtime.json"),
    `${JSON.stringify(
      {
        runtime: "Tauri release",
        url: page.url(),
        mode: await page
          .locator("[data-runtime-mode]")
          .getAttribute("data-runtime-mode"),
        entry: await page
          .locator("[data-runtime-entry]")
          .getAttribute("data-runtime-entry"),
        resources,
        dataRoot,
        profile,
        errors,
        csp: "script-src 'self' 'wasm-unsafe-eval'",
        plugin: "discover-add-render-disable-enable",
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ resources, dataRoot, profile, errors })}\n`,
  );
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
