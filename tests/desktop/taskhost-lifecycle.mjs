import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { credentialId } from "../../src/features/creation/providerCredentials.ts";
import {
  DEFAULT_MODEL_PROVIDER,
  MODEL_PROVIDER_STORAGE_KEY,
} from "../../src/domain/modelProvider.ts";

const root = process.cwd();
const runId = `${Date.now()}-${randomUUID()}`;
const output = path.resolve(
  process.env.KK_TASKHOST_EVIDENCE ??
    path.join(root, "test-results/desktop/taskhost-lifecycle", runId),
);
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const isolated = path.join(root, "src-tauri/target/taskhost-acceptance", runId);
const dataRoot = path.join(isolated, "data");
const profile =
  process.env.KK_TASKHOST_PROFILE ?? path.join(isolated, "profile");
const cdp = "http://127.0.0.1:9349";
const secret = `synthetic-taskhost-${randomUUID()}`;
const credentialRef = `taskhost_fixture_${randomUUID()}`;
const ownedCredentials = new Set();
const report = {
  startedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  dataRoot,
  profile,
  checks: [],
  launches: [],
  startups: [],
  requests: [],
  errors: [],
  passed: false,
};
report.versions = JSON.parse(
  await fs.readFile("config/platform-versions.json", "utf8"),
);
report.sourceHashes = {};
for (const file of [
  "src-tauri/src/task_host.rs",
  "src-tauri/src/task_host_text.rs",
  "src/App.tsx",
  "src/components/BatchMatrix.tsx",
  "src/features/creation/nativeTaskHost.ts",
  "src/features/creation/useCreationStorage.ts",
  "tests/desktop/taskhost-lifecycle.mjs",
  "config/platform-versions.json",
  "src-tauri/Cargo.lock",
])
  report.sourceHashes[file] = createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
report.bundleHashes = {};
for (const file of (await fs.readdir("dist/assets")).filter((name) =>
  /^index-.*\.(js|css)$/.test(name),
))
  report.bundleHashes[`assets/${file}`] = createHash("sha256")
    .update(await fs.readFile(path.join("dist/assets", file)))
    .digest("hex");
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const secondImage = await fs.readFile("public/fixtures/demo/blue-hour.png");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let app, browser, page, baseUrl;
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(output, { recursive: true });

