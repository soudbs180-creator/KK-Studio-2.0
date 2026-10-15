import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { chromium, expect } from "@playwright/test";
import { inspectDesktopRelease } from "../../scripts/windows/desktop-release.mjs";

const root = process.cwd();
const runId = randomUUID();
const isolated = await fs.mkdtemp(path.join(os.tmpdir(), "kk-agent-recovery-"));
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "webview");
const codexHome = path.join(isolated, "codex-home");
const output = path.resolve(
  process.env.KK_AGENT_RECOVERY_OUTPUT ??
    path.join(root, "test-results/desktop/agent-startup-recovery", runId),
);
const cdpPort = 9346;
const cdp = `http://127.0.0.1:${cdpPort}`;
const providerId = `agent-recovery-${runId}`;
const syntheticSecret = `synthetic-${randomBytes(32).toString("hex")}`;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const secretHash = digest(syntheticSecret);
const report = {
  startedAt: new Date().toISOString(),
  mode: "Tauri release",
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  isolated,
  dataRoot,
  profile,
  codexHome,
  checks: [],
  launches: [],
  errors: [],
  observedModelTurnsAfterAttach: 0,
  startupTurnObservation:
    "NOT VERIFIED before CDP attachment; complete startup requests are covered by the loopback browser fixture",
  threadMutations: 0,
  unknownOwnership: "NOT VERIFIED; covered by the controlled browser fixture",
  credential: { providerId, secretSha256: secretHash, cleanupComplete: false },
  credentialScope:
    "Only this run's unique provider ID reaches the native vault; fixed Google credential probes return null and are NOT VERIFIED",
  passed: false,
};
let appIdentity;
let launcher;
let browser;
let page;
let claimedCredential = false;
let release;
const launcherLogs = [];
await Promise.all([
  fs.mkdir(output, { recursive: true }),
  fs.mkdir(profile, { recursive: true }),
  fs.mkdir(codexHome, { recursive: true }),
]);
const redact = (error) =>
  String(error instanceof Error ? error.message : error).replaceAll(
    syntheticSecret,
    "[redacted]",
  );
function check(name, value, detail = undefined) {
  report.checks.push({ name, passed: Boolean(value), detail });
  assert(value, name);
}
function powershell(command) {
  return execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    windowsHide: true,
    encoding: "utf8",
  });
}
function appProcesses() {
  const json = powershell(
    "@(Get-CimInstance Win32_Process -Filter \"Name = 'kk-studio.exe'\" | Select-Object ProcessId,ParentProcessId,ExecutablePath,CreationDate) | ConvertTo-Json -Compress",
  );
  return []
    .concat(JSON.parse(json || "[]") ?? [])
    .filter(
      (item) =>
        item.ExecutablePath?.toLowerCase() ===
        release.releaseExePath.toLowerCase(),
    );
}
function sameProcess(candidate) {
  return (
    candidate?.ProcessId === appIdentity?.ProcessId &&
    candidate?.CreationDate === appIdentity?.CreationDate &&
    candidate?.ExecutablePath === appIdentity?.ExecutablePath
  );
}
async function waitFor(predicate, message, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(message);
}
async function requireFreePort() {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () =>
      reject(new Error(`CDP port ${cdpPort} is occupied`)),
    );
    probe.listen(cdpPort, "127.0.0.1", () => probe.close(resolve));
  });
}
function requireOwnedCdp() {
  const tree = JSON.parse(
    powershell(
      "@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId) | ConvertTo-Json -Compress",
    ),
  );
  const owner = Number(
    powershell(
      `(Get-NetTCPConnection -LocalPort ${cdpPort} -State Listen -ErrorAction Stop | Select-Object -First 1).OwningProcess`,
    ).trim(),
  );
  const parents = new Map(
    tree.map((item) => [item.ProcessId, item.ParentProcessId]),
  );
  let current = owner;
  const visited = new Set();
  while (current && !visited.has(current)) {
    if (current === appIdentity.ProcessId) return;
    visited.add(current);
    current = parents.get(current);
  }
  throw new Error("CDP listener does not belong to the test application");
}
const invoke = (command, args = undefined) =>
  page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );

