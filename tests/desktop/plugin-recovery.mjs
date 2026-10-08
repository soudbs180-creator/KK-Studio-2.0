import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  addAndEditBundledPlugins,
  bundledPlugins,
  expectBundledPluginContents,
} from "../support/pluginFlow.mjs";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidenceDir =
  process.env.KK_PLUGIN_EVIDENCE_DIR ??
  path.join(root, "test-results/desktop/plugin-recovery", String(Date.now()));
const dataRoot = path.join(evidenceDir, "isolated/data");
const profile = path.join(evidenceDir, "isolated/webview-profile");
const snapshotPath = path.join(dataRoot, "projects/creation-v2.json");
const backupPath = path.join(dataRoot, "projects/creation-v2.json.bak");
const port = 9359;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receipt = {
  result: "FAIL",
  runtime: "Tauri release",
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim(),
  executable,
  executableSha256: sha256(await readFile(executable)),
  startedAt: new Date().toISOString(),
  dataRoot,
  profile,
  errors: [],
  consoleErrorDetails: [],
  requestFailures: [],
  resources: [],
  steps: [],
  processExits: [],
};
await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
const csp = JSON.parse(
  await readFile(path.join(root, "src-tauri/tauri.conf.json"), "utf8"),
).app.security.csp;
assert(csp.includes("script-src 'self' 'wasm-unsafe-eval'"));
assert(!/script-src[^;]*\bblob:/.test(csp));
receipt.csp = csp;
let child;
let browser;
let page;
let failure;

async function launch() {
  let busy = false;
  try {
    busy = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
  } catch {
    // An existing debug browser is never adopted or stopped.
  }
  assert(!busy, `Desktop CDP port ${port} is already occupied`);
  child = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
    },
  });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null)
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
  page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop WebView2 page missing");
  page.on("pageerror", (error) => receipt.errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") {
      receipt.errors.push(message.text());
      receipt.consoleErrorDetails.push({
        text: message.text(),
        location: message.location(),
        time: new Date().toISOString(),
        closing: receipt.closing === true,
      });
    }
  });
  page.on("requestfailed", (request) =>
    receipt.requestFailures.push({
      url: request.url(),
      failure: request.failure(),
      time: new Date().toISOString(),
      closing: receipt.closing === true,
    }),
  );
  receipt.closing = false;
  await page.waitForURL("http://tauri.localhost/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  const actualRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(path.resolve(actualRoot).toLowerCase(), dataRoot.toLowerCase());
  receipt.url = page.url();
  receipt.mode = await page
    .locator("[data-runtime-mode]")
    .getAttribute("data-runtime-mode");
  receipt.entry = await page
    .locator("[data-runtime-entry]")
    .getAttribute("data-runtime-entry");
}

async function stop(graceful = false) {
  if (child && child.exitCode === null && child.signalCode === null) {
    const owned = child;
    const exited = new Promise((resolve) =>
      owned.once("exit", (code, signal) => {
        receipt.processExits.push({ pid: owned.pid, code, signal });
        resolve();
      }),
    );
    if (graceful) {
      receipt.closing = true;
      await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
    } else owned.kill();
    for (
      let attempt = 0;
      attempt < 50 && owned.exitCode === null && owned.signalCode === null;
      attempt += 1
    )
      await Promise.race([exited, pause(200)]);
    assert(
      owned.exitCode !== null || owned.signalCode !== null,
      "Owned desktop process did not exit",
    );
    if (graceful)
      assert.equal(owned.exitCode, 0, "Native close must exit normally");
  }
  await browser?.close();
  browser = undefined;
  page = undefined;
  child = undefined;
  // The old owned WebView may finish after the native host exits. Wait for
  // its debug endpoint to close before restarting; never adopt that endpoint.
  await expect
    .poll(
      async () => {
        try {
          return !(
            await fetch(`http://127.0.0.1:${port}/json/version`, {
              signal: AbortSignal.timeout(1000),
            })
          ).ok;
        } catch {
          return true;
        }
      },
      { timeout: 10_000 },
    )
    .toBe(true);
}

async function openSavedProject() {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-card")).toHaveCount(1);
  await page.locator(".project-library-card").click();
  await expectBundledPluginContents(page);
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  receipt.resources.push(resources);
  for (const plugin of bundledPlugins)
    assert(
      resources.some(
        (name) => new URL(name).pathname === `/plugins/${plugin.file}`,
      ),
    );
  assert(
    resources
      .filter((name) => name.includes("/plugins/"))
      .every((name) => new URL(name).origin === "http://tauri.localhost"),
  );
  assert(resources.every((name) => !name.includes("esm.sh")));
}

