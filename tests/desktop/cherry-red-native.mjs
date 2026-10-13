import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { SETTINGS_STORAGE_KEY } from "../../src/domain/settings.ts";
import { inspectDesktopRelease } from "../../scripts/windows/desktop-release.mjs";

// Run serially with taskhost-lifecycle.mjs: both own CDP port 9349.
// All Provider traffic goes to this run's loopback server. No vault calls.
if (process.argv.includes("--help")) {
  process.stdout.write(
    "Usage: node tests/desktop/cherry-red-native.mjs\n" +
      "Requires Windows, a current desktop build receipt, and free CDP port 9349.\n" +
      "Optional KK_CHERRY_NATIVE_EVIDENCE selects the receipt/screenshot directory.\n",
  );
  process.exit(0);
}
assert.equal(
  process.platform,
  "win32",
  "This fixture verifies the Windows host",
);
const root = process.cwd();
const runId = `${Date.now()}-${randomUUID()}`;
const isolated = path.join(
  root,
  "src-tauri/target/cherry-red-acceptance",
  runId,
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const output = path.resolve(
  process.env.KK_CHERRY_NATIVE_EVIDENCE ??
    path.join(root, "test-results/desktop/cherry-red-native", runId),
);
const cdp = "http://127.0.0.1:9349";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = {
  startedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  workingTreeStatus: execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  release: inspectDesktopRelease(root),
  dataRoot,
  profile,
  cdp,
  providerTrafficScope:
    "Explicit keyless requests to this run's loopback fixture only",
  invocations: [],
  checks: [],
  requests: [],
  errors: [],
  passed: false,
};
report.versions = JSON.parse(
  await fs.readFile(path.join(root, "config/platform-versions.json"), "utf8"),
);
report.sourceHashes = {};
for (const file of [
  "src-tauri/src/task_host.rs",
  "src-tauri/src/task_host_protocol.rs",
  "src-tauri/src/task_host_text.rs",
  "src-tauri/src/window_appearance.rs",
  "src-tauri/src/main.rs",
  "src-tauri/Cargo.lock",
  "src-tauri/tauri.conf.json",
  "src/App.tsx",
  "src/integrations/windowAppearance.ts",
  "src/components/settings/WindowTransparencySetting.tsx",
  "src/styles/window-appearance.css",
  "tests/desktop/cherry-red-native.mjs",
])
  report.sourceHashes[file] = digest(await fs.readFile(path.join(root, file)));
report.bundleHashes = {};
for (const file of (await fs.readdir(path.join(root, "dist/assets"))).filter(
  (name) => /^index-.*\.(js|css)$/.test(name),
))
  report.bundleHashes[`assets/${file}`] = digest(
    await fs.readFile(path.join(root, "dist/assets", file)),
  );
assert(
  Object.keys(report.bundleHashes).length >= 2,
  "Production JS/CSS missing",
);

let app, browser, page, baseUrl;
const expected = new Map();
const responsesClosed = new Set();
const available = () =>
  fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((response) => response.ok)
    .catch(() => false);
const invoke = (command, args = {}) => {
  report.invocations.push(command);
  return page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );
};
const get = (taskId) => invoke("task_host_get", { taskId });
const journal = async (taskId) =>
  JSON.parse(
    await fs.readFile(
      path.join(dataRoot, "tasks/native-host", `${taskId}.json`),
      "utf8",
    ),
  );
const posts = (taskId) =>
  report.requests.filter((request) => request.taskId === taskId).length;
const frame = (value) => `data: ${JSON.stringify(value)}\n\n`;
function stream(protocol, text, complete) {
  if (protocol === "anthropic-messages")
    return (
      frame({ type: "message_start", message: { content: [] } }) +
      frame({
        type: "content_block_start",
        content_block: { type: "text", text: "" },
      }) +
      frame({
        type: "content_block_delta",
        delta: { type: "text_delta", text },
      }) +
      (complete
        ? frame({ type: "message_delta", delta: { stop_reason: "end_turn" } }) +
          frame({ type: "message_stop" })
        : "")
    );
  if (protocol === "gemini")
    return (
      frame({ candidates: [{ content: { parts: [{ text }] } }] }) +
      (complete ? frame({ candidates: [{ finishReason: "STOP" }] }) : "")
    );
  return (
    frame({ choices: [{ index: 0, delta: { content: text } }] }) +
    (complete
      ? frame({
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        }) + "data: [DONE]\n\n"
      : "")
  );
}