async function journal(taskId) {
  return JSON.parse(
    await fs.readFile(
      path.join(dataRoot, "tasks/native-host", `${taskId}.json`),
      "utf8",
    ),
  );
}
async function snapshot() {
  return JSON.parse(
    await fs.readFile(path.join(dataRoot, "projects/creation-v2.json"), "utf8"),
  );
}
const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url?.startsWith("/slow/")) {
      report.requests.push({ path: request.url, method: "GET" });
      return; // Deliberately hold this result download until cancellation/process exit.
    }
    assert.equal(request.method, "POST");
    assert(
      ["/v1/images/generations", "/v1/chat/completions"].includes(request.url),
    );
    assert.equal(
      request.headers.authorization === `Bearer ${secret}`,
      true,
      "Fixture authentication missing",
    );
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const rawPrompt = body.prompt ?? body.messages?.[0]?.content;
    // The actual App compiles user intent into a provider prompt. Identify only
    // our explicit fixture markers; keep the real compilation path intact.
    const prompt =
      /(?:^|\n)设计师原始需求：(ui-(?:success|partial-restart))(?:\n|$)/.exec(
        rawPrompt,
      )?.[1] ?? rawPrompt;
    const key = request.headers["idempotency-key"];
    assert.equal(typeof key, "string");
    const names = await fs.readdir(path.join(dataRoot, "tasks/native-host"));
    let durable;
    for (const name of names.filter((name) => name.endsWith(".json"))) {
      const entry = await journal(name.slice(0, -5));
      if (entry.idempotencyKey === key) durable = entry;
    }
    assert(durable, "Native journal must exist before the Provider POST");
    assert.equal(durable.status, "submitted");
    const receipt = {
      method: "POST",
      path: request.url,
      prompt,
      key,
      taskId: durable.taskId,
      durableJournal: true,
    };
    if (prompt === "ui-success" || prompt === "ui-partial-restart") {
      assert.equal(
        body.n,
        4,
        "UI fixture must request the selected four slots",
      );
      const saved = await snapshot();
      const task = saved.projects
        .flatMap((project) => project.tasks)
        .find((task) => task.idempotencyKey === key);
      assert(task, "Actual App submission intent must be durable before POST");
      assert.equal(task.id, durable.taskId);
      // The host persists submitted before POST. The App may still be awaiting
      // its IPC receipt, so its durable snapshot retains queued intent until
      // acceptance returns; both records already share the same stable identity.
      assert(["intent", "submitted"].includes(task.submissionState));
      assert(["queued", "running"].includes(task.status));
      receipt.projectIntent = true;
      receipt.projectSubmissionState = task.submissionState;
      receipt.projectStatus = task.status;
    }
    report.requests.push(receipt);
    if (prompt === "header-hold" || prompt === "text-hold") return;
    if (prompt === "body-hold") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.flushHeaders();
      response.write('{"data":[');
      return;
    }
    if (request.url === "/v1/chat/completions") {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      if (prompt === "text-draft-restart") {
        response.write(
          'data: {"choices":[{"index":0,"delta":{"content":"未确认的原生文本草稿"}}]}\n\n',
        );
        return;
      }
      response.end(
        'data: {"choices":[{"index":0,"delta":{"content":"原生文本已完成"}}]}\n\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
      );
      return;
    }
    const data = [{ b64_json: pixel.toString("base64") }];
    for (let index = 1; index < body.n; index++) {
      if (
        ["download-hold", "partial-restart", "ui-partial-restart"].includes(
          prompt,
        )
      )
        data.push({ url: `${baseUrl.replace(/\/v1$/, "")}/slow/${prompt}` });
      else data.push({ b64_json: secondImage.toString("base64") });
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify(
        prompt === "native-success"
          ? { data }
          : { id: `fixture-${prompt}`, data },
      ),
    );
  } catch (cause) {
    report.errors.push(String(cause));
    response.writeHead(500);
    response.end("fixture assertion failed");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
const available = () =>
  fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
const invoke = (command, args = {}) =>
  page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );
const get = (taskId) => invoke("task_host_get", { taskId });
const posts = (prompt) =>
  report.requests.filter(
    (request) => request.method === "POST" && request.prompt === prompt,
  ).length;