async function launch(tag) {
  await requireFreePort();
  assert.equal(
    appProcesses().length,
    0,
    "Candidate executable already has an open instance",
  );
  const env = {
    ...process.env,
    CODEX_HOME: codexHome,
    WEBVIEW2_USER_DATA_FOLDER: profile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${cdpPort} --remote-debugging-address=127.0.0.1`,
  };
  // The isolated Codex home must not inherit an API credential from the host.
  for (const key of Object.keys(env))
    if (/^(OPENAI_API_KEY|CODEX_API_KEY)$/i.test(key)) delete env[key];
  // Validate the same explicit CLI contract that the official launcher consumes.
  const official = await import("../../scripts/windows/desktop-release.mjs");
  const launcherPath = path.join(root, "start-kk-studio.bat");
  assert.equal(
    typeof official.parseDesktopLaunchArguments,
    "function",
    "Official launcher must support isolated --data-dir before this audit runs",
  );
  assert.deepEqual(
    official.parseDesktopLaunchArguments([
      "--background",
      "--data-dir",
      dataRoot,
    ]),
    ["--data-dir", dataRoot],
  );
  assert(
    !/["%\r\n]/.test(launcherPath + dataRoot),
    "Unsafe characters in CMD launch paths",
  );
  launcher = spawn(
    process.env.ComSpec ?? "cmd.exe",
    [
      "/d",
      "/v:off",
      "/s",
      "/c",
      `""${launcherPath}" --background --data-dir "${dataRoot}""`,
    ],
    {
      cwd: root,
      windowsHide: true,
      windowsVerbatimArguments: true,
      stdio: ["ignore", "pipe", "pipe"],
      env,
    },
  );
  const launchLog = { tag, text: "" };
  launcherLogs.push(launchLog);
  launcher.stdout.on("data", (chunk) => {
    launchLog.text += chunk.toString();
  });
  launcher.stderr.on("data", (chunk) => {
    launchLog.text += chunk.toString();
  });
  let failure;
  launcher.once("error", (error) => {
    failure = error;
  });
  await waitFor(
    () => {
      if (failure) throw failure;
      if (launcher.exitCode !== null && launcher.exitCode !== 0)
        throw new Error("Official desktop launcher failed");
      const found = appProcesses();
      assert(found.length <= 1, "Ambiguous new application processes");
      appIdentity = found[0];
      return Boolean(appIdentity);
    },
    "Official launcher did not create the candidate application",
    180000,
  );
  await waitFor(async () => {
    try {
      requireOwnedCdp();
      browser = await chromium.connectOverCDP(cdp);
      return true;
    } catch (error) {
      if (String(error).includes("does not belong")) throw error;
      return false;
    }
  }, "Owned WebView2 CDP did not become available");
  await waitFor(() => {
    page = browser
      .contexts()
      .flatMap((context) => context.pages())
      .find((candidate) => candidate.url().includes("tauri.localhost"));
    return Boolean(page);
  }, "Candidate Tauri page is missing");
  const isolateCredentialProbes = (ownedId) => {
    const bridge = window.__TAURI_INTERNALS__;
    const original = bridge.invoke.bind(bridge);
    bridge.invoke = (command, args = {}, ...rest) => {
      if (command === "credential_get" && args.providerId !== ownedId)
        return Promise.resolve(null);
      if (
        ["credential_set", "credential_delete"].includes(command) &&
        args.providerId !== ownedId
      )
        return Promise.reject(new Error("Unowned credential mutation refused"));
      if (
        command === "commit_provider_connection" &&
        (args.secret != null || args.clearSecret) &&
        args.providerId !== ownedId
      )
        return Promise.reject(new Error("Unowned credential commit refused"));
      return original(command, args, ...rest);
    };
  };
  await page.addInitScript(isolateCredentialProbes, providerId);
  await page.evaluate(isolateCredentialProbes, providerId);
  await page.route("**/agent/codex/turn", (route) => {
    report.observedModelTurnsAfterAttach++;
    return route.abort();
  });
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      request.method() === "POST" &&
      [
        "/agent/codex/threads/new",
        "/agent/codex/conversation/prepare",
      ].includes(pathname)
    )
      report.threadMutations++;
  });
  page.on("pageerror", (error) => report.errors.push(redact(error)));
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  const storageRoot = await invoke("get_storage_root");
  check(
    `storage-isolation-${tag}`,
    path.resolve(storageRoot).toLowerCase() ===
      path.resolve(dataRoot).toLowerCase(),
  );
  const memory = await invoke("memory_storage_info");
  check(
    `memory-isolation-${tag}`,
    memory.shared === false &&
      path
        .resolve(memory.path)
        .toLowerCase()
        .startsWith(path.resolve(dataRoot).toLowerCase() + path.sep),
  );
  const assets = await page
    .locator('script[type="module"][src],link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map(
        (element) =>
          element.getAttribute("src") || element.getAttribute("href"),
      ),
    );
  const loaded = [];
  for (const asset of assets.filter((asset) => asset?.startsWith("/assets/"))) {
    const bytes = await page.evaluate(
      async (url) =>
        Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
      asset,
    );
    const expected = await fs.readFile(path.join(root, "dist", asset.slice(1)));
    check(
      `loaded-asset-${tag}-${path.basename(asset)}`,
      digest(Buffer.from(bytes)) === digest(expected),
    );
    loaded.push({ path: asset, sha256: digest(expected) });
  }
  const currentRelease = inspectDesktopRelease(root);
  check(`release-identity-${tag}`, currentRelease.reason === "current");
  if (report.launches.length === 0) {
    release = currentRelease;
    report.release = release;
    report.receiptSha256 = digest(await fs.readFile(release.receiptPath));
  } else {
    check(
      `release-unchanged-${tag}`,
      currentRelease.executableSha256 === release.executableSha256 &&
        currentRelease.inputSha256 === release.inputSha256,
    );
  }
  report.launches.push({ tag, ...appIdentity, url: page.url(), loaded });
  await fs.writeFile(
    path.join(output, `launcher-${tag}.log`),
    launchLog.text,
    "utf8",
  );
}

async function closeApp(force = false) {
  if (!appIdentity) return;
  const owned = appProcesses().find(sameProcess);
  if (owned) {
    if (force) {
      execFileSync("taskkill", ["/PID", String(owned.ProcessId), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      powershell(
        `(Get-Process -Id ${owned.ProcessId} -ErrorAction Stop).CloseMainWindow() | Out-Null`,
      );
    }
    await waitFor(
      () => !appProcesses().some(sameProcess),
      "Owned application did not close",
      20000,
    );
  }
  await browser?.close().catch(() => undefined);
  browser = undefined;
  page = undefined;
  appIdentity = undefined;
  await waitFor(
    async () => {
      try {
        await requireFreePort();
        return true;
      } catch {
        return false;
      }
    },
    "Owned CDP listener remained after close",
    15000,
  );
}
async function settings() {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "模型接入", exact: true })
    .click();
  return page.locator(".settings-agent-card").filter({
    has: page.getByRole("heading", { name: /Codex 主 Agent/ }),
  });
}
async function connected(card) {
  await expect(
    card.getByRole("button", { name: "已连接", exact: true }),
  ).toBeDisabled({ timeout: 60000 });
}
async function snapshot() {
  const loaded = await invoke("read_creation_snapshot");
  return (
    loaded.snapshot ?? { projects: [], activeProjectId: null, revision: 0 }
  );
}
async function serviceConversation() {
  return page.evaluate(async () => {
    const credentials = await window.__TAURI_INTERNALS__.invoke(
      "agent_runtime_start",
    );
    const health = await (
      await fetch(credentials.endpoint + "/health", {
        headers: { "x-canvas-agent-token": credentials.token },
      })
    ).json();
    return { threadId: health.conversation?.threadId, busy: health.codexBusy };
  });
}
async function evidence(tag, card) {
  await card.screenshot({ path: path.join(output, `${tag}.png`) });
  const dom = await card.evaluate((element) => ({
    text: element.textContent,
    buttons: [...element.querySelectorAll("button")].map((button) => ({
      text: button.textContent,
      disabled: button.disabled,
    })),
    fields: [...element.querySelectorAll("input")].map((input) => ({
      label: input.getAttribute("aria-label"),
      type: input.type,
      disabled: input.disabled,
    })),
  }));
  await fs.writeFile(
    path.join(output, `${tag}.dom.json`),
    JSON.stringify(dom, null, 2),
    "utf8",
  );
}
function zipEntries(bytes) {
  let end = bytes.length - 22;
  while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  assert(end >= 0, "Export ZIP directory is missing");
  let offset = bytes.readUInt32LE(end + 16);
  const count = bytes.readUInt16LE(end + 10);
  const entries = [];
  for (let index = 0; index < count; index++) {
    assert.equal(
      bytes.readUInt32LE(offset),
      0x02014b50,
      "Invalid ZIP directory entry",
    );
    const method = bytes.readUInt16LE(offset + 10);
    const compressed = bytes.readUInt32LE(offset + 20);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const local = bytes.readUInt32LE(offset + 42);
    const name = bytes
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");
    assert.equal(
      bytes.readUInt32LE(local),
      0x04034b50,
      "Invalid ZIP local entry",
    );
    const start =
      local +
      30 +
      bytes.readUInt16LE(local + 26) +
      bytes.readUInt16LE(local + 28);
    const data = bytes.subarray(start, start + compressed);
    assert([0, 8].includes(method), "Unsupported export compression");
    entries.push({ name, bytes: method === 8 ? inflateRawSync(data) : data });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

try {
  assert.equal(
    process.platform,
    "win32",
    "Windows acceptance requires Windows",
  );
  release = inspectDesktopRelease(root);
  report.initialRelease = release;
  report.scriptSha256 = digest(await fs.readFile(new URL(import.meta.url)));
  report.versions = JSON.parse(
    await fs.readFile(path.join(root, "config/platform-versions.json"), "utf8"),
  );
  await launch("first");
  let card = await settings();
  await expect(card).toContainText("已就绪", { timeout: 60000 });
  const homeRuntime = await invoke("agent_runtime_status");
  check("home-auto-start-service", homeRuntime.running && homeRuntime.healthy);
  check("home-keeps-empty-projects", (await snapshot()).projects.length === 0);
  check(
    "home-does-not-create-agent-conversation",
    !(await serviceConversation()).threadId && report.threadMutations === 0,
  );
  await evidence("home-ready", card);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  const expand = page.getByRole("button", { name: "展开侧边栏", exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .getByRole("button", { name: "新建项目", exact: true })
    .first()
    .click();
  card = await settings();
  await connected(card);
  const stored = await snapshot();
  const projectId = stored.activeProjectId;
  const threadId = stored.projects.find(
    (project) => project.id === projectId,
  )?.agentThreadId;
  check(
    "project-auto-connect-persists-thread",
    typeof threadId === "string" &&
      threadId.length > 0 &&
      (await serviceConversation()).threadId === threadId,
  );
  check(
    "auto-connect-no-observed-turn-after-attach",
    report.observedModelTurnsAfterAttach === 0,
  );
  check(
    "credential-id-was-absent",
    (await invoke("credential_get", { providerId })) === null,
  );
  claimedCredential = true;
  check(
    "synthetic-system-credential-set",
    await invoke("credential_set", { providerId, secret: syntheticSecret }),
  );
  await evidence("project-connected", card);
  await page.reload();
  card = await settings();
  await connected(card);
  check(
    "reload-retains-thread",
    (await snapshot()).projects.find((project) => project.id === projectId)
      ?.agentThreadId === threadId &&
      (await serviceConversation()).threadId === threadId,
  );
  await evidence("reload-connected", card);
  await closeApp();
  await launch("reopen");
  card = await settings();
  await connected(card);
  check(
    "normal-close-reopen-retains-thread",
    (await snapshot()).projects.find((project) => project.id === projectId)
      ?.agentThreadId === threadId &&
      (await serviceConversation()).threadId === threadId,
  );
  await evidence("reopen-connected", card);
  const credentialProof = await page.evaluate(
    async ({ providerId, expectedHash }) => {
      const value = await window.__TAURI_INTERNALS__.invoke("credential_get", {
        providerId,
      });
      const hash =
        value === null
          ? null
          : [
              ...new Uint8Array(
                await crypto.subtle.digest(
                  "SHA-256",
                  new TextEncoder().encode(value),
                ),
              ),
            ]
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
      return {
        exists: value !== null,
        sha256: hash,
        matches: hash === expectedHash,
        absentFromLocalStorage:
          value === null || !JSON.stringify(localStorage).includes(value),
      };
    },
    { providerId, expectedHash: secretHash },
  );
  report.credential.reopen = credentialProof;
  check(
    "system-credential-reopens-with-same-hash",
    credentialProof.exists && credentialProof.matches,
  );
  check(
    "credential-is-absent-from-local-storage",
    credentialProof.absentFromLocalStorage,
  );
  const exportPath = path.join(output, "isolated-project.kkstudio.zip");
  await invoke("export_project_package", {
    destination: exportPath,
    expectedRevision: (await snapshot()).revision,
  });
  const exported = await fs.readFile(exportPath);
  const entries = zipEntries(exported);
  check(
    "credential-is-absent-from-export",
    entries.every(
      (entry) => !entry.bytes.includes(Buffer.from(syntheticSecret)),
    ),
  );
  report.export = {
    sha256: digest(exported),
    files: entries.map((entry) => entry.name),
  };
  await card.getByRole("button", { name: "断开", exact: true }).click();
  await page.reload();
  card = await settings();
  await expect(
    card.getByRole("button", { name: "重新连接", exact: true }),
  ).toBeEnabled();
  check(
    "explicit-disconnect-pauses-after-reload",
    await page.evaluate(
      () => localStorage.getItem("kk-agent-auto-connect") === "disabled",
    ),
  );
  await evidence("disconnect-paused-reload", card);
  await closeApp();
  await launch("paused-reopen");
  card = await settings();
  await expect(
    card.getByRole("button", { name: "重新连接", exact: true }),
  ).toBeEnabled();
  check(
    "explicit-disconnect-pauses-after-normal-reopen",
    await page.evaluate(
      () => localStorage.getItem("kk-agent-auto-connect") === "disabled",
    ),
  );
  await evidence("disconnect-paused-reopen", card);
  await card.getByRole("button", { name: "重新连接", exact: true }).click();
  await connected(card);
  check(
    "manual-reconnect-retains-thread",
    (await snapshot()).projects.find((project) => project.id === projectId)
      ?.agentThreadId === threadId &&
      (await serviceConversation()).threadId === threadId,
  );
  await evidence("manual-reconnected", card);
  await card.getByText("高级连接选项", { exact: true }).click();
  await card.getByRole("button", { name: "停止服务", exact: true }).click();
  await expect(card).toContainText("服务已停止");
  check(
    "stop-preserves-thread",
    (await snapshot()).projects.find((project) => project.id === projectId)
      ?.agentThreadId === threadId,
  );
  await evidence("service-stopped", card);
  await card.getByRole("button", { name: "重新连接", exact: true }).click();
  await connected(card);
  check(
    "service-restart-retains-thread",
    (await snapshot()).projects.find((project) => project.id === projectId)
      ?.agentThreadId === threadId &&
      (await serviceConversation()).threadId === threadId,
  );
  check(
    "no-observed-model-turn-after-each-cdp-attach",
    report.observedModelTurnsAfterAttach === 0,
  );
  await evidence("service-restarted", card);
  const beforeUnknown = report.threadMutations;
  const serviceIdentity = await invoke("agent_runtime_status");
  const original = await snapshot();
  await invoke("write_creation_snapshot", {
    expectedRevision: original.revision,
    snapshot: {
      ...original,
      revision: original.revision + 1,
      projects: original.projects.map((project) => {
        if (project.id !== projectId) return project;
        const retained = { ...project };
        delete retained.agentThreadId;
        return retained;
      }),
    },
  });
  await page.evaluate(
    (id) => localStorage.removeItem("kk-agent-thread:" + id),
    projectId,
  );
  await page.reload();
  card = await settings();
  await expect(card.getByRole("alert")).toContainText("服务已有其他会话", {
    timeout: 60000,
  });
  const preserved = await serviceConversation();
  check(
    "unknown-ownership-does-not-create-or-replace-thread",
    preserved.threadId === threadId && report.threadMutations === beforeUnknown,
  );
  check(
    "unknown-ownership-keeps-owned-service",
    (await invoke("agent_runtime_status")).pid === serviceIdentity.pid,
  );
  report.unknownOwnership =
    "PASS; missing association simulated only in the isolated native snapshot";
  await evidence("unknown-owner-refused", card);
  report.passed = report.errors.length === 0;
} catch (error) {
  report.errors.push(redact(error));
} finally {
  if (claimedCredential) {
    try {
      if (!page || page.isClosed()) await launch("credential-cleanup");
      const cleanupOwner = await page.evaluate(
        async ({ providerId, expectedHash }) => {
          const value = await window.__TAURI_INTERNALS__.invoke(
            "credential_get",
            { providerId },
          );
          if (value === null) return true;
          const hash = [
            ...new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(value),
              ),
            ),
          ]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          return hash === expectedHash;
        },
        { providerId, expectedHash: secretHash },
      );
      assert(
        cleanupOwner,
        "Synthetic credential changed; cleanup refused to delete another value",
      );
      await invoke("credential_delete", { providerId });
      check(
        "synthetic-credential-cleanup",
        (await invoke("credential_get", { providerId })) === null,
      );
      report.credential.cleanupComplete = true;
    } catch (error) {
      report.errors.push(`Synthetic credential cleanup: ${redact(error)}`);
    }
  }
  try {
    await closeApp();
  } catch (error) {
    report.errors.push(`Normal close: ${redact(error)}`);
    try {
      await closeApp(true);
    } catch (reason) {
      report.errors.push(`Owned process cleanup: ${redact(reason)}`);
    }
  }
  report.completedAt = new Date().toISOString();
  report.passed =
    report.passed &&
    report.errors.length === 0 &&
    (!claimedCredential || report.credential.cleanupComplete);
  for (const log of launcherLogs)
    await fs.writeFile(
      path.join(output, `launcher-${log.tag}.log`),
      log.text,
      "utf8",
    );
  await fs.writeFile(
    path.join(output, "receipt.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checks: report.checks.map(({ name, passed }) => ({ name, passed })),
        errors: report.errors,
        evidence: output,
        credentialCleanupComplete: report.credential.cleanupComplete,
      },
      null,
      2,
    ),
  );
  process.exitCode = report.passed ? 0 : 1;
}
