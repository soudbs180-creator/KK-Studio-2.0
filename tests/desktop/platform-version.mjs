import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(
  root,
  "test-results/desktop/platform-version/desktop-runtime.json",
);
const isolated = path.join(
  root,
  "src-tauri/target/platform-version-acceptance",
  String(Date.now()),
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "webview-profile");
const versions = JSON.parse(
  await readFile(path.join(root, "config/platform-versions.json"), "utf8"),
);
const port = 9343;

await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
await mkdir(path.dirname(evidence), { recursive: true });
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
      // The isolated WebView is still starting.
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
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  assert.equal(
    await page.evaluate(() => Boolean(window.__TAURI_INTERNALS__)),
    true,
  );
  await page.getByRole("button", { name: "个人信息", exact: true }).click();
  const popup = page.locator(".account-popup");
  await expect(popup).toContainText(`版本更新 v${versions.desktop}`);
  await popup.getByRole("button", { name: "检测", exact: true }).click();
  await expect(page.locator(".settings-version-current")).toHaveText(
    `当前版本 ${versions.desktop}`,
  );
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
  }));
  const executableSha256 = createHash("sha256")
    .update(await readFile(executable))
    .digest("hex");
  await writeFile(
    evidence,
    JSON.stringify(
      {
        runtime,
        dataRoot,
        profile,
        version: versions.desktop,
        executableSha256,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    JSON.stringify({ runtime, version: versions.desktop, executableSha256 }) +
      "\n",
  );
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