const server = createServer(async (request, response) => {
  try {
    assert.equal(request.method, "POST");
    const key = request.headers["idempotency-key"];
    const fixture = expected.get(key);
    assert(fixture, "POST must belong to this fixture's explicit task");
    const { native, mode, text } = fixture;
    const durable = await journal(native.taskId);
    assert.equal(durable.status, "submitted", "Journal must precede POST");
    assert.equal(durable.idempotencyKey, key);
    assert.match(durable.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(request.headers.authorization, undefined);
    assert.equal(request.headers["x-api-key"], undefined);
    assert.equal(request.headers["x-goog-api-key"], undefined);
    assert.equal(request.headers.accept, "text/event-stream");
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const messages = native.messages;
    const chat = messages.filter((message) => message.role !== "system");
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    if (native.protocol === "anthropic-messages") {
      assert.equal(request.url, "/v1/messages");
      assert.equal(request.headers["anthropic-version"], "2023-06-01");
      assert.deepEqual(body, {
        model: native.model,
        messages: chat,
        system,
        max_tokens: 4096,
        stream: true,
      });
    } else if (native.protocol === "gemini") {
      assert.equal(
        request.url,
        `/v1beta/models/${native.model}:streamGenerateContent?alt=sse`,
      );
      assert.deepEqual(body, {
        contents: chat.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        systemInstruction: { parts: [{ text: system }] },
      });
    } else {
      assert.equal(request.url, "/v1/chat/completions");
      assert.deepEqual(body, {
        model: native.model,
        messages,
        stream: true,
      });
    }
    report.requests.push({
      taskId: native.taskId,
      idempotencyKey: key,
      protocol: native.protocol,
      mode,
      method: request.method,
      path: request.url,
      body,
      durableBeforePost: true,
      authHeadersAbsent: true,
    });
    response.once("close", () => responsesClosed.add(native.taskId));
    if (mode === "rejected") {
      response.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": "7",
      });
      response.end('{"error":{"message":"fixture rejection"}}');
      return;
    }
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.flushHeaders();
    const bodyStream = stream(native.protocol, text, mode === "complete");
    if (mode === "cancel") response.write(bodyStream);
    else response.end(bodyStream);
  } catch (cause) {
    report.errors.push(String(cause));
    if (!response.headersSent) response.writeHead(500);
    response.end("fixture assertion failed");
  }
});

async function launch() {
  assert.equal(await available(), false, "Owned CDP port 9349 must be free");
  app = spawn(report.release.releaseExePath, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9349 --remote-debugging-address=127.0.0.1",
    },
  });
  report.pid = app.pid ?? null;
  report.stderr = "";
  let spawnFailure;
  app.once("error", (cause) => (spawnFailure = cause));
  app.stderr.on("data", (chunk) => {
    report.stderr = (report.stderr + chunk.toString()).slice(-8192);
  });
  await expect
    .poll(
      async () => {
        if (spawnFailure) throw spawnFailure;
        assert.equal(app.exitCode, null, "Owned desktop exited");
        assert.equal(app.signalCode, null, "Owned desktop was terminated");
        return available();
      },
      { timeout: 30000 },
    )
    .toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Native WebView missing");
  page.on("pageerror", (cause) => report.errors.push(cause.message));
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  await expect(
    page.getByText("正在读取本地项目…", { exact: true }),
  ).toHaveCount(0);
  assert.equal(
    path.resolve(await invoke("get_storage_root")).toLowerCase(),
    dataRoot.toLowerCase(),
  );
  report.loaded = await page.evaluate(() => ({
    url: location.href,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    styles: [...document.styleSheets]
      .map((sheet) => sheet.href)
      .filter(Boolean),
  }));
  for (const file of Object.keys(report.bundleHashes))
    assert(
      [...report.loaded.scripts, ...report.loaded.styles].some((url) =>
        url.endsWith(`/${file}`),
      ),
      "Native release must load this worktree's production bundle",
    );
}

async function stop() {
  if (app?.pid && app.exitCode === null && app.signalCode === null) {
    assert(Number.isSafeInteger(app.pid) && app.pid > 0);
    // Only the Child created above is killed; never attach to/recover another PID.
    execFileSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    await expect
      .poll(() => app.exitCode !== null || app.signalCode !== null, {
        timeout: 10000,
      })
      .toBe(true);
  }
  await browser?.close().catch(() => {});
  if (app?.pid) await expect.poll(available, { timeout: 10000 }).toBe(false);
}

