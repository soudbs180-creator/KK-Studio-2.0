import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { createServer } from "node:http";
import { fingerprintDesktopInputs } from "../../scripts/windows/desktop-release-identity.mjs";

// This test uses the optional loopback driver. No Native command is mocked.
const root = process.cwd();
const exe = path.resolve(process.argv[2] ?? "");
const buildReceipt = JSON.parse(
  await fs.readFile(
    path.join(path.dirname(exe), "native-e2e.build-receipt.json"),
    "utf8",
  ),
);
assert.equal(
  buildReceipt.sourceHead,
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
);
assert.equal(buildReceipt.inputSha256, fingerprintDesktopInputs(root));
assert.equal(
  buildReceipt.runtimeManifestSha256,
  createHash("sha256")
    .update(
      await fs.readFile(
        path.join(root, "src-tauri/agent-runtime/runtime-manifest.json"),
      ),
    )
    .digest("hex"),
  "Native evidence must use the currently packaged Agent resources",
);
assert.equal(
  buildReceipt.executableSha256,
  createHash("sha256")
    .update(await fs.readFile(exe))
    .digest("hex"),
);
assert(
  exe.startsWith(
    path.join(root, "src-tauri", "target", "native-e2e") + path.sep,
  ),
);
const isolated = await fs.mkdtemp(path.join(os.tmpdir(), "kk-native-e2e-"));
const output = path.resolve(
  process.env.KK_NATIVE_E2E_OUTPUT ?? path.join(root, ".tmp/native-e2e"),
);
await fs.mkdir(output, { recursive: true });
const data = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const key = `native-e2e-${randomUUID()}`;
const secret = `synthetic-${randomUUID()}`;
const address = "http://127.0.0.1:9347";
const requests = [];
const report = {
  buildReceipt,
  startedAt: new Date().toISOString(),
  platform: process.platform,
  arch: process.arch,
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  sourceDirty: execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  executableSha256: createHash("sha256")
    .update(await fs.readFile(exe))
    .digest("hex"),
  buildScope:
    "Production frontend/shared Native host with explicitly compiled test-only driver; not byte-identical to shipping build",
  data,
  checks: [],
  startupSignals: [],
  errors: [],
  passed: false,
};
const backend = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined;
  requests.push({
    path: request.url,
    method: request.method,
    authorization: Boolean(request.headers.authorization),
    origin: request.headers.origin,
    body,
  });
  if (request.url === "/v1/models") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: [
          { id: "fixture-text-a", capabilities: { modalities: ["text"] } },
          { id: "fixture-text-b", capabilities: { modalities: ["text"] } },
        ],
      }),
    );
  } else if (request.url === "/v1/chat/completions") {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.end(
      `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: `# ${body.model}\n\nNative public fixture reply.` }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`,
    );
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${backend.address().port}/v1`;
let app,
  session,
  vaultWritten = false;
async function driver(method, route, value) {
  const response = await fetch(address + route, {
    method,
    headers: { "Content-Type": "application/json" },
    body: value === undefined ? undefined : JSON.stringify(value),
    signal: AbortSignal.timeout(180000),
  });
  const result = await response.json();
  if (!response.ok || (result.value?.error && result.value.ok === undefined))
    throw new Error(
      `WebDriver ${route}: ${result.value?.message ?? response.status}`,
    );
  return result.value;
}
const execute = (script, args = []) =>
  driver("POST", `/session/${session}/execute/sync`, { script, args });
async function invoke(command, args = {}) {
  const result = await driver("POST", `/session/${session}/execute/async`, {
    script:
      "const done=arguments[arguments.length-1]; window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(value=>done({ok:true,value})).catch(error=>done({ok:false,error:String(error)}));",
    args: [command, args],
  });
  assert.equal(result.ok, true, result.error);
  return result.value;
}
async function poll(operation, accept, timeout = 30000) {
  const until = Date.now() + timeout;
  let value;
  while (Date.now() < until) {
    value = await operation();
    if (accept(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out: ${JSON.stringify(value)}`);
}
async function click(label) {
  await poll(
    () =>
      execute(
        "const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===arguments[0] || e.getAttribute('aria-label')===arguments[0] || e.getAttribute('title')===arguments[0]); if(!e || e.disabled) return false; e.click(); return true;",
        [label],
      ),
    Boolean,
  );
}
async function select(label, value) {
  await execute(
    "const e=[...document.querySelectorAll('select')].find(e=>e.getAttribute('aria-label')===arguments[0]); if(!e) throw new Error('Missing select'); e.value=arguments[1]; e.dispatchEvent(new Event('change',{bubbles:true}));",
    [label, value],
  );
}
async function screenshot(name) {
  const pixels = await driver("GET", `/session/${session}/screenshot`);
  await fs.writeFile(
    path.join(output, name + ".png"),
    Buffer.from(pixels, "base64"),
  );
}
async function launch() {
  assert.equal(
    await fetch(address + "/status", { signal: AbortSignal.timeout(500) })
      .then(() => true)
      .catch(() => false),
    false,
    "Driver port must be free",
  );
  app = spawn(exe, ["--data-dir", data], {
    cwd: path.dirname(exe),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      KK_NATIVE_E2E: "1",
      TAURI_WEBDRIVER_PORT: "9347",
      WEBVIEW2_USER_DATA_FOLDER: profile,
    },
  });
  for (const stream of [app.stdout, app.stderr])
    stream.on("data", (chunk) =>
      fs.appendFile(path.join(output, "native-process.log"), chunk),
    );
  app.once("exit", (code, signal) =>
    report.startupSignals.push({
      stage: "process-exit",
      at: new Date().toISOString(),
      pid: app.pid,
      code,
      signal,
    }),
  );
  const deadline = Date.now() + 60000;
  const remaining = () => Math.max(0, deadline - Date.now());
  const record = (stage, value) =>
    report.startupSignals.push({
      stage,
      at: new Date().toISOString(),
      pid: app.pid,
      value,
    });
  record("spawn", exe);
  await poll(
    () =>
      fetch(address + "/status", { signal: AbortSignal.timeout(1000) })
        .then(async (response) =>
          response.ok ? (await response.json()).value?.ready === true : false,
        )
        .catch(() => false),
    (value) => value,
    remaining(),
  );
  record("webview-registered", true);
  const created = await driver("POST", "/session", {
    capabilities: {
      alwaysMatch: { "wdio:tauriServiceOptions": { windowLabel: "main" } },
    },
  });
  session = created.sessionId;
  assert(session);
  // The driver responds to /status before a webview exists. Its sync script
  // wrapper stores results in the page, so initial navigation can discard them.
  // Native URL/title commands confirm navigation before that wrapper is used.
  const pageUrl = await poll(
    () => driver("GET", `/session/${session}/url`),
    (value) =>
      process.platform === "win32"
        ? value === "http://tauri.localhost/"
        : ["tauri://localhost", "tauri://localhost/"].includes(value),
    remaining(),
  );
  record("production-url", pageUrl);
  const title = await poll(
    () => driver("GET", `/session/${session}/title`),
    (value) => typeof value === "string" && value.startsWith("KK Studio"),
    remaining(),
  );
  record("production-title", title);
  // Hashing the complete bundled runtime on a fresh host precedes startup.
  // This remains a bounded Native call; it is not a provider turn.
  await driver("POST", `/session/${session}/timeouts`, { script: 30000 });
  await poll(
    () =>
      execute("return document.querySelector('.app')?.dataset.runtimeMode;"),
    (value) => value === "production",
    remaining(),
  );
  record("production-dom", true);
  assert.equal(
    path.resolve(await invoke("get_storage_root")),
    path.resolve(data),
  );
}
async function close() {
  const ended = () => app.exitCode !== null || app.signalCode !== null;
  if (app && !ended()) {
    await driver("DELETE", `/session/${session}`).catch(() => {});
    if (process.platform === "win32")
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `$taskApp = Get-Process -Id ${app.pid} -ErrorAction SilentlyContinue; if($taskApp) { $taskApp.CloseMainWindow() | Out-Null }`,
        ],
        { windowsHide: true },
      );
    else app.kill("SIGTERM");
    await poll(async () => ended(), Boolean, 15000);
  }
}
try {
  await launch();
  await invoke("credential_set", { providerId: key, secret });
  vaultWritten = true;
  assert.equal(await invoke("credential_get", { providerId: key }), secret);
  report.checks.push({ name: "real-synthetic-system-vault", passed: true });
  const appearance = await invoke("window_appearance_get");
  assert.equal(appearance.enabled, false);
  assert.equal(typeof appearance.supported, "boolean");
  const appearanceTransitions = [];
  for (const enabled of [true, false]) {
    const applied = await invoke("window_appearance_set", { enabled });
    const actual = await invoke("window_appearance_get");
    assert.equal(actual.supported, appearance.supported);
    assert.equal(applied.supported, actual.supported);
    assert.equal(actual.enabled, appearance.supported && enabled);
    assert.equal(applied.enabled, actual.enabled);
    if (!appearance.supported) assert(actual.reason);
    appearanceTransitions.push({ requested: enabled, applied, actual });
  }
  report.checks.push({
    name: "real-native-window-background-readback-and-restoration",
    initial: appearance,
    transitions: appearanceTransitions,
    passed: true,
  });
  const models = await invoke("provider_models_read", {
    requestId: "model-page-native-e2e",
    url: baseUrl + "/models",
    protocol: "openai-compatible",
  });
  assert.equal(JSON.parse(models.body).data.length, 2);
  report.checks.push({ name: "real-local-model-discovery", passed: true });
  const connections = ["a", "b"].map((letter) => ({
    id: `native-fixture-${letter}`,
    provider: `Native fixture ${letter}`,
    displayName: `Native fixture ${letter}`,
    kind: "user_byok",
    baseUrl,
    model: `fixture-text-${letter}`,
    protocol: "openai-compatible",
    authMode: "none",
    credentialRef: `fixture-ref-${letter}`,
    capabilities: {
      modalities: ["text"],
      operations: ["chat", "generate"],
      async: false,
    },
    state: "active",
    concurrencyLimit: 2,
  }));
  const previous = await invoke("read_provider_config");
  await invoke("write_provider_config", {
    connections,
    expectedRevision: previous.revision,
  });
  await execute("setTimeout(()=>location.reload(), 500); return true;");
  await new Promise((resolve) => setTimeout(resolve, 750));
  await poll(
    () => execute("return !!document.querySelector('.app');"),
    Boolean,
  );
  await execute(
    "window.__nativeTaskFailures=[]; const original=window.__TAURI_INTERNALS__.invoke; window.__TAURI_INTERNALS__.invoke=(command,args,options)=>original(command,args,options).catch(error=>{if(command==='task_host_submit') window.__nativeTaskFailures.push(String(error)); throw error;}); return true;",
  );
  await click("项目库");
  await click("新建项目");
  await poll(
    () =>
      execute(
        "return !!document.querySelector('select[aria-label=\"执行方式\"]');",
      ),
    Boolean,
  );
  await select("执行方式", "models");
  await poll(
    () =>
      execute(
        "return !!document.querySelector('select[aria-label=\"对话模型 1\"]');",
      ),
    Boolean,
  );
  await select(
    "对话模型 1",
    JSON.stringify([connections[0].id, connections[0].model]),
  );
  await select(
    "对话模型 2",
    JSON.stringify([connections[1].id, connections[1].model]),
  );
  await select("对话助手", "assistant-code-reviewer");
  await execute(
    "const e=document.querySelector('textarea[aria-label=\"多模型对话输入\"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Report your model ID in Markdown.'); e.dispatchEvent(new Event('input',{bubbles:true}));",
  );
  await poll(
    () =>
      execute(
        "return ![...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='同时发送')?.disabled;",
      ),
    Boolean,
  );
  await click("同时发送");
  const state = await poll(
    () => invoke("read_creation_snapshot"),
    (value) =>
      value.snapshot?.projects[0]?.tasks.filter((t) => t.status === "succeeded")
        .length === 2,
    60000,
  );
  const project = state.snapshot.projects[0];
  for (const task of project.tasks) {
    assert.equal(task.providerAuthMode, "none");
    assert.equal(task.outputs[0].status, "succeeded");
    assert(task.outputs[0].text.includes(task.model));
    assert.equal(
      task.conversationMessages.filter((m) => m.role === "system").length,
      1,
    );
    assert.equal(
      (await invoke("task_host_get", { taskId: task.id })).outputs[0].text,
      task.outputs[0].text,
    );
  }
  assert.equal(
    await execute(
      "return document.querySelectorAll('.provider-conversation-replies h1').length;",
    ),
    2,
  );
  assert.equal(requests.filter((r) => r.method === "POST").length, 2);
  assert(requests.every((r) => !r.authorization && !r.origin));
  report.checks.push({
    name: "real-ui-two-model-round-native-journal-markdown",
    taskIds: project.tasks.map((t) => t.id),
    passed: true,
  });
  await screenshot("two-model-round");
  const packageFile = path.join(isolated, "native.kkproject");
  const restored = path.join(isolated, "restored");
  let savedRevision;
  const exportState = await poll(
    async () => {
      const saved = await execute(
        "return document.querySelector('.project-save-state')?.textContent.trim() === '已保存';",
      );
      const value = await invoke("read_creation_snapshot");
      const revision = value.snapshot?.revision;
      const settled =
        saved && Number.isSafeInteger(revision) && revision === savedRevision;
      savedRevision = saved ? revision : undefined;
      return { value, settled };
    },
    (value) => value.settled,
  );
  report.packageExportRevision = exportState.value.snapshot.revision;
  await invoke("export_project_package", {
    destination: packageFile,
    expectedRevision: report.packageExportRevision,
  });
  await invoke("preflight_project_package", { source: packageFile });
  await invoke("import_project_package", {
    source: packageFile,
    targetRoot: restored,
  });
  const loaded = JSON.parse(
    await fs.readFile(path.join(restored, "projects/creation-v2.json"), "utf8"),
  );
  assert.deepEqual(loaded.projects[0].tasks, project.tasks);
  report.checks.push({ name: "real-native-package-roundtrip", passed: true });
  const status = await invoke("agent_runtime_status");
  report.resourceDirectory = await invoke("plugin:path|resolve_directory", {
    directory: 11,
  });
  const resourceRoot = path.resolve(report.resourceDirectory);
  assert(
    resourceRoot.startsWith(
      path.resolve(root, "src-tauri/target/native-e2e") + path.sep,
    ),
    "Test resources must stay inside the owned build target",
  );
  const runtime = path.join(resourceRoot, "agent-runtime");
  if (!(await fs.stat(runtime).catch(() => null)))
    await fs.cp(path.join(root, "src-tauri/agent-runtime"), runtime, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  assert.equal(
    (await invoke("agent_runtime_status")).available,
    true,
    status.reason,
  );
  report.runtimeManifestSha256 = createHash("sha256")
    .update(await fs.readFile(path.join(runtime, "runtime-manifest.json")))
    .digest("hex");
  assert.equal(
    report.runtimeManifestSha256,
    buildReceipt.runtimeManifestSha256,
    "The reused test target contains stale Agent resources",
  );
  await driver("POST", `/session/${session}/timeouts`, { script: 150000 });
  const started = await invoke("agent_runtime_start");
  assert.equal((await invoke("agent_runtime_status")).healthy, true);
  report.checks.push({
    name: "real-bundled-agent-start",
    pid: started.pid,
    passed: true,
  });
  // Never serialize the returned Agent token.
  await invoke("agent_runtime_stop");
  await close();
  await launch();
  assert.equal(await invoke("credential_get", { providerId: key }), secret);
  const retained = await invoke("read_creation_snapshot");
  assert.deepEqual(retained.snapshot.projects[0].tasks, project.tasks);
  report.checks.push({
    name: "real-app-restart-vault-and-project",
    passed: true,
  });
  await invoke("credential_delete", { providerId: key });
  vaultWritten = false;
  report.passed = true;
} catch (error) {
  report.errors.push(String(error.stack ?? error));
  if (session)
    report.nativeTaskFailures = await execute(
      "return window.__nativeTaskFailures;",
    ).catch(() => null);
  process.exitCode = 1;
  if (session) await screenshot("failure").catch(() => {});
} finally {
  if (session) await invoke("agent_runtime_stop").catch(() => {});
  if (vaultWritten && session)
    await invoke("credential_delete", { providerId: key }).catch((error) =>
      report.errors.push(`Owned synthetic cleanup failed: ${error.message}`),
    );
  await close().catch((error) => {
    report.errors.push(`Owned app cleanup failed: ${error.message}`);
    app?.kill();
    process.exitCode = 1;
  });
  await new Promise((resolve) => backend.close(resolve));
  if (report.errors.length) report.passed = false;
  report.finishedAt = new Date().toISOString();
  report.requests = requests;
  await fs.writeFile(
    path.join(output, "receipt.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  process.stdout.write(
    JSON.stringify({
      passed: report.passed,
      output,
      checks: report.checks.length,
      errors: report.errors,
    }) + "\n",
  );
}
