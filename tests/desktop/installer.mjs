import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import {
  fileIdentity,
  verifyInstaller,
  verifyInstalledFiles,
} from "../../scripts/windows/installer-receipt.mjs";

if (process.platform !== "win32")
  throw new Error("Windows installer audit only");
const receiptPath = process.argv[2];
if (!receiptPath)
  throw new Error("Usage: installer.mjs <installer-receipt.json>");
const root = process.cwd();
const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
const release = path.dirname(path.resolve(receiptPath));
const installer = await verifyInstaller(receipt, release);
const state = () =>
  JSON.parse(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-File",
        path.join(root, "tests/desktop/installer-state.ps1"),
        "-ProductName",
        "KK Studio",
      ],
      { encoding: "utf8", windowsHide: true },
    ),
  );
assert.deepEqual(state(), [], "An existing installation must not be changed");
const isolated = await fs.mkdtemp(
  path.join(os.tmpdir(), "kk-installer-audit space-"),
);
const installDirectory = path.join(isolated, "app");
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const output =
  process.env.KK_DESKTOP_AUDIT_OUTPUT ??
  path.join(root, "test-results/desktop/installer", path.basename(isolated));
await fs.mkdir(output, { recursive: true });
const cdp = "http://127.0.0.1:9358";
const report = {
  timestamp: new Date().toISOString(),
  receiptCommit: receipt.commit,
  isolated,
  platform: "Windows host with existing WebView2 (not a clean Windows VM)",
  installerSha256: receipt.installer.sha256,
  checks: [],
  launches: [],
  passed: false,
};
let app, browser, page;
let installed = false;

function ownedLocation(value) {
  assert.equal(
    path.resolve(String(value).replaceAll('"', "")).toLowerCase(),
    installDirectory.toLowerCase(),
    "Only the audit installation may be changed",
  );
}
async function run(filename, args) {
  const child = spawn(filename, args, {
    windowsHide: true,
    windowsVerbatimArguments: true,
    argv0: `"${filename}"`,
    stdio: "ignore",
    // Fail network dependency attempts without changing the user's network.
    env: {
      ...process.env,
      HTTP_PROXY: "http://127.0.0.1:9",
      HTTPS_PROXY: "http://127.0.0.1:9",
      ALL_PROXY: "http://127.0.0.1:9",
    },
  });
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Installer exit ${code}`)),
    );
  });
}
async function install() {
  for (const entry of state()) {
    assert.notEqual(
      entry.kind,
      "process",
      "A running portable application must not be terminated",
    );
    ownedLocation(entry.location);
  }
  // /D must be last. /NS avoids touching desktop and Start Menu shortcuts.
  await run(installer, ["/S", "/NS", `/D=${installDirectory}`]);
  installed = true;
  const entries = state();
  assert(
    entries.some((entry) => entry.kind === "uninstall"),
    "Uninstall registration missing",
  );
  for (const entry of entries) {
    assert.notEqual(entry.kind, "process");
    ownedLocation(entry.location);
    assert.equal(entry.hive, "CurrentUser");
    if (entry.kind === "uninstall")
      assert.equal(entry.version, receipt.versions.desktop);
  }
  report.checks.push({
    action: "install",
    verifiedFiles: await verifyInstalledFiles(receipt, installDirectory),
    entries,
  });
}
async function uninstall() {
  const entries = state();
  assert(entries.length > 0, "Owned uninstall registration missing");
  for (const entry of entries) {
    assert.notEqual(
      entry.kind,
      "process",
      "A running portable application must not be terminated",
    );
    ownedLocation(entry.location);
  }
  await run(path.join(installDirectory, "uninstall.exe"), ["/S"]);
  await expect
    .poll(() => state().filter((entry) => entry.kind === "uninstall"), {
      timeout: 30000,
    })
    .toEqual([]);
  await expect
    .poll(() =>
      fs.stat(path.join(installDirectory, "kk-studio.exe")).catch(() => null),
    )
    .toBeNull();
  installed = false;
  for (const entry of state()) {
    assert.equal(entry.kind, "settings");
    ownedLocation(entry.location);
  }
  report.checks.push({ action: "uninstall", registrationRemoved: true });
}
const available = () =>
  fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
async function launch(label) {
  assert.equal(await available(), false, "Audit debug port must be free");
  const exe = path.join(installDirectory, "kk-studio.exe");
  app = spawn(exe, ["--data-dir", dataRoot], {
    cwd: installDirectory,
    stdio: "ignore",
    windowsHide: false,
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9358 --remote-debugging-address=127.0.0.1 --host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE tauri.localhost, EXCLUDE localhost, EXCLUDE 127.0.0.1",
    },
  });
  await expect.poll(available, { timeout: 30000 }).toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  const identity = await page.evaluate(async () => ({
    url: location.href,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    root: await window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  }));
  assert.equal(
    path.resolve(identity.root).toLowerCase(),
    (await fs.realpath(dataRoot)).toLowerCase(),
  );
  report.launches.push({
    label,
    ...identity,
    executable: await fileIdentity(exe),
  });
  await page.screenshot({ path: path.join(output, `${label}.png`) });
}
async function close() {
  if (app && app.exitCode === null) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${app.pid}).CloseMainWindow() | Out-Null`,
      ],
      { windowsHide: true },
    );
    await expect.poll(() => app.exitCode, { timeout: 10000 }).not.toBeNull();
  }
  await browser?.close();
  await expect.poll(available, { timeout: 10000 }).toBe(false);
}
const snapshot = () =>
  page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
  );