async function protocolCase(protocol, mode) {
  const prompt = `cherry-native-${protocol}-${mode}`;
  const text = `原生 fixture ${mode === "complete" ? "确认结果" : "未确认草稿"} 🌍 ${protocol}`;
  const native = {
    taskId: `cherry-native-${randomUUID()}`,
    idempotencyKey: `cherry-native-${randomUUID()}`,
    baseUrl: `${baseUrl}/${protocol === "gemini" ? "v1beta" : "v1"}`,
    credentialRef: "",
    protocol,
    authMode: "none",
    kind: "text",
    model: "native-fixture-model",
    prompt,
    messages: [
      { role: "system", content: "fixture system one" },
      { role: "system", content: "fixture system two" },
      { role: "user", content: "fixture prior user" },
      { role: "assistant", content: "fixture prior assistant" },
      { role: "user", content: prompt },
    ],
    outputIndices: [0],
    attachments: [],
    concurrencyLimit: 4,
    providerName: "Cherry native local fixture",
  };
  expected.set(native.idempotencyKey, { native, mode, text });
  const initial = await invoke("task_host_submit", { request: native });
  assert.equal(initial.taskId, native.taskId);
  assert.equal(initial.idempotencyKey, native.idempotencyKey);
  await expect.poll(() => posts(native.taskId), { timeout: 10000 }).toBe(1);
  if (mode === "cancel") {
    await expect
      .poll(async () => (await journal(native.taskId)).outputs[0].text)
      .toBe(text);
    assert.equal((await journal(native.taskId)).status, "submitted");
    await invoke("task_host_cancel", { taskId: native.taskId });
  }
  const status =
    mode === "complete"
      ? "succeeded"
      : mode === "rejected"
        ? "failed"
        : "unknown";
  await expect
    .poll(async () => (await get(native.taskId)).status, { timeout: 10000 })
    .toBe(status);
  const actual = await get(native.taskId);
  const durable = await journal(native.taskId);
  assert.equal(durable.status, status);
  assert.deepEqual(durable.outputs, actual.outputs);
  assert.deepEqual(durable.failure, actual.failure);
  assert.equal(actual.outputs[0].status, status);
  assert.equal(actual.outputs[0].assetId, undefined);
  assert.deepEqual(actual.assetIds, []);
  if (mode !== "rejected") assert.equal(actual.outputs[0].text, text);
  if (mode === "complete") assert.equal(actual.failure, undefined);
  if (mode === "partial")
    assert.equal(actual.failure.failureClass, "provider_unavailable");
  if (mode === "cancel") {
    assert.equal(actual.failure.failureClass, "cancelled");
    await expect.poll(() => responsesClosed.has(native.taskId)).toBe(true);
  }
  if (mode === "rejected") {
    assert.equal(actual.failure.failureClass, "rate_limited");
    assert.equal(actual.failure.status, 429);
    assert.equal(actual.failure.retryAfterSeconds, 7);
  }
  assert.equal(
    (await invoke("task_host_submit", { request: native })).status,
    status,
  );
  assert.equal(
    posts(native.taskId),
    1,
    "Final/unknown journal must prevent repost",
  );
  report.checks.push({
    name: `${protocol}-${mode}`,
    passed: true,
    record: actual,
  });
}

const appearance = () => invoke("window_appearance_get");
const creationSnapshot = async () =>
  JSON.parse(
    await fs.readFile(path.join(dataRoot, "projects/creation-v2.json"), "utf8"),
  );
