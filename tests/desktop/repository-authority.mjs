import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { allocateTestEvidenceRun } from "../../scripts/testing/test-evidence.mjs";
import { headlessEdgeLaunchOptions } from "../../scripts/testing/headless-edge-options.mjs";
import { inspectDesktopRelease } from "../../scripts/windows/desktop-release.mjs";

assert.equal(process.platform, "win32", "Native acceptance requires Windows");
const root = process.cwd();
const evidence = allocateTestEvidenceRun("native-authority");
await fs.mkdir(evidence.artifactsDir);
const dataRoot = path.join(evidence.directory, "data");
const profile = path.join(evidence.directory, "webview");
const codexHome = path.join(evidence.directory, "codex-home");
await fs.mkdir(dataRoot);
await fs.mkdir(profile);
await fs.mkdir(codexHome);
const digest = (raw) => createHash("sha256").update(raw).digest("hex");
const sharedMemory = path.join(os.homedir(), ".kk-memory", "memory.json");
const sharedHash = async () =>
  fs
    .readFile(sharedMemory)
    .then(digest)
    .catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
const memoryBefore = await sharedHash();
const reservation = net.createServer();
await new Promise((resolve, reject) => {
  reservation.once("error", reject);
  reservation.listen(0, "127.0.0.1", resolve);
});
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const cdp = `http://127.0.0.1:${port}`;
const reachable = async (url) =>
  fetch(url, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
assert.equal(await reachable(`${cdp}/json/version`), false);
const report = {
  startedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  harnessSha256: digest(await fs.readFile(fileURLToPath(import.meta.url))),
  mode: "Tauri release",
  url: "http://tauri.localhost/",
  dataRoot,
  launches: [],
  checks: [],
  errors: [],
  passed: false,
};
let browser;
let page;
let ownedPage = false;
let endpoint;
let launchNumber = 0;
const invoke = (command, args) =>
  page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );
const windowCommand = (command) =>
  invoke(`plugin:window|${command}`, { label: "main" });