function task(prompt, outputIndices = [0], kind = "image") {
  return {
    taskId: `taskhost-${randomUUID()}`,
    idempotencyKey: `taskhost-${randomUUID()}`,
    baseUrl,
    credentialRef,
    model: "image-test",
    prompt,
    outputIndices,
    attachments: [],
    providerName: "T5 fixture",
    kind,
    ...(kind === "text" ? { concurrencyLimit: 1 } : {}),
  };
}
async function submit(request) {
  const record = await invoke("task_host_submit", { request });
  assert.equal(record.taskId, request.taskId);
  assert.equal(record.idempotencyKey, request.idempotencyKey);
  return record;
}
async function launch() {
  assert.equal(await available(), false, "Owned CDP port 9349 must be free");
  const startup = {
    startedAt: new Date().toISOString(),
    runtimeVersion: process.env.KK_WEBVIEW2_RUNTIME_VERSION ?? "not-recorded",
    hostElevated: process.env.KK_TASKHOST_ELEVATED ?? "not-recorded",
    pid: null,
    exitCode: null,
    signalCode: null,
    cdpReady: false,
    exitedAt: null,
    cleanupRequestedAt: null,
    stderr: "",
  };
  report.startups.push(startup);
  app = spawn(executable, ["--data-dir", dataRoot], {
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
  startup.pid = app.pid ?? null;
  let spawnFailure;
  app.once("error", (cause) => {
    spawnFailure = cause;
    startup.spawnFailure = String(cause).replaceAll(
      secret,
      "<synthetic credential>",
    );
  });
  app.stderr.on("data", (chunk) => {
    startup.stderr = (startup.stderr + chunk.toString())
      .replaceAll(secret, "<synthetic credential>")
      .slice(-8192);
  });
  app.once("exit", (code, signal) => {
    startup.exitedAt = new Date().toISOString();
    startup.exitCode = code;
    startup.signalCode = signal;
  });
  await expect
    .poll(
      async () => {
        if (spawnFailure) throw spawnFailure;
        assert.equal(app.exitCode, null, "Owned desktop exited");
        return available();
      },
      { timeout: 30000 },
    )
    .toBe(true);
  startup.cdpReady = true;
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Native WebView page missing");
  page.on("pageerror", (cause) => report.errors.push(cause.message));
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  await expect(
    page.getByText("正在读取本地项目…", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('.creation-storage-notice[role="alert"]'),
  ).toHaveCount(0);
  assert.equal(
    path.resolve(await invoke("get_storage_root")).toLowerCase(),
    dataRoot.toLowerCase(),
  );
  const identity = await page.evaluate(() => ({
    url: location.href,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    styles: [...document.styleSheets]
      .map((sheet) => sheet.href)
      .filter(Boolean),
  }));
  report.launches.push(identity);
  for (const file of Object.keys(report.bundleHashes))
    assert(
      [...identity.scripts, ...identity.styles].some((url) =>
        url.endsWith(`/${file}`),
      ),
      "Native release must load this worktree's fresh bundle",
    );
}
async function stop(graceful = false) {
  if (app?.exitCode === null) {
    report.startups.at(-1).cleanupRequestedAt = new Date().toISOString();
    assert(
      Number.isSafeInteger(app.pid) && app.pid > 0,
      "Owned process PID missing",
    );
    if (graceful) {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `if (!(Get-Process -Id ${app.pid}).CloseMainWindow()) { exit 1 }`,
        ],
        { windowsHide: true, stdio: "ignore" },
      );
    } else {
      execFileSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    }
    await expect.poll(() => app.exitCode, { timeout: 10000 }).not.toBeNull();
  }
  await browser?.close().catch(() => {});
  browser = undefined;
  await expect.poll(available, { timeout: 10000 }).toBe(false);
}
async function ownCredential(id) {
  assert.equal(
    (await invoke("credential_get", { providerId: id })) === null,
    true,
    "Fixture must never overwrite an existing credential",
  );
  await invoke("credential_set", { providerId: id, secret });
  ownedCredentials.add(id);
}
async function cancelCase(prompt, indices) {
  const request = task(prompt, indices);
  await submit(request);
  await expect.poll(() => posts(prompt)).toBe(1);
  if (prompt === "download-hold") {
    await expect
      .poll(async () => (await get(request.taskId)).outputs[0].status)
      .toBe("succeeded");
    await expect
      .poll(() =>
        report.requests.some((event) => event.path === `/slow/${prompt}`),
      )
      .toBe(true);
  }
  const started = Date.now();
  await invoke("task_host_cancel", { taskId: request.taskId });
  await expect
    .poll(async () => (await get(request.taskId)).status, { timeout: 5000 })
    .toBe("unknown");
  const record = await get(request.taskId);
  assert.equal(record.failure.failureClass, "cancelled");
  assert.equal(record.outputs.at(-1).status, "unknown");
  if (prompt === "download-hold")
    assert.equal(record.outputs[0].status, "succeeded");
  await submit(request);
  assert.equal(posts(prompt), 1);
  report.checks.push({
    name: `cancel-${prompt}`,
    passed: true,
    elapsedMs: Date.now() - started,
    record,
  });
}
try {
  report.executableSha256 = digest(await fs.readFile(executable));
  await launch();
  await ownCredential(credentialRef);
  await assert.rejects(
    () => ownCredential(credentialRef),
    (cause) => {
      assert(cause instanceof assert.AssertionError);
      assert.equal(String(cause).includes(secret), false);
      assert.equal(JSON.stringify(cause).includes(secret), false);
      return true;
    },
  );
  assert.equal(
    (await invoke("credential_get", { providerId: credentialRef })) === secret,
    true,
    "Credential conflict must preserve the original value",
  );
  report.checks.push({
    name: "credential-conflict-safe-failure",
    passed: true,
  });
  await cancelCase("header-hold", [0]);
  await cancelCase("body-hold", [0]);
  await cancelCase("download-hold", [0, 1]);

  const completedRequest = task("native-success", [0, 1]);
  await submit(completedRequest);
  await expect
    .poll(async () => (await get(completedRequest.taskId)).status)
    .toBe("succeeded");
  const completed = await get(completedRequest.taskId);
  assert.equal(completed.outputs.length, 2);
  assert.notEqual(completed.outputs[0].assetId, completed.outputs[1].assetId);
  for (const [index, bytes] of [pixel, secondImage].entries()) {
    const asset = await invoke("asset_read", {
      assetId: completed.outputs[index].assetId,
    });
    assert.equal(
      digest(Buffer.from(asset.dataBase64, "base64")),
      digest(bytes),
    );
  }
  await submit(completedRequest);
  assert.equal(posts("native-success"), 1);
  report.checks.push({
    name: "completed-image-and-idempotency",
    passed: true,
    record: completed,
  });

  const partialRequest = task("partial-restart", [0, 1]);
  await submit(partialRequest);
  await expect
    .poll(async () => (await get(partialRequest.taskId)).outputs[0].status)
    .toBe("succeeded");
  await expect
    .poll(() =>
      report.requests.some((event) => event.path === "/slow/partial-restart"),
    )
    .toBe(true);
  await page.reload();
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  await submit(partialRequest);
  assert.equal(posts("partial-restart"), 1);
  const firstAsset = (await get(partialRequest.taskId)).outputs[0].assetId;
  await stop();
  await launch();
  const recovered = await get(partialRequest.taskId);
  assert.equal(recovered.status, "unknown");
  assert.equal(recovered.outputs[0].status, "succeeded");
  assert.equal(recovered.outputs[0].assetId, firstAsset);
  const asset = await invoke("asset_read", { assetId: firstAsset });
  assert.equal(digest(Buffer.from(asset.dataBase64, "base64")), digest(pixel));
  assert.equal((await submit(partialRequest)).status, "unknown");
  await assert.rejects(
    submit({ ...partialRequest, prompt: "changed request" }),
    /conflict/,
  );
  assert.equal(posts("partial-restart"), 1);
  assert.equal((await get(completedRequest.taskId)).status, "succeeded");
  const listed = await invoke("task_host_list");
  assert.equal(
    listed.filter((record) => record.taskId === partialRequest.taskId).length,
    1,
  );
  report.checks.push({
    name: "reload-process-crash-slot-recovery",
    passed: true,
    record: recovered,
    assetSha256: digest(pixel),
  });

  const textRequest = task("text-hold", [0], "text");
  await submit(textRequest);
  await expect.poll(() => posts("text-hold")).toBe(1);
  await page.reload();
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  const blocked = task("capacity-rejected", [0], "text");
  await assert.rejects(submit(blocked), /capacity/);
  assert.equal(await get(blocked.taskId), null);
  assert.equal(posts("capacity-rejected"), 0);
  await invoke("task_host_cancel", { taskId: textRequest.taskId });
  await expect
    .poll(async () => (await get(textRequest.taskId)).status)
    .toBe("unknown");
  const textSuccess = task("text-success", [0], "text");
  await submit(textSuccess);
  await expect
    .poll(async () => (await get(textSuccess.taskId)).status)
    .toBe("succeeded");
  assert.equal(
    (await get(textSuccess.taskId)).outputs[0].text,
    "原生文本已完成",
  );
  report.checks.push({
    name: "native-capacity-and-text-cancel-release",
    passed: true,
  });

  const draftRequest = task("text-draft-restart", [0], "text");
  await submit(draftRequest);
  await expect
    .poll(async () => (await get(draftRequest.taskId)).outputs[0].text)
    .toBe("未确认的原生文本草稿");
  await stop();
  await launch();
  const draft = await get(draftRequest.taskId);
  assert.equal(draft.status, "unknown");
  assert.notEqual(draft.outputs[0].status, "succeeded");
  assert.equal(draft.outputs[0].text, "未确认的原生文本草稿");
  assert.equal((await submit(draftRequest)).status, "unknown");
  assert.equal(posts("text-draft-restart"), 1);
  report.checks.push({
    name: "native-text-draft-process-recovery",
    passed: true,
    record: draft,
  });

  const providerName = `T5-${randomUUID().slice(0, 8)}`;
  const uiRef = credentialId(baseUrl, providerName);
  assert.equal(
    (await invoke("credential_get", { providerId: uiRef })) === null,
    true,
    "UI fixture must never overwrite an existing credential",
  );
  await page.evaluate(
    ({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)),
    {
      key: MODEL_PROVIDER_STORAGE_KEY,
      profile: {
        ...DEFAULT_MODEL_PROVIDER,
        name: providerName,
        baseUrl,
        model: "image-test",
      },
    },
  );
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("提供商", { exact: true }).fill(providerName);
  await page.getByLabel("接口地址").fill(baseUrl);
  await page.getByLabel("API Key").fill(secret);
  await page.getByLabel("模型名称").fill("image-test");
  ownedCredentials.add(uiRef);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page.getByLabel("生成数量").selectOption("4");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page.getByLabel("创作提示词").fill("ui-success");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  const approval = page.getByRole("dialog", { name: "人工审批任务" });
  if (await approval.isVisible())
    await approval.getByRole("button", { name: "批准并提交" }).click();
  await expect.poll(() => posts("ui-success"), { timeout: 10000 }).toBe(1);
  await expect
    .poll(
      async () =>
        (await snapshot()).projects
          .flatMap((project) => project.tasks)
          .find((task) => task.prompt === "ui-success")?.status,
      { timeout: 10000 },
    )
    .toBe("succeeded");
  const uiTask = (await snapshot()).projects
    .flatMap((project) => project.tasks)
    .find((task) => task.prompt === "ui-success");
  assert.equal(uiTask.completedOutputs, 4);
  assert.equal(
    report.requests.find((event) => event.prompt === "ui-success")
      .projectIntent,
    true,
  );
  await page.screenshot({ path: path.join(output, "native-ui-success.png") });
  // Successful project uses normal application exit. The in-flight image/text
  // recovery cases above and below deliberately terminate the owned process.
  await stop(true);
  await launch();
  assert.equal(posts("ui-success"), 1);
  const savedUiTask = (await snapshot()).projects
    .flatMap((project) => project.tasks)
    .find((task) => task.id === uiTask.id);
  assert.equal(savedUiTask.status, "succeeded");
  assert.equal(savedUiTask.idempotencyKey, uiTask.idempotencyKey);
  report.checks.push({
    name: "actual-app-durable-intent-and-restart",
    passed: true,
    taskId: uiTask.id,
    key: uiTask.idempotencyKey,
  });
  await page.getByRole("button", { name: "开始创作", exact: true }).click();
  assert.equal(
    (await invoke("credential_get", { providerId: uiRef })) === secret,
    true,
    "The saved fixture credential must survive a native process restart",
  );
  // Creating a project clears the Home draft. Select the persisted connection
  // through the real menu rather than rewriting settings or credentials.
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const modelMenu = page.getByRole("menu", { name: "选择模型" });
  await modelMenu.getByRole("searchbox").fill("image-test");
  await expect(modelMenu.getByRole("menuitemradio")).toHaveCount(1);
  await modelMenu.getByRole("menuitemradio").click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page.getByLabel("生成数量").selectOption("4");
  await expect
    .poll(async () => (await snapshot()).homeDraft.outputCount)
    .toBe(4);
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page.getByLabel("创作提示词").fill("ui-partial-restart");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await expect
    .poll(() => posts("ui-partial-restart"), { timeout: 10000 })
    .toBe(1);
  const uiPartial = (await snapshot()).projects
    .flatMap((project) => project.tasks)
    .find((task) => task.prompt === "ui-partial-restart");
  await expect
    .poll(async () => (await get(uiPartial.id)).outputs[0].status)
    .toBe("succeeded");
  await expect
    .poll(() =>
      report.requests.some(
        (event) => event.path === "/slow/ui-partial-restart",
      ),
    )
    .toBe(true);
  await stop();
  await launch();
  await expect
    .poll(
      async () =>
        (await snapshot()).projects
          .flatMap((project) => project.tasks)
          .find((task) => task.id === uiPartial.id)?.status,
    )
    .toBe("unknown");
  const unknown = (await snapshot()).projects
    .flatMap((project) => project.tasks)
    .find((task) => task.id === uiPartial.id);
  assert.equal(unknown.completedOutputs, 1);
  assert.equal(unknown.outputs[0].status, "succeeded");
  assert(
    unknown.outputs.slice(1).every((output) => output.status === "unknown"),
  );
  assert.equal(unknown.idempotencyKey, uiPartial.idempotencyKey);
  assert.equal(posts("ui-partial-restart"), 1);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "ui-partial-restart" })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
  await expect(page.getByTestId("task-workbench")).toContainText(
    "受理状态不明",
  );
  await expect(
    page.getByRole("button", { name: "重试剩余", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Generate", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "单项重试", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".batch-cell.is-succeeded")).toHaveCount(1);
  await expect(page.locator(".batch-cell.is-unknown")).toHaveCount(3);
  await expect(page.locator(".batch-matrix-header")).not.toContainText(
    "单项可重试",
  );
  await page.screenshot({
    path: path.join(output, "native-unknown-recovery.png"),
  });
  report.checks.push({
    name: "actual-app-unknown-slot-recovery-no-ordinary-retry",
    passed: true,
    taskId: unknown.id,
    key: unknown.idempotencyKey,
  });
  const storedMetadata = await page.evaluate(() => Object.values(localStorage));
  assert(
    storedMetadata.every((value) => !value.includes(secret)),
    "Synthetic credential leaked to browser storage",
  );
  for (const folder of ["tasks/native-host", "projects", "providers"]) {
    for (const file of await fs.readdir(path.join(dataRoot, folder))) {
      if (file.endsWith(".json"))
        assert(
          !(
            await fs.readFile(path.join(dataRoot, folder, file), "utf8")
          ).includes(secret),
          "Synthetic credential leaked to native data",
        );
    }
  }
  report.checks.push({
    name: "native-and-browser-metadata-secret-isolation",
    passed: true,
  });
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (cause) {
  report.failure = String(cause);
  if (page && !page.isClosed()) {
    report.failureUi = (await page.locator("body").innerText())
      .replaceAll(secret, "<synthetic credential>")
      .slice(0, 12000);
    report.failureMetadata = await page.evaluate((key) => {
      const provider = JSON.parse(localStorage.getItem(key) ?? "null");
      return {
        keys: Object.keys(localStorage),
        provider: provider && {
          name: provider.name,
          model: provider.model,
          baseUrl: provider.baseUrl,
        },
      };
    }, MODEL_PROVIDER_STORAGE_KEY);
  }
  throw cause;
} finally {
  try {
    if (ownedCredentials.size) {
      if (!page || page.isClosed() || app?.exitCode !== null) {
        await stop();
        await launch();
      }
      for (const id of ownedCredentials)
        await invoke("credential_delete", { providerId: id });
      ownedCredentials.clear();
    }
    await stop();
  } catch (cause) {
    report.passed = false;
    report.cleanupFailure = String(cause);
    throw cause;
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    report.finishedAt = new Date().toISOString();
    report.credentialCleanupComplete = ownedCredentials.size === 0;
    report.passed = report.passed && report.credentialCleanupComplete;
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