let fixtureProjectId;
async function enterFixtureWorkspace(create = false) {
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  await expect(
    page.getByText("正在读取本地项目…", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  if (create) {
    await page.getByRole("button", { name: "新建项目", exact: true }).click();
    await expect
      .poll(
        async () => {
          try {
            return (await creationSnapshot()).projects.length;
          } catch (cause) {
            // The first native snapshot is asynchronous. Absence is pending;
            // unreadable or malformed snapshots must still fail acceptance.
            if (cause?.code === "ENOENT") return "pending";
            throw cause;
          }
        },
        { timeout: 10000 },
      )
      .toBe(1);
    const snapshot = await creationSnapshot();
    const project = snapshot.projects[0];
    fixtureProjectId = project.id;
    assert.equal(snapshot.activeProjectId, fixtureProjectId);
    assert.deepEqual(project.items, []);
    assert.deepEqual(project.tasks, []);
    report.fixtureProject = { id: project.id, name: project.name };
  } else {
    const cards = page.locator(".project-library-card");
    await expect(cards).toHaveCount(1);
    await cards.click();
    assert.equal((await creationSnapshot()).activeProjectId, fixtureProjectId);
  }
  await expect(page.locator(".workspace-content")).toBeVisible();
  await expect(page.getByTestId("infinite-canvas")).toBeVisible();
  await expect(page.getByTestId("infinite-canvas")).toHaveClass(/\bcanvas\b/);
}
const css = () =>
  page.evaluate(() => {
    const backgrounds = {};
    for (const selector of [
      "html",
      "body",
      "#root",
      ".app",
      ".workspace-content",
      ".canvas",
    ]) {
      const element = document.querySelector(selector);
      if (!element)
        throw new Error(`Required workspace surface missing: ${selector}`);
      backgrounds[selector] = getComputedStyle(element).backgroundColor;
    }
    return {
      enabled: document.documentElement.dataset.windowTransparent,
      backgrounds,
      canvasInlineBackground:
        document.querySelector(".canvas").style.backgroundColor,
    };
  });
async function transparencyCase() {
  await enterFixtureWorkspace(true);
  await expect.poll(async () => (await css()).enabled).toBe("false");
  const initial = await appearance();
  assert.equal(
    initial.supported,
    true,
    initial.reason ?? "Native transparency unavailable",
  );
  assert.equal(
    initial.enabled,
    false,
    "New isolated profile must start opaque",
  );
  const original = await css();
  assert(
    Object.values(original.backgrounds).some(
      (color) => color !== "rgba(0, 0, 0, 0)",
    ),
    "Opaque baseline must contain an actual background",
  );
  for (const enabled of [true, false]) {
    assert.deepEqual(await invoke("window_appearance_set", { enabled }), {
      supported: true,
      enabled,
    });
    assert.equal((await appearance()).enabled, enabled);
  }
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "通用", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "透明窗口", exact: true });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await appearance()).enabled).toBe(true);
  await expect.poll(async () => (await css()).enabled).toBe("true");
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).transparentWindow,
      SETTINGS_STORAGE_KEY,
    ),
    true,
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await expect(page.getByTestId("infinite-canvas")).toBeVisible();
  const transparent = await css();
  assert(
    original.canvasInlineBackground,
    "Canvas must retain its real inline preference",
  );
  assert.equal(
    transparent.canvasInlineBackground,
    original.canvasInlineBackground,
  );
  for (const [selector, background] of Object.entries(transparent.backgrounds))
    assert.equal(
      background,
      "rgba(0, 0, 0, 0)",
      `${selector} must reveal the native background`,
    );
  assert.notEqual(original.backgrounds[".canvas"], "rgba(0, 0, 0, 0)");
  await page.screenshot({ path: path.join(output, "transparent.png") });
  await page.reload();
  await enterFixtureWorkspace();
  await expect.poll(async () => (await css()).enabled).toBe("true");
  assert.equal((await appearance()).enabled, true);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "通用", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect.poll(async () => (await appearance()).enabled).toBe(false);
  await expect.poll(async () => (await css()).enabled).toBe("false");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.reload();
  await enterFixtureWorkspace();
  await expect.poll(async () => (await css()).enabled).toBe("false");
  assert.equal((await appearance()).enabled, false);
  const restored = await css();
  assert.deepEqual(restored.backgrounds, original.backgrounds);
  assert.equal(
    restored.canvasInlineBackground,
    original.canvasInlineBackground,
  );
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).transparentWindow,
      SETTINGS_STORAGE_KEY,
    ),
    false,
  );
  await page.screenshot({ path: path.join(output, "opaque-restored.png") });
  report.checks.push({
    name: "native-alpha-ui-css-and-reload-restoration",
    passed: true,
    initial,
    original,
    transparent,
    restored,
    evidenceScope:
      "Native alpha readback and computed CSS; no installer/signing or desktop pixel claim",
  });
}

await fs.mkdir(output, { recursive: true });
try {
  assert.equal(
    report.release.reason,
    "current",
    "Build through the desktop launcher before running this fixture",
  );
  assert.equal(
    await available(),
    false,
    "CDP 9349 belongs to another run; do not attach",
  );
  await fs.mkdir(profile, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await launch();
  for (const protocol of ["openai-compatible", "anthropic-messages", "gemini"])
    for (const mode of ["complete", "partial", "cancel", "rejected"])
      await protocolCase(protocol, mode);
  await transparencyCase();
  assert.equal(
    report.invocations.some((command) => command.startsWith("credential_")),
    false,
  );
  assert.deepEqual(report.errors, []);
  const after = inspectDesktopRelease(root);
  assert.equal(after.reason, "current");
  assert.equal(
    after.inputSha256,
    report.release.inputSha256,
    "Build inputs changed during acceptance",
  );
  assert.equal(
    after.executableSha256,
    report.release.executableSha256,
    "Executable changed during acceptance",
  );
  for (const [file, sha] of Object.entries(report.sourceHashes))
    assert.equal(
      digest(await fs.readFile(path.join(root, file))),
      sha,
      `${file} changed during acceptance`,
    );
  report.passed = true;
} catch (cause) {
  report.failure = String(cause);
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(output, "failure.png") })
      .catch(() => {});
  throw cause;
} finally {
  try {
    if (page && !page.isClosed() && app?.exitCode === null)
      await invoke("window_appearance_set", { enabled: false }).catch(() => {});
    await stop();
  } catch (cause) {
    report.passed = false;
    report.cleanupFailure = String(cause);
    throw cause;
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(output, "receipt.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    process.stdout.write(
      JSON.stringify({
        passed: report.passed,
        checks: report.checks.length,
        report: path.join(output, "receipt.json"),
      }) + "\n",
    );
  }
}