function ownedProcesses() {
  return JSON.parse(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Process -Filter \"Name='kk-studio.exe'\" | Where-Object { $_.ExecutablePath -eq $env:KK_AUDIT_EXE -and ($_.CommandLine.EndsWith(' --data-dir ' + $env:KK_AUDIT_DATA_ROOT) -or $_.CommandLine.EndsWith(' --data-dir \"' + $env:KK_AUDIT_DATA_ROOT + '\"')) } | Select-Object ProcessId, CreationDate, ExecutablePath, CommandLine)",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10_000,
        env: {
          ...process.env,
          KK_AUDIT_EXE: path.join(
            root,
            "src-tauri/target/release/kk-studio.exe",
          ),
          KK_AUDIT_DATA_ROOT: dataRoot,
        },
      },
    ),
  );
}
function foregroundWindow() {
  return JSON.parse(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class KkForegroundProbe { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId); }';
         $auditHandle = [KkForegroundProbe]::GetForegroundWindow();
         [uint32]$auditForegroundId = 0;
         [KkForegroundProbe]::GetWindowThreadProcessId($auditHandle, [ref]$auditForegroundId) | Out-Null;
         ConvertTo-Json -Compress @{ hwnd = $auditHandle.ToInt64().ToString('X'); processId = $auditForegroundId }`,
      ],
      { encoding: "utf8", windowsHide: true, timeout: 10_000 },
    ),
  );
}
async function launch() {
  const launchIndex = ++launchNumber;
  const launcherLog = await fs.open(
    path.join(evidence.artifactsDir, `launcher-${launchIndex}.log`),
    "wx",
  );
  // Detached WebView descendants may retain pipes after the launcher exits.
  const launcher = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "& $env:KK_AUDIT_LAUNCHER --background --data-dir $env:KK_AUDIT_DATA_ROOT; exit $LASTEXITCODE",
    ],
    {
      cwd: root,
      windowsHide: true,
      signal: AbortSignal.timeout(900_000),
      stdio: ["ignore", launcherLog.fd, launcherLog.fd],
      env: {
        ...process.env,
        KK_AUDIT_LAUNCHER: path.join(root, "start-kk-studio.bat"),
        KK_AUDIT_DATA_ROOT: dataRoot,
        CODEX_HOME: codexHome,
        WEBVIEW2_USER_DATA_FOLDER: profile,
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: [
          ...headlessEdgeLaunchOptions.args,
          `--remote-debugging-port=${port}`,
          "--remote-debugging-address=127.0.0.1",
        ].join(" "),
      },
    },
  );
  try {
    const [exitCode] = await once(launcher, "exit");
    assert.equal(exitCode, 0, "Official launcher must exit successfully");
  } finally {
    await launcherLog.close();
  }
  const release = inspectDesktopRelease(root);
  assert.equal(
    release.reason,
    "current",
    "Official launcher must produce a matching source receipt",
  );
  report.release = release;
  const processes = ownedProcesses();
  report.launches.push({ release, processes });
  assert.equal(processes.length, 1, "Exactly one owned executable must run");
  await expect
    .poll(() => reachable(`${cdp}/json/version`), { timeout: 30_000 })
    .toBe(true);
  if (!browser) browser = await chromium.connectOverCDP(cdp);
  const pages = browser.contexts().flatMap((context) => context.pages());
  assert.equal(pages.length, 1, "A repeated launch must keep one WebView");
  ownedPage = false;
  page = pages[0];
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  const actualRoot = await invoke("get_storage_root");
  assert.equal(
    path.resolve(actualRoot).toLowerCase(),
    path.resolve(dataRoot).toLowerCase(),
  );
  ownedPage = true;
  const descriptor = JSON.parse(
    await fs.readFile(
      path.join(dataRoot, "app/authority-endpoint.json"),
      "utf8",
    ),
  );
  report.launches.at(-1).authority = descriptor;
  return descriptor;
}

try {
  const first = await launch();
  endpoint = `http://127.0.0.1:${first.port}`;
  const health = await (
    await fetch(endpoint + "/health", { signal: AbortSignal.timeout(3000) })
  ).json();
  assert.equal(health.repositoryId, first.repositoryId);
  assert.equal(health.authorityEpoch, first.authorityEpoch);
  report.checks.push("Native owner health matches its repository and epoch");
  const rejected = await fetch(endpoint + "/activate", {
    method: "POST",
    signal: AbortSignal.timeout(3000),
    headers: {
      "content-type": "application/json",
      Origin: "https://kkai.plus",
    },
    body: JSON.stringify({
      repositoryId: first.repositoryId,
      authorityEpoch: first.authorityEpoch,
    }),
  });
  assert.equal(
    rejected.status,
    403,
    "Native activation does not authorize a website",
  );
  report.checks.push("Browser-origin activation rejected");
  const prompt = "隔离仓库重复启动与重开草稿";
  await page.getByLabel("创作提示词").fill(prompt);
  await page.getByLabel("创作提示词").blur();
  const snapshotFile = path.join(dataRoot, "projects/creation-v2.json");
  await expect
    .poll(async () => {
      try {
        return JSON.parse(await fs.readFile(snapshotFile, "utf8")).homeDraft
          .prompt;
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    })
    .toBe(prompt);
  const snapshotBefore = digest(await fs.readFile(snapshotFile));
  report.snapshotBefore = snapshotBefore;
  await windowCommand("minimize");
  await expect.poll(() => windowCommand("is_minimized")).toBe(true);
  report.foregroundBeforeActivation = foregroundWindow();
  const second = await launch();
  assert.equal(
    report.launches[1].processes[0].ProcessId,
    report.launches[0].processes[0].ProcessId,
    "Secondary launch must retain the original process",
  );
  assert.deepEqual(
    second,
    first,
    "Secondary launch must retain the original authority",
  );
  await expect.poll(() => windowCommand("is_minimized")).toBe(false);
  await expect
    .poll(() => windowCommand("is_focused"))
    .toBe(true)
    .catch((error) => report.errors.push(`Activation focus: ${error.message}`));
  report.focusObserved = await windowCommand("is_focused");
  report.foregroundAfterActivation = foregroundWindow();
  report.snapshotAfter = digest(await fs.readFile(snapshotFile));
  assert.equal(report.snapshotAfter, snapshotBefore);
  await expect(page.getByLabel("创作提示词")).toHaveValue(prompt);
  report.checks.push(
    "Repeated official launch restores the same window without changing data",
  );
  report.runtime = await page.evaluate(() => ({
    href: location.href,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
  }));
  await page.screenshot({
    path: path.join(evidence.artifactsDir, "owner-restored.png"),
  });
  await windowCommand("close").catch(() => {});
  await expect
    .poll(() => reachable(`${cdp}/json/version`), { timeout: 20_000 })
    .toBe(false);
  await expect.poll(() => reachable(endpoint + "/health")).toBe(false);
  await browser.close().catch(() => {});
  browser = undefined;
  page = undefined;
  const reopened = await launch();
  endpoint = `http://127.0.0.1:${reopened.port}`;
  assert.equal(reopened.repositoryId, first.repositoryId);
  assert.notEqual(reopened.authorityEpoch, first.authorityEpoch);
  await expect(page.getByLabel("创作提示词")).toHaveValue(prompt);
  report.checks.push(
    "True exit releases owner; reopening keeps repository identity and draft",
  );
  assert.equal(
    await sharedHash(),
    memoryBefore,
    "Global memory must remain unchanged",
  );
  report.checks.push("Global memory untouched");
  report.passed = report.errors.length === 0;
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.errors.push(error.stack ?? String(error));
  process.exitCode = 1;
} finally {
  if (page && ownedPage) {
    await windowCommand("close").catch(() => {});
    await expect
      .poll(() => reachable(`${cdp}/json/version`), { timeout: 20_000 })
      .toBe(false)
      .catch((error) => {
        report.errors.push(`Owned client cleanup failed: ${error.message}`);
        report.passed = false;
        process.exitCode = 1;
      });
  }
  if (browser) await browser.close().catch(() => {});
  try {
    report.cleanup = { remainingOwnedProcesses: ownedProcesses() };
    if (report.cleanup.remainingOwnedProcesses.length > 0) {
      report.errors.push(
        "Owned Native cleanup pending; evidence directory retained",
      );
      report.passed = false;
      process.exitCode = 1;
    }
  } catch (error) {
    report.errors.push(
      `Owned Native cleanup inspection failed: ${error.message}`,
    );
    report.passed = false;
    process.exitCode = 1;
  }
  report.memoryUnchanged = (await sharedHash()) === memoryBefore;
  if (!report.memoryUnchanged) {
    report.passed = false;
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(
    evidence.reportFile,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: report.checks,
      report: evidence.reportFile,
    }),
  );
}