try {
  await launch();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await addAndEditBundledPlugins(page);
  await expect
    .poll(async () => {
      try {
        const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
        return snapshot.projects[0].items.map(
          (item) => item.plugin?.metadata?.content,
        );
      } catch {
        return null;
      }
    })
    .toEqual(bundledPlugins.map((plugin) => plugin.content));
  // A first native save has no previous revision to back up. Commit and
  // restore one real content edit so the corruption test has an actual backup.
  const svg = bundledPlugins.find((plugin) => plugin.type === "svg:vector");
  const svgNode = page.locator('[data-plugin-type="svg:vector"]');
  for (const content of [svg.content + "\n", svg.content]) {
    await svgNode.getByTitle("编辑源码", { exact: true }).click();
    await svgNode.locator("textarea").fill(content);
    await svgNode.locator("textarea").press("Escape");
    await expect
      .poll(async () => {
        const saved = JSON.parse(await readFile(snapshotPath, "utf8"));
        return saved.projects[0].items.find(
          (item) => item.plugin?.type === svg.type,
        )?.plugin.metadata.content;
      })
      .toBe(content);
  }
  receipt.steps.push("four-plugins-edit-render-and-native-durable-save");
  await page.screenshot({ path: path.join(evidenceDir, "before-restart.png") });
  await stop(true);
  const original = await readFile(snapshotPath);
  const snapshot = JSON.parse(original);
  receipt.snapshotSha256 = sha256(original);
  await launch();
  await openSavedProject();
  await page.screenshot({ path: path.join(evidenceDir, "after-restart.png") });
  await stop(true);
  assert.deepEqual(
    JSON.parse(await readFile(snapshotPath, "utf8")).projects[0].items,
    snapshot.projects[0].items,
  );
  receipt.steps.push("fresh-process-restart-and-four-contents-recovered");

  // Mutate only this fixture's isolated snapshot, retaining a verified copy.
  const backup = await readFile(backupPath);
  const corrupt = structuredClone(snapshot);
  corrupt.projects[0].items[0].plugin.width = 0;
  const corruptBytes = Buffer.from(JSON.stringify(corrupt, null, 2));
  await writeFile(path.join(evidenceDir, "pristine-main.json"), original, {
    flag: "wx",
  });
  await writeFile(path.join(evidenceDir, "pristine-backup.json"), backup, {
    flag: "wx",
  });
  await writeFile(path.join(evidenceDir, "corrupt-input.json"), corruptBytes, {
    flag: "wx",
  });
  await writeFile(snapshotPath, corruptBytes);
  await launch();
  await expect(page.getByRole("alert")).toContainText(/原件|保护/);
  await page.getByLabel("创作提示词").fill("坏数据后的内存草稿");
  await page.getByRole("button", { name: "重新读取", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/原件|保护/);
  await page.screenshot({
    path: path.join(evidenceDir, "corrupt-protected.png"),
  });
  await stop(true);
  assert.deepEqual(await readFile(snapshotPath), corruptBytes);
  assert.deepEqual(await readFile(backupPath), backup);
  receipt.corruptSnapshotSha256 = sha256(corruptBytes);
  receipt.backupSha256 = sha256(backup);
  receipt.steps.push(
    "invalid-plugin-read-and-retry-protect-main-and-backup-bytes",
  );
  await writeFile(snapshotPath, original);
  await launch();
  await openSavedProject();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: path.join(evidenceDir, "original-restored.png"),
  });
  receipt.steps.push("restore-isolated-original-and-four-plugin-contents");
  await stop(true);
  assert.deepEqual(receipt.errors, []);
  receipt.result = "PASS";
} catch (error) {
  failure = error;
  receipt.failure = String(error);
  await page
    ?.screenshot({ path: path.join(evidenceDir, "failure.png") })
    .catch(() => {});
} finally {
  try {
    await stop();
  } catch (error) {
    failure ??= error;
    receipt.result = "FAIL";
    receipt.cleanupFailure = String(error);
  }
  receipt.completedAt = new Date().toISOString();
  await writeFile(
    path.join(evidenceDir, "desktop-runtime.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      result: receipt.result,
      sourceHead: receipt.sourceHead,
      steps: receipt.steps,
      errors: receipt.errors,
      evidenceDir,
    }),
  );
}
if (failure) throw failure;
