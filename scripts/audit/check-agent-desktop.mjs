import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import {
  checkPackagedMcp,
  ownedTree,
  processes,
} from "./agent-native-checks.mjs";

const repo = process.cwd();
const exe =
  process.env.KK_AGENT_TEST_EXE ||
  path.join(repo, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(
  repo,
  "docs/changes/2026-09-22-agent-desktop/evidence",
);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "kk-agent-desktop-"));
const data = path.join(temporary, "data");
const profile = path.join(temporary, "webview");
const cdp = "http://127.0.0.1:9345";
const report = {
  date: new Date().toISOString(),
  mode: "Tauri release",
  data,
  launches: [],
  checks: [],
  errors: [],
  passed: false,
};
const sha = (value) => createHash("sha256").update(value).digest("hex");
let app, browser, page, owned;
const listening = async (url) =>
  fetch(url, { signal: AbortSignal.timeout(700) })
    .then((response) => response.ok)
    .catch(() => false);
const ipc = (command) =>
  page.evaluate(
    (command) => window.__TAURI_INTERNALS__.invoke(command),
    command,
  );

async function launch() {
  if (await listening(cdp + "/json/version"))
    throw Error("Audit port 9345 is occupied");
  app = spawn(exe, ["--data-dir", data], {
    cwd: path.dirname(exe),
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9345 --remote-debugging-address=127.0.0.1",
    },
  });
  await expect
    .poll(() => listening(cdp + "/json/version"), { timeout: 20000 })
    .toBe(true);
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
      { timeout: 20000 },
    )
    .toBe(true);
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame())
      console.log("Top frame navigated: " + frame.url());
  });
  page.on("crash", () => report.errors.push("WebView renderer crashed"));
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  expect(path.resolve(await ipc("get_storage_root"))).toBe(path.resolve(data));
  const assets = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map(
        (element) =>
          element.getAttribute("src") || element.getAttribute("href"),
      ),
    );
  const loaded = [];
  for (const asset of assets.filter((asset) => asset.startsWith("/assets/"))) {
    const actual = await page.evaluate(
      async (url) =>
        Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
      asset,
    );
    const expected = await fs.readFile(path.join(repo, "dist", asset.slice(1)));
    expect(sha(Buffer.from(actual))).toBe(sha(expected));
    loaded.push({ path: asset, sha256: sha(expected) });
  }
  report.launches.push({ pid: app.pid, url: page.url(), loaded });
}

async function close(force = false) {
  const tree = owned?.pid ? ownedTree(owned.pid) : [];
  if (app && app.exitCode === null && app.signalCode === null) {
    if (force) app.kill();
    else
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `(Get-Process -Id ${app.pid} -ErrorAction Stop).CloseMainWindow() | Out-Null`,
        ],
        { windowsHide: true },
      );
    await expect
      .poll(() => app.exitCode !== null || app.signalCode !== null, {
        timeout: 15000,
      })
      .toBe(true);
  }
  await browser?.close();
  browser = undefined;
  await expect
    .poll(() => listening(cdp + "/json/version"), { timeout: 15000 })
    .toBe(false);
  if (owned)
    await expect
      .poll(() => listening(owned.endpoint + "/health"), { timeout: 10000 })
      .toBe(false);
  if (tree.length) {
    await expect
      .poll(
        () => {
          const live = new Set(processes().map((item) => item.ProcessId));
          return tree.filter((item) => live.has(item.ProcessId));
        },
        { timeout: 10000 },
      )
      .toEqual([]);
    report.checks.push(
      `${force ? "forced" : "normal"} exit reclaimed ${tree.length} owned processes`,
    );
  }
}

async function openSettings() {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "网络", exact: true }).click();
  return page.getByRole("region", { name: "桌面 Agent 服务" });
}

