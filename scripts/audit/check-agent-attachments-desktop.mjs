import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";

const repo = process.cwd();
const exe =
  process.env.KK_AGENT_TEST_EXE ||
  path.join(repo, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(
  repo,
  "docs/changes/2026-09-23-agent-attachments/evidence",
);
const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), "kk-agent-attachments-"),
);
const data = path.join(temporary, "data");
const cdp = "http://127.0.0.1:9345";
const sha = (value) => createHash("sha256").update(value).digest("hex");
const alive = async (url) =>
  fetch(url, { signal: AbortSignal.timeout(700) })
    .then((r) => r.ok)
    .catch(() => false);
const report = {
  date: new Date().toISOString(),
  mode: "Tauri release",
  data,
  checks: [],
  errors: [],
  passed: false,
};
let app, browser, page, client, endpoint;
const ipc = (command) =>
  page.evaluate(
    (command) => window.__TAURI_INTERNALS__.invoke(command),
    command,
  );
async function mcp(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError)
    throw Error(
      "MCP tool failed: " +
        name +
        ": " +
        result.content
          .filter((x) => x.type === "text")
          .map((x) => x.text)
          .join("\n"),
    );
  return JSON.parse(result.content.find((x) => x.type === "text").text);
}
try {
  await fs.mkdir(evidence, { recursive: true });
  if (await alive(cdp + "/json/version"))
    throw Error("Audit port 9345 is occupied");
  report.exe = { path: exe, sha256: sha(await fs.readFile(exe)) };
  report.externalAgentBefore = await alive("http://127.0.0.1:17381/health");
  app = spawn(exe, ["--data-dir", data], {
    cwd: path.dirname(exe),
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: path.join(temporary, "webview"),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9345 --remote-debugging-address=127.0.0.1",
    },
  });
  await expect
    .poll(() => alive(cdp + "/json/version"), { timeout: 20000 })
    .toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  await expect
    .poll(
      () => {
        page = browser
          .contexts()
          .flatMap((x) => x.pages())
          .find((x) => new URL(x.url()).hostname === "tauri.localhost");
        return Boolean(page);
      },
      { timeout: 20000 },
    )
    .toBe(true);
  page.on("pageerror", (error) => report.errors.push(error.message));
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  expect(path.resolve(await ipc("get_storage_root"))).toBe(path.resolve(data));
  report.url = page.url();
  const assets = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((els) =>
      els.map((e) => e.getAttribute("src") || e.getAttribute("href")),
    );
  report.loaded = [];
  for (const asset of assets.filter((x) => x.startsWith("/assets/"))) {
    const bytes = await page.evaluate(
      async (url) =>
        Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
      asset,
    );
    const expected = await fs.readFile(path.join(repo, "dist", asset.slice(1)));
    expect(sha(Buffer.from(bytes))).toBe(sha(expected));
    report.loaded.push({ path: asset, sha256: sha(expected) });
  }
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  const samples = await page.evaluate(() => {
    const draw = (variant) => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 320, 180);
      if (variant === 0) {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(30, 45, 90, 90);
        ctx.fillStyle = "#0000ff";
        ctx.beginPath();
        ctx.arc(240, 90, 45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#008000";
        ctx.beginPath();
        ctx.moveTo(80, 30);
        ctx.lineTo(25, 140);
        ctx.lineTo(135, 140);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ff8800";
        ctx.fillRect(190, 65, 110, 55);
      }
      return canvas.toDataURL("image/png").split(",")[1];
    };
    return [draw(0), draw(1)];
  });
  const files = samples.map((sample, index) => ({
    name: index ? "canvas-reference.png" : "local-reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(sample, "base64"),
  }));
  for (const file of files)
    await fs.writeFile(path.join(evidence, file.name), file.buffer);
  const source = page.getByTestId("canvas-node-image");
  await source.click();
  await source.locator('input[type="file"]').first().setInputFiles(files[1]);
  await expect(source.locator(".uploaded-image")).toBeVisible();
  await page.getByLabel("引用画布图片").selectOption("image");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(1);
  await page
    .locator('.chat-composer input[type="file"]')
    .setInputFiles(files[0]);
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(2);
  await page
    .getByLabel("对话内容")
    .fill("请逐张用中文描述两张附图中的图形和颜色。不要运行工具或生成图片。");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("连接");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(2);
  report.checks.push(
    "native archive uploads and canvas reference drafts survive disconnected send",
  );
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "网络", exact: true }).click();
  await page
    .getByRole("region", { name: "桌面 Agent 服务" })
    .getByRole("button", { name: "启动并连接" })
    .click();
  await expect(
    page.getByRole("button", { name: "已连接", exact: true }),
  ).toBeDisabled({ timeout: 90000 });
  const owned = await ipc("agent_runtime_status");
  endpoint = owned.endpoint;
  const token = await page.locator("#agent-token").inputValue();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  const require = createRequire(
    path.join(repo, "vendor/canvas-agent/package.json"),
  );
  const { Client } = await import(
    pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/index.js"))
  );
  const { StdioClientTransport } = await import(
    pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/stdio.js"))
  );
  client = new Client({ name: "kk-attachments-audit", version: "1.0.0" });
  const runtime = path.join(path.dirname(exe), "agent-runtime");
  await client.connect(
    new StdioClientTransport({
      command: path.join(runtime, "node.exe"),
      args: [path.join(runtime, "agent/dist/index.js"), "mcp"],
      cwd: data,
      stderr: "ignore",
      env: {
        ...process.env,
        CANVAS_AGENT_TOKEN: token,
        KK_AGENT_CONFIG_DIR: path.join(data, "app/agent"),
      },
    }),
  );
  expect(
    (await mcp("canvas_select_nodes", { ids: ["image", "video1"] })).ok,
  ).toBe(true);
  expect(
    (
      await mcp("canvas_set_viewport", {
        viewport: { x: 150, y: 70, k: 0.7 },
      })
    ).ok,
  ).toBe(true);
  await expect(page.getByTestId("canvas-node-image")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("canvas-node-video1")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect
    .poll(async () => (await mcp("canvas_get_state", {})).viewport)
    .toEqual({ x: 150, y: 70, k: 0.7 });
  expect((await mcp("canvas_select_nodes", { ids: ["image"] })).ok).toBe(true);
  expect(
    (
      await mcp("canvas_set_viewport", {
        viewport: { x: 180, y: 60, k: 0.8 },
      })
    ).ok,
  ).toBe(true);
  await expect
    .poll(async () =>
      page
        .getByRole("region", { name: "无限画布" })
        .evaluate((el) => el.style.getPropertyValue("--canvas-pan-x")),
    )
    .toBe("180px");
  expect((await mcp("canvas_select_nodes", { ids: [] })).ok).toBe(true);
  await expect(
    page.locator('[data-testid^="canvas-node-"][data-selected="true"]'),
  ).toHaveCount(0);
  report.checks.push(
    "packaged MCP applies multi/single/empty selection and viewport to real UI and snapshots",
  );
  await client.close();
  client = undefined;
  await page.screenshot({ path: path.join(evidence, "desktop-draft.png") });
  if (process.argv.includes("--real")) {
    page.on("request", (request) => {
      if (
        request.url().endsWith("/agent/codex/turn") &&
        request.method() === "POST"
      ) {
        const body = request.postDataJSON();
        report.turn = {
          attachments: body.attachments.map((x) => ({
            name: x.name,
            width: x.width,
            height: x.height,
            sha256: sha(Buffer.from(x.dataUrl.split(",")[1], "base64")),
          })),
          canvasReferences: body.messageMetadata?.canvasReferences,
        };
      }
    });
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => report.turn?.attachments.length).toBe(2);
    expect(report.turn.attachments.map((x) => x.sha256).sort()).toEqual(
      files.map((x) => sha(x.buffer)).sort(),
    );
    expect(report.turn.canvasReferences).toMatchObject([
      { nodeId: "image", kind: "image" },
    ]);
    await expect(
      page.locator(".chat-composer .start-attachment-chip"),
    ).toHaveCount(0);
    await expect(page.locator(".chat-agent-item.is-assistant")).toContainText(
      /红色|红色的/,
      { timeout: 120000 },
    );
    await expect
      .poll(
        async () =>
          await page.locator(".chat-agent-item.is-assistant").allTextContents(),
        { timeout: 120000 },
      )
      .toEqual(expect.arrayContaining([expect.stringMatching(/蓝色/)]));
    await expect
      .poll(
        async () =>
          (await (await fetch(endpoint + "/health")).json()).codexBusy,
        { timeout: 90000 },
      )
      .toBe(false);
    report.reply = await page
      .locator(".chat-agent-item.is-assistant")
      .allTextContents();
    expect(report.reply.join("\n")).toMatch(/绿/);
    expect(report.reply.join("\n")).toMatch(/三角/);
    expect(report.reply.join("\n")).toMatch(/圆/);
    await page.screenshot({
      path: path.join(evidence, "desktop-real-vision.png"),
    });
    report.checks.push(
      "real Codex vision describes both selected originals; outbound bytes match local/native archives",
    );
  }
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect
    .poll(async () =>
      page
        .getByRole("region", { name: "无限画布" })
        .evaluate((el) => el.style.getPropertyValue("--canvas-pan-x")),
    )
    .toBe("180px");
  report.checks.push("viewport survives native reload");
  report.passed = report.errors.length === 0;
} catch (error) {
  report.errors.push(String(error));
  await page
    ?.screenshot({ path: path.join(evidence, "desktop-failure.png") })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await client?.close().catch(() => {});
  if (app && app.exitCode === null && app.signalCode === null) {
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
      .toBe(true)
      .catch(() => app.kill());
  }
  await browser?.close().catch(() => {});
  if (endpoint)
    await expect
      .poll(() => alive(endpoint + "/health"), { timeout: 10000 })
      .toBe(false);
  report.externalAgentAfter = await alive("http://127.0.0.1:17381/health");
  if (report.externalAgentAfter !== report.externalAgentBefore) {
    report.errors.push("External Agent availability changed");
    report.passed = false;
  }
  await fs.writeFile(
    path.join(
      evidence,
      process.argv.includes("--real")
        ? "desktop-real-vision-runtime.json"
        : "desktop-runtime.json",
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: report.checks,
      errors: report.errors,
    }),
  );
}