const projectName = "安装器保留项目验收";
async function expectProject() {
  await expect
    .poll(async () => (await snapshot()).snapshot?.projects?.[0]?.name)
    .toBe(projectName);
}

try {
  const damaged = path.join(isolated, "damaged-setup.exe");
  await fs.copyFile(installer, damaged);
  const handle = await fs.open(damaged, "r+");
  try {
    await handle.write(Buffer.from("DAMAGED"), 0, 7, 256);
  } finally {
    await handle.close();
  }
  await assert.rejects(
    verifyInstaller(
      {
        ...receipt,
        installer: { ...receipt.installer, path: "damaged-setup.exe" },
      },
      isolated,
    ),
    /verification failed/,
  );
  report.checks.push({
    action: "damaged-package",
    refusedBeforeExecution: true,
  });
  await install();
  await launch("installed");
  const expand = page.getByRole("button", { name: "展开侧边栏", exact: true });
  if (await expand.isVisible()) await expand.click();
  await page
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const name = page.getByRole("textbox", { name: "项目名称", exact: true });
  await name.fill(projectName);
  await name.press("Enter");
  await expectProject();
  const agent = await page.evaluate(async () => {
    await window.__TAURI_INTERNALS__.invoke("agent_runtime_start");
    const status = await window.__TAURI_INTERNALS__.invoke(
      "agent_runtime_status",
    );
    await window.__TAURI_INTERNALS__.invoke("agent_runtime_stop");
    return status;
  });
  assert.equal(agent.healthy, true);
  report.checks.push({ action: "bundled-agent", healthy: agent.healthy });
  await close();
  await install();
  await launch("reinstalled");
  await expectProject();
  await close();
  // Damage a runtime resource in the owned installation; detect it, then
  // reinstall the verified package and prove the project remains readable.
  await fs.writeFile(
    path.join(installDirectory, "agent-runtime/desktop-entry.mjs"),
    "damaged audit file",
  );
  await assert.rejects(
    verifyInstalledFiles(receipt, installDirectory),
    /verification failed/,
  );
  await install();
  await launch("repaired");
  await expectProject();
  await close();
  await uninstall();
  assert.equal((await fs.stat(dataRoot)).isDirectory(), true);
  await install();
  await launch("restored-after-uninstall");
  await expectProject();
  await close();
  await uninstall();
  report.checks.push({
    action: "data-retention",
    reinstall: true,
    resourceRepair: true,
    uninstallReinstall: true,
    offlineScope:
      "App DNS blocked; installer uses existing WebView2 and invalid proxy",
    cleanWindowsWithoutWebView2: "NOT RUN",
    lowerVersionRollback: "NOT RUN",
  });
  report.passed = true;
} finally {
  await close().catch((error) => {
    report.shutdownError = String(error);
    app?.kill();
  });
  if (installed)
    await uninstall().catch((error) => {
      report.cleanupError = String(error);
      report.passed = false;
    });
  if (!installed) {
    try {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-File",
          path.join(root, "tests/desktop/installer-cleanup.ps1"),
          "-InstallDirectory",
          installDirectory,
        ],
        { windowsHide: true },
      );
      assert.deepEqual(
        state(),
        [],
        "Audit registry must return to its initial state",
      );
    } catch (error) {
      report.cleanupError = String(error);
      report.passed = false;
    }
  }
  await fs.writeFile(
    path.join(output, "runtime.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
assert.equal(report.passed, true, report.cleanupError);
console.log(
  JSON.stringify({ passed: report.passed, checks: report.checks, output }),
);
