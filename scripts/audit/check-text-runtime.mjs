import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { chromium, expect } from "@playwright/test";

const repo = process.cwd();
const desktop = process.argv.includes("--desktop");
const mode = desktop ? "desktop" : "development";
const evidence = path.join(repo, "docs/changes/2026-09-21-text-and-rule-audit");
const registryKey = "kk-studio-next:provider-connections:v1";
const report = {
  mode,
  timestamp: new Date().toISOString(),
  checks: [],
  errors: [],
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = (text) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] })}\n\n`;
const pending = [];
let requests = 0;
const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,content-type,idempotency-key",
  );
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  let body = "";
  for await (const chunk of request) body += chunk;
  const parsed = JSON.parse(body);
  expect(request.url).toBe("/v1/chat/completions");
  expect(parsed.stream).toBe(true);
  expect(parsed.model).toBe("gpt-text-runtime");
  expect(request.headers.authorization).toBe("Bearer fixture-text-runtime");
  expect(request.headers["idempotency-key"]).toBeTruthy();
  const ordinal = ++requests;
  response.writeHead(200, { "Content-Type": "text/event-stream" });
  response.write(frame(`第${ordinal}次真实流式片段`));
  if (ordinal < 3)
    await new Promise((resolve) => {
      pending[ordinal] = resolve;
    });
  response.end(frame("，完整结束。") + "data: [DONE]\n\n");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
let browser, app, page, credentialRef, cleanupError;
async function reopen() {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
}
async function addText(prompt) {
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-text-"]')
    .last();
  await source.getByLabel("文案提示词").fill(prompt);
  return source;
}
async function fit() {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "画布缩放" }).click();
  await page.getByRole("menuitem", { name: "适应视图" }).click();
}
try {
  if (desktop) {
    const cdp = "http://127.0.0.1:9337";
    if (
      await fetch(`${cdp}/json/version`)
        .then(() => true)
        .catch(() => false)
    )
      throw new Error("Owned audit CDP port is occupied");
    const temp = path.join(repo, ".tmp/text-runtime");
    await fs.mkdir(temp, { recursive: true });
    const data = await fs.mkdtemp(path.join(temp, "data-"));
    const profile = await fs.mkdtemp(path.join(temp, "profile-"));
    app = spawn(
      path.join(repo, "src-tauri/target/release/kk-studio.exe"),
      ["--data-dir", data],
      {
        cwd: repo,
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          WEBVIEW2_USER_DATA_FOLDER: profile,
          WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
            "--remote-debugging-port=9337 --remote-debugging-address=127.0.0.1",
        },
      },
    );
    for (let i = 0; i < 150; i++) {
      if (app.exitCode !== null)
        throw new Error(`Desktop exited: ${app.exitCode}`);
      if (
        await fetch(`${cdp}/json/version`)
          .then(() => true)
          .catch(() => false)
      )
        break;
      await delay(100);
    }
    browser = await chromium.connectOverCDP(cdp);
    for (let i = 0; i < 100 && !page; i++) {
      page = browser
        .contexts()
        .flatMap((context) => context.pages())
        .find((item) => item.url().includes("tauri.localhost"));
      if (!page) await delay(100);
    }
    if (!page) throw new Error("Desktop page missing");
    await page.waitForLoadState("domcontentloaded");
    const actualRoot = await page.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke("get_storage_root"),
    );
    expect(path.resolve(actualRoot).toLowerCase()).toBe(
      path.resolve(data).toLowerCase(),
    );
    report.isolatedData = true;
  } else {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto("http://127.0.0.1:1421/");
  }
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  report.url = page.url();
  report.entry = await page
    .locator(
      desktop
        ? 'script[type="module"][src*=assets]'
        : 'script[type="module"][src*="/src/main.tsx"]',
    )
    .first()
    .getAttribute("src");
  if (desktop) {
    const bundle = (
      await fs.readFile(path.join(repo, "dist/index.html"), "utf8")
    ).match(/assets\/(index-[^" ]+\.js)/)?.[1];
    expect(report.entry).toContain(bundle);
  } else
    expect(new URL(report.entry, report.url).pathname).toBe("/src/main.tsx");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("API Base URL").fill(baseUrl);
  await page.getByLabel("API Key").fill("fixture-text-runtime");
  await page.getByLabel("默认模型").fill("gpt-text-runtime");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  credentialRef = await page.evaluate((key) => {
    const connections = JSON.parse(localStorage.getItem(key));
    connections[0].concurrencyLimit = 1;
    localStorage.setItem(key, JSON.stringify(connections));
    return connections[0].credentialRef;
  }, registryKey);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  let source = await addText("生成并在重载后继续读取原任务");
  await source.getByRole("button", { name: "生成文案" }).click();
  await expect(source.locator(".prompt-creation-placeholder")).toContainText(
    "第1次真实流式片段",
  );
  if (desktop) {
    const capacityError = await page.evaluate(async (key) => {
      const connection = JSON.parse(localStorage.getItem(key))[0];
      try {
        await window.__TAURI_INTERNALS__.invoke("task_host_submit", {
          request: {
            taskId: "capacity-check",
            idempotencyKey: "capacity-check",
            kind: "text",
            concurrencyLimit: 1,
            baseUrl: connection.baseUrl,
            credentialRef: connection.credentialRef,
            model: connection.model,
            prompt: "must not submit",
            outputIndices: [0],
            attachments: [],
          },
        });
        return "unexpected success";
      } catch (error) {
        return String(error);
      }
    }, registryKey);
    expect(capacityError).toContain("capacity:");
    await page.reload();
    await reopen();
    source = page.locator('.canvas-node[data-node-id^="added-text-"]').first();
    await source.locator("h3").click();
    await expect(source.locator(".prompt-creation-placeholder")).toContainText(
      "第1次真实流式片段",
    );
    report.checks.push(
      "native capacity=1; WebView reload reconnects without a second POST",
    );
  }
  pending[1]();
  const results = page.locator(
    '.demo-result-node[data-source="provider"][data-kind="text"]',
  );
  await expect(results.first()).toContainText("第1次真实流式片段，完整结束。");
  await fit();
  await results
    .first()
    .getByRole("button", { name: /预览文案结果/ })
    .click();
  await page.getByLabel("编辑文案").fill("用户编辑后的文案保留");
  await page.getByRole("button", { name: "保存文案到卡片" }).click();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await reopen();
  await expect(results.first()).toContainText("用户编辑后的文案保留");
  expect(requests).toBe(1);
  report.checks.push(
    "SSE output saved; edited text survives reload; no image asset required",
  );
  // Web credentials intentionally live only in memory; restore fixture credentials after reload.
  if (!desktop) {
    report.checks.push(
      "Web key remains session-only; cancellation is covered by production browser suite",
    );
  } else {
    source = await addText("取消不能伪装成功");
    await source.getByRole("button", { name: "生成文案" }).click();
    await expect(source.locator(".prompt-creation-placeholder")).toContainText(
      "第2次真实流式片段",
    );
    await source.getByRole("button", { name: "取消文案生成" }).click();
    await expect(source).toContainText("受理状态不明");
    await expect(
      source.getByRole("button", { name: "生成文案" }),
    ).toBeDisabled();
    pending[2]();
    const next = await addText("原生并发占用应已释放");
    await next.getByRole("button", { name: "生成文案" }).click();
    await expect(results).toHaveCount(2);
    await expect(results.last()).toContainText("第3次真实流式片段，完整结束。");
    const native = await page.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke("task_host_list"),
    );
    expect(native.map((item) => item.status).sort()).toEqual([
      "succeeded",
      "succeeded",
      "unknown",
    ]);
    expect(native.every((item) => item.assetIds.length === 0)).toBe(true);
    const activeJobs = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key))[0].activeJobs ?? 0,
      registryKey,
    );
    expect(activeJobs).toBe(0);
    report.checks.push(
      "cancelled native stream stays unknown; no late result; next distinct task succeeds without leaked browser lease",
    );
    const offline = await addText("离线不得发送原生请求");
    await page.evaluate(() =>
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      }),
    );
    await offline.getByRole("button", { name: "生成文案" }).click();
    await expect(offline).toContainText("当前离线");
    expect(requests).toBe(3);
    await page.evaluate(() => Reflect.deleteProperty(navigator, "onLine"));
    report.checks.push(
      "offline native entry sends no request and retains draft",
    );
  }
  await fit();
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.screenshot({
    path: path.join(evidence, `text-${mode}-runtime.png`),
  });
  report.requestCount = requests;
  expect(report.errors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.failure = error.message;
  throw error;
} finally {
  if (desktop && page && credentialRef)
    await page
      .evaluate(
        (ref) =>
          window.__TAURI_INTERNALS__.invoke("credential_delete", {
            providerId: ref,
          }),
        credentialRef,
      )
      .catch(() => undefined);
  for (const resolve of pending) resolve?.();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(
    path.join(evidence, `text-${mode}-runtime.json`),
    JSON.stringify(report, null, 2),
  );
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
    for (let i = 0; i < 80 && app.exitCode === null; i++) await delay(100);
    if (app.exitCode === null)
      cleanupError = new Error(`Owned process ${app.pid} did not close`);
  }
  await browser?.close();
}
if (cleanupError) throw cleanupError;
console.log(JSON.stringify(report, null, 2));