try {
  await fs.mkdir(evidence, { recursive: true });
  report.exe = { path: exe, sha256: sha(await fs.readFile(exe)) };
  report.externalAgentBefore = await listening("http://127.0.0.1:17381/health");
  await launch();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  let panel = await openSettings();
  await expect(panel.getByRole("button", { name: "启动并连接" })).toBeEnabled();
  await panel.getByRole("button", { name: "启动并连接" }).click();
  await expect(
    page.getByRole("button", { name: "已连接", exact: true }),
    "real packaged Codex should connect",
  ).toBeDisabled({ timeout: 90000 });
  owned = await ipc("agent_runtime_status");
  expect(owned.running && owned.healthy).toBe(true);
  const duplicatePid = await page.evaluate(
    async () =>
      (await window.__TAURI_INTERNALS__.invoke("agent_runtime_start")).pid,
  );
  expect(duplicatePid).toBe(owned.pid);
  const configuration = JSON.parse(
    await fs.readFile(path.join(data, "app/agent/canvas-agent.json"), "utf8"),
  );
  expect(configuration.token).toBe("");
  const persistedSecret = await page.evaluate(() => {
    const token = document.querySelector("#agent-token").value;
    return (
      token.length > 0 &&
      Object.values(localStorage).some((value) => value.includes(token))
    );
  });
  expect(persistedSecret).toBe(false);
  await page.screenshot({
    path: path.join(evidence, "desktop-agent-connected.png"),
  });
  report.checks.push(
    "packaged runtime start, authenticated connection, repeated start identity, no persisted token",
  );
  const token = await page.locator("#agent-token").inputValue();
  report.mcp = await checkPackagedMcp(exe, data, token);
  report.checks.push("packaged stdio MCP returned the actual KK canvas state");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  if (process.argv.includes("--real")) {
    await page
      .getByLabel("对话内容")
      .fill(
        "这是桌面连接验收，请仅回复 KK_DESKTOP_READY，不执行工具或生成图片。",
      );
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(
      page
        .locator(".chat-agent-item.is-assistant")
        .filter({ hasText: "KK_DESKTOP_READY" }),
    ).toBeVisible({ timeout: 120000 });
    await page.screenshot({
      path: path.join(evidence, "desktop-real-codex.png"),
    });
    report.checks.push("real Codex reply through desktop composer");
  }
  const threadBefore = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) =>
      key.startsWith("kk-agent-thread:"),
    ),
  );
  await expect
    .poll(
      async () => {
        const health = await (await fetch(owned.endpoint + "/health")).json();
        return (
          !health.codexBusy &&
          !["preparing", "running"].includes(health.conversation?.status)
        );
      },
      { timeout: 30000 },
    )
    .toBe(true);
  panel = await openSettings();
  await panel.getByRole("button", { name: "停止服务", exact: true }).click();
  await expect(panel).toContainText("服务已停止");
  console.log("Native stop acknowledged");
  await expect.poll(() => listening(owned.endpoint + "/health")).toBe(false);
  await panel.getByRole("button", { name: "启动并连接" }).click();
  await expect(
    page.getByRole("button", { name: "已连接", exact: true }),
  ).toBeDisabled({ timeout: 90000 });
  const restarted = await ipc("agent_runtime_status");
  expect(restarted.pid).not.toBe(owned.pid);
  owned = restarted;
  expect(
    await page.evaluate(() =>
      Object.entries(localStorage).filter(([key]) =>
        key.startsWith("kk-agent-thread:"),
      ),
    ),
  ).toEqual(threadBefore);
  report.checks.push(
    "stop/start uses a fresh process and preserves project thread identity",
  );
  await close();
  report.checks.push("normal window close reclaims owned service");
  await launch();
  expect((await ipc("agent_runtime_status")).running).toBe(false);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  panel = await openSettings();
  await panel.getByRole("button", { name: "启动并连接" }).click();
  await expect(
    page.getByRole("button", { name: "已连接", exact: true }),
  ).toBeDisabled({ timeout: 90000 });
  owned = await ipc("agent_runtime_status");
  expect(
    await page.evaluate(() =>
      Object.entries(localStorage).filter(([key]) =>
        key.startsWith("kk-agent-thread:"),
      ),
    ),
  ).toEqual(threadBefore);
  await close(true);
  report.checks.push(
    "second app launch restores thread; forced owner exit reclaims service",
  );
  report.externalAgentAfter = await listening("http://127.0.0.1:17381/health");
  expect(report.externalAgentAfter).toBe(report.externalAgentBefore);
  report.passed = report.errors.length === 0;
} catch (error) {
  report.errors.push(String(error));
  await page
    ?.screenshot({ path: path.join(evidence, "desktop-agent-failure.png") })
    .catch(() => {});
  throw error;
} finally {
  await close().catch((error) => report.errors.push(String(error)));
  await fs.mkdir(evidence, { recursive: true });
  await fs.writeFile(
    path.join(
      evidence,
      process.argv.includes("--real")
        ? "desktop-runtime.json"
        : "desktop-empty-runtime.json",
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checks: report.checks.length,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
}
