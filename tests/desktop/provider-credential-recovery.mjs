import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import net from "node:net";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { credentialId } from "../../src/features/creation/providerCredentials.ts";
import { BROWSER_STORAGE_KEYS } from "../../src/runtime/storage-contract.ts";
import { fingerprintDesktopInputs } from "../../scripts/windows/desktop-release-identity.mjs";

const root = process.cwd();
const runId = randomUUID();
const isolated = path.join(
  root,
  "src-tauri/target/provider-credential-acceptance",
  runId,
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const codexHome = path.join(isolated, "codex-home");
const output = path.resolve(
  process.env.KK_CREDENTIAL_EVIDENCE ??
    path.join(root, "test-results/desktop/provider-credential-recovery", runId),
);
const executable = path.resolve(
  process.env.KK_CREDENTIAL_EXE ??
    path.join(root, "src-tauri/target/release/kk-studio.exe"),
);
const port = 9417;
let baseUrl;
const providerName = `Credential-${runId.slice(0, 8)}`;
let providerId;
const secret = `synthetic-credential-${runId}`;
const initialModel = "synthetic-image-model";
const interruptedModel = "synthetic-image-after-native-commit";
const phaseKey = `kk-test:provider-commit-phase:${runId}`;
const report = {
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  executable,
  executableSha256: createHash("sha256")
    .update(await fs.readFile(executable))
    .digest("hex"),
  sourceInputSha256: fingerprintDesktopInputs(root),
  driverSha256: createHash("sha256")
    .update(
      await fs.readFile(
        path.join(root, "tests/desktop/provider-credential-recovery.mjs"),
      ),
    )
    .digest("hex"),
  dataRoot,
  profile,
  codexHome,
  startupScope:
    "Owned candidate EXE smoke; executable hash is recorded. Does not replace official launcher freshness/receipt acceptance.",
  credentialScope:
    "Only the unique owned credential reference reaches the real vault. Unrelated settings credential probes are isolated.",
  checks: [],
  visualChecks: [],
  phaseChecks: [],
  metadataChecks: [],
  runtimeLoads: [],
  errors: [],
  passed: false,
  credentialCleanupComplete: false,
  modelFixture: {
    baseUrl: null,
    requests: 0,
    bearerMatched: false,
    closed: false,
  },
};
let app;
let browser;
let page;
let attemptedCredential = false;
const modelFixture = createServer((request, response) => {
  report.modelFixture.requests++;
  try {
    assert.equal(request.method, "GET", "Model discovery must use GET");
    assert.equal(request.url === "/v1/models", true, "Unexpected fixture path");
    assert.equal(
      request.headers.authorization === `Bearer ${secret}`,
      true,
      "Model discovery must use the owned vault credential",
    );
    report.modelFixture.bearerMatched = true;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: [{ id: initialModel, capabilities: { modalities: ["image"] } }],
      }),
    );
  } catch (error) {
    report.errors.push(
      String(error instanceof Error ? error.message : error).replaceAll(
        secret,
        "<synthetic credential>",
      ),
    );
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ error: { message: "Fixture rejected request" } }),
    );
  }
});

// Refuse an occupied debugger rather than adopting or stopping another app.
await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(port, "127.0.0.1", () => server.close(resolve));
});
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(codexHome, { recursive: true });
await fs.mkdir(output, { recursive: true });

async function launch() {
  const childEnvironment = { ...process.env };
  for (const name of Object.keys(childEnvironment)) {
    if (
      [
        "openai_api_key",
        "codex_api_key",
        "codex_home",
        "webview2_user_data_folder",
        "webview2_additional_browser_arguments",
      ].includes(name.toLowerCase())
    )
      delete childEnvironment[name];
  }
  app = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...childEnvironment,
      CODEX_HOME: codexHome,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
    },
  });
  let spawnFailure;
  app.once("error", (error) => {
    spawnFailure = error;
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (spawnFailure) throw spawnFailure;
    if (app.exitCode !== null)
      throw new Error("Owned candidate exited before WebView was ready");
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      page = browser.contexts().flatMap((context) => context.pages())[0];
      if (page?.url().includes("tauri.localhost")) {
        const isolateCredentialProbes = async ({
          ownedId,
          phaseKey,
          targetModel,
        }) => {
          const bridge = window.__TAURI_INTERNALS__;
          const originalFetch = window.fetch.bind(window);
          const webview = window.chrome.webview;
          const originalPostMessage = webview.postMessage.bind(webview);
          const trace = [];
          const blocked = (command, args) => {
            if (command === "credential_get" && args.providerId !== ownedId)
              return "read";
            if (
              ["credential_set", "credential_delete"].includes(command) &&
              args.providerId !== ownedId
            )
              return "mutation";
            if (
              command === "commit_provider_connection" &&
              (args.secret || args.clearSecret) &&
              args.providerId !== ownedId
            )
              return "mutation";
          };
          const observe = (command, args, callbackId, errorId) => {
            const commandMatched = command === "commit_provider_connection";
            const rows = Array.isArray(args.connections)
              ? args.connections
              : [];
            const ownedRefMatched = rows.some(
              (item) => item.credentialRef === ownedId,
            );
            const modelMatched = rows.some(
              (item) => item.model === targetModel,
            );
            const ownedCommit =
              commandMatched &&
              rows.some(
                (item) =>
                  item.credentialRef === ownedId && item.model === targetModel,
              );
            const holdReceipt =
              ownedCommit && localStorage.getItem(phaseKey) === "armed";
            const observation = commandMatched
              ? {
                  commandMatched,
                  ownedRefMatched,
                  modelMatched,
                  phaseArmed: localStorage.getItem(phaseKey) === "armed",
                  receiptReturned: false,
                  nativeRejected: false,
                }
              : undefined;
            if (observation) trace.push(observation);
            if (!commandMatched || !ownedRefMatched) return;
            const callback = bridge.callbacks.get(callbackId);
            const errorCallback = bridge.callbacks.get(errorId);
            if (
              typeof callback !== "function" ||
              typeof errorCallback !== "function"
            )
              throw new Error("Owned IPC callback entries are unavailable");
            bridge.callbacks.set(callbackId, (receipt) => {
              observation.receiptReturned = true;
              if (!holdReceipt) return callback(receipt);
              if (
                !Number.isSafeInteger(receipt.revision) ||
                receipt.revision < 1 ||
                receipt.credentialState !== "unchanged"
              )
                return errorCallback(
                  "Owned metadata commit receipt was invalid",
                );
              localStorage.setItem(
                phaseKey,
                JSON.stringify({
                  phase: "native-committed-cache-pending",
                  revision: receipt.revision,
                  credentialState: receipt.credentialState,
                }),
              );
            });
            bridge.callbacks.set(errorId, (error) => {
              observation.nativeRejected = true;
              return errorCallback(error);
            });
          };
          const wrappedFetch = (input, init) => {
            const url = new URL(
              typeof input === "string" || input instanceof URL
                ? String(input)
                : input.url,
              location.href,
            );
            if (url.hostname !== "ipc.localhost")
              return originalFetch(input, init);
            const command = decodeURIComponent(url.pathname.slice(1));
            if (
              ![
                "credential_get",
                "credential_set",
                "credential_delete",
                "commit_provider_connection",
              ].includes(command)
            )
              return originalFetch(input, init);
            const args = JSON.parse(init.body);
            const refusal = blocked(command, args);
            if (refusal)
              return Promise.resolve(
                new Response(
                  JSON.stringify(
                    refusal === "read"
                      ? null
                      : "Unowned credential mutation refused",
                  ),
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "Tauri-Response": refusal === "read" ? "ok" : "error",
                    },
                  },
                ),
              );
            const headers = new Headers(init.headers);
            observe(
              command,
              args,
              Number(headers.get("Tauri-Callback")),
              Number(headers.get("Tauri-Error")),
            );
            return originalFetch(input, init);
          };
          const wrappedPostMessage = (message) => {
            const data = JSON.parse(message);
            if (
              ![
                "credential_get",
                "credential_set",
                "credential_delete",
                "commit_provider_connection",
              ].includes(data.cmd)
            )
              return originalPostMessage(message);
            const refusal = blocked(data.cmd, data.payload);
            if (refusal) {
              bridge.runCallback(
                refusal === "read" ? data.callback : data.error,
                refusal === "read"
                  ? null
                  : "Unowned credential mutation refused",
              );
              return;
            }
            observe(data.cmd, data.payload, data.callback, data.error);
            return originalPostMessage(message);
          };
          window.fetch = wrappedFetch;
          webview.postMessage = wrappedPostMessage;
          const installed =
            window.fetch === wrappedFetch &&
            webview.postMessage === wrappedPostMessage;
          const descriptor = Object.getOwnPropertyDescriptor(bridge, "invoke");
          window.__KK_CREDENTIAL_PROBE__ = {
            trace,
            wrappedFetch,
            wrappedPostMessage,
          };
          let guardSelfCheck = false;
          if (installed) {
            const foreignRef = `unowned-probe-${ownedId}`;
            const response = await window.fetch(
              "http://ipc.localhost/credential_get",
              {
                method: "POST",
                body: JSON.stringify({ providerId: foreignRef }),
              },
            );
            let postMessageBlocked = false;
            const callback = bridge.transformCallback((value) => {
              postMessageBlocked = value === null;
            }, true);
            const error = bridge.transformCallback(() => {}, true);
            webview.postMessage(
              JSON.stringify({
                cmd: "credential_get",
                payload: { providerId: foreignRef },
                callback,
                error,
              }),
            );
            bridge.unregisterCallback(callback);
            bridge.unregisterCallback(error);
            guardSelfCheck =
              (await response.json()) === null &&
              postMessageBlocked &&
              blocked("credential_set", { providerId: foreignRef }) ===
                "mutation" &&
              blocked("credential_delete", { providerId: foreignRef }) ===
                "mutation" &&
              blocked("commit_provider_connection", {
                providerId: foreignRef,
                clearSecret: true,
              }) === "mutation";
          }
          return {
            wrapperInstalled: installed,
            guardSelfCheck,
            invokeWritable: descriptor?.writable === true,
            invokeConfigurable: descriptor?.configurable === true,
          };
        };
        const probeScope = {
          ownedId: providerId,
          phaseKey,
          targetModel: interruptedModel,
        };
        await page.addInitScript(isolateCredentialProbes, probeScope);
        const isolation = await page.evaluate(
          isolateCredentialProbes,
          probeScope,
        );
        report.isolation = isolation;
        if (!isolation.wrapperInstalled || !isolation.guardSelfCheck) {
          const error = new Error(
            "Owned transport isolation failed before opening API settings",
          );
          error.name = "CredentialIsolationError";
          throw error;
        }
        report.runtimeLoads.push(
          await page.evaluate(() => ({
            url: location.href,
            assets: Array.from(document.scripts, (script) => script.src).filter(
              Boolean,
            ),
            entry: document.querySelector('meta[name="kk-runtime-entry"]')
              ?.content,
            mode: document
              .querySelector("[data-runtime-mode]")
              ?.getAttribute("data-runtime-mode"),
          })),
        );
        return;
      }
      await browser.close();
    } catch (error) {
      if (error.name === "CredentialIsolationError") throw error;
      /* Owned WebView is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Owned candidate WebView was not available");
}

async function stopOwned(check) {
  const ownedApp = app;
  let forced = false;
  if (check)
    assert.equal(
      ownedApp?.exitCode,
      null,
      "Owned app must be running at the crash boundary",
    );
  if (ownedApp?.pid && ownedApp.exitCode === null) {
    try {
      execFileSync("taskkill", ["/PID", String(ownedApp.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      forced = true;
    } catch {
      /* Owned process may have exited itself. */
    }
  }
  if (ownedApp?.pid)
    await expect
      .poll(() => ownedApp.exitCode !== null || ownedApp.signalCode !== null, {
        timeout: 15_000,
      })
      .toBe(true);
  if (check) {
    assert(ownedApp?.pid, "Interruption requires an owned app process");
    assert.equal(
      forced,
      true,
      "Owned process interruption must use a successful forced kill",
    );
    report.checks.push(check);
    report.interruptedProcess = {
      pid: ownedApp.pid,
      exitCode: ownedApp.exitCode,
      signalCode: ownedApp.signalCode,
      forced,
    };
  }
  app = undefined;
  if (browser) {
    try {
      await browser.close();
    } catch {
      /* The owned WebView is already gone. */
    }
  }
  browser = undefined;
  page = undefined;
}

async function closeOwnedWindow(check = "user-close-exits-owned-process") {
  const closeSettings = page.getByRole("button", {
    name: "关闭设置",
    exact: true,
  });
  if (await closeSettings.isVisible()) await closeSettings.click();
  const ownedApp = app;
  await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
  await expect
    .poll(() => ownedApp.exitCode, { timeout: 15_000 })
    .not.toBeNull();
  assert.equal(ownedApp.exitCode, 0, "Owned user close must exit successfully");
  report.checks.push(check);
  await stopOwned();
}

async function invoke(command, args = {}) {
  return page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );
}

async function openApi() {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
}

async function expectSaved(tag, model = initialModel) {
  await expect(page.getByLabel("接口地址")).toHaveValue(baseUrl);
  await expect(page.getByLabel("模型名称", { exact: true })).toHaveValue(model);
  await expect(page.getByLabel("API Key", { exact: true })).toHaveAttribute(
    "placeholder",
    "已配置；重新输入可替换",
  );
  await expect(page.getByLabel("API Key", { exact: true })).toHaveValue("");
  assert.equal(
    (await invoke("credential_get", { providerId })) === secret,
    true,
    "Synthetic vault credential must survive without plaintext in the field",
  );
  report.checks.push(tag);
}

async function checkMetadataHasNoSecret(tag) {
  const browserValues = await page.evaluate(() => Object.values(localStorage));
  assert.equal(
    browserValues.some((value) => value.includes(secret)),
    false,
    "Synthetic secret must not enter browser storage",
  );
  const files = [];
  async function inspect(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      assert.equal(
        entry.isSymbolicLink(),
        false,
        "Owned metadata must not link outside its root",
      );
      if (entry.isDirectory()) await inspect(file);
      else if (entry.isFile()) {
        assert.equal(
          (await fs.readFile(file)).includes(Buffer.from(secret)),
          false,
          "Native provider metadata, backup and stage files must omit the secret",
        );
        files.push(path.relative(dataRoot, file));
      }
    }
  }
  await inspect(path.join(dataRoot, "providers"));
  assert(files.includes(path.join("providers", "connections.json")));
  report.metadataChecks.push({
    phase: tag,
    files,
    browserAndNativeSecretFree: true,
  });
  report.checks.push(tag);
}

async function captureUi(tag) {
  const api = page.getByRole("region", { name: "官方 API Key 配置" });
  const row = api.getByRole("listitem").filter({ hasText: providerName });
  await expect(row).toContainText("正在编辑");
  const visibleTargets = [];
  async function captureVisible(locator, target, file) {
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toBeVisible();
    await expect(locator).toBeInViewport({ ratio: 1 });
    const geometry = await locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        bounds: {
          left: bounds.left,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
          width: bounds.width,
          height: bounds.height,
        },
        viewport: { width: innerWidth, height: innerHeight },
      };
    });
    assert(geometry.bounds.width > 0 && geometry.bounds.height > 0);
    assert(geometry.bounds.left >= 0 && geometry.bounds.top >= 0);
    assert(geometry.bounds.right <= geometry.viewport.width);
    assert(geometry.bounds.bottom <= geometry.viewport.height);
    const visual = { phase: tag, target, ...geometry, fullyInViewport: true };
    visibleTargets.push(visual);
    report.visualChecks.push(visual);
    await page.screenshot({ path: path.join(output, file) });
  }
  await row.scrollIntoViewIfNeeded();
  await captureVisible(
    row.getByText("正在编辑", { exact: true }),
    "正在编辑",
    `${tag}-editing-label.png`,
  );
  const model = api.getByLabel("模型名称", { exact: true });
  await captureVisible(model, "模型名称", `${tag}-model.png`);
  const directoryStatus = api
    .getByRole("status")
    .filter({ hasText: "模型列表已获取" });
  if (await directoryStatus.count())
    await captureVisible(directoryStatus, "模型列表已获取", `${tag}.png`);
  else await page.screenshot({ path: path.join(output, `${tag}.png`) });
  const dom = await api.evaluate((element) => ({
    statuses: Array.from(
      element.querySelectorAll('[role="status"]'),
      (node) => node.textContent,
    ),
    editing: Array.from(
      element.querySelectorAll(".provider-connection-list .is-active"),
      (node) => node.textContent,
    ),
  }));
  dom.model = await model.inputValue();
  dom.visibleTargets = visibleTargets;
  await fs.writeFile(
    path.join(output, `${tag}.dom.json`),
    JSON.stringify(dom, null, 2),
  );
  report.checks.push(`${tag}-editing-label`);
}

async function captureDiagnostic(tag) {
  const diagnostic = await page.evaluate((key) => {
    const probe = window.__KK_CREDENTIAL_PROBE__;
    const api = document.querySelector('[aria-label="官方 API Key 配置"]');
    return {
      wrapperInstalled: Boolean(
        probe &&
        window.fetch === probe.wrappedFetch &&
        window.chrome.webview.postMessage === probe.wrappedPostMessage,
      ),
      phase: localStorage.getItem(key),
      trace: probe?.trace ?? [],
      statuses: Array.from(
        api?.querySelectorAll('[role="status"]') ?? [],
        (node) => node.textContent,
      ),
    };
  }, phaseKey);
  const sanitized = JSON.parse(
    JSON.stringify(diagnostic).replaceAll(secret, "<synthetic credential>"),
  );
  report.diagnostic = sanitized;
  await fs.writeFile(
    path.join(output, `${tag}.json`),
    JSON.stringify(sanitized, null, 2),
  );
  if (
    !(await page.evaluate(
      (value) => document.body.innerText.includes(value),
      secret,
    ))
  )
    await page.screenshot({ path: path.join(output, `${tag}.png`) });
}

async function expectRecoveredIdentity(connectionId, model, tag) {
  await expectSaved(tag, model);
  const native = await invoke("read_provider_config");
  const cache = await page.evaluate(
    (keys) => ({
      connections: JSON.parse(
        localStorage.getItem(keys.providerConnections) ?? "[]",
      ),
      profile: JSON.parse(localStorage.getItem(keys.modelProvider) ?? "{}"),
    }),
    BROWSER_STORAGE_KEYS,
  );
  for (const connections of [native.connections, cache.connections]) {
    const current = connections.find((item) => item.id === connectionId);
    assert.equal(current?.credentialRef, providerId);
    assert.equal(current?.model, model);
  }
  assert.equal(cache.profile.connectionId, connectionId);
  assert.equal(cache.profile.model, model);
  await checkMetadataHasNoSecret(`${tag}-secret-free`);
  await captureUi(tag);
}

try {
  await new Promise((resolve, reject) => {
    modelFixture.once("error", reject);
    modelFixture.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${modelFixture.address().port}/v1`;
  providerId = credentialId(baseUrl, providerName);
  report.modelFixture.baseUrl = baseUrl;
  await launch();
  assert.equal(
    (await invoke("credential_get", { providerId })) === null,
    true,
    "Never overwrite an existing credential",
  );
  await openApi();
  await page.getByLabel("提供商", { exact: true }).fill(providerName);
  await page.getByLabel("接口地址").fill(baseUrl);
  await expect(page.getByLabel("API Key", { exact: true })).toHaveAttribute(
    "placeholder",
    "输入你的 API Key",
  );
  await page.getByLabel("API Key", { exact: true }).fill(secret);
  await page.getByLabel("模型名称", { exact: true }).fill(initialModel);
  attemptedCredential = true;
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "官方 API Key 配置" })
      .getByRole("status")
      .filter({ hasText: "连接信息已保存" }),
  ).toBeVisible();
  await expectSaved("save-does-not-refill-plaintext");
  const before = await invoke("read_provider_config");
  const connection = before.connections.find(
    (item) => item.credentialRef === providerId,
  );
  assert(
    connection,
    "Saved connection must carry its original credential reference",
  );
  report.connectionId = connection.id;
  await captureUi("normal-save");
  const discoveryCacheBefore = await page.evaluate(
    (keys) => ({
      connections: localStorage.getItem(keys.providerConnections),
      profile: localStorage.getItem(keys.modelProvider),
    }),
    BROWSER_STORAGE_KEYS,
  );
  await page
    .getByRole("button", { name: "测试连接并刷新模型", exact: true })
    .click();
  const api = page.getByRole("region", { name: "官方 API Key 配置" });
  await expect(api.getByText("模型列表已获取", { exact: true })).toBeVisible();
  await expect(
    api.getByText("已获取 1 个模型；生成能力仍需实际验证。", { exact: true }),
  ).toBeVisible();
  assert.equal(
    report.modelFixture.requests,
    1,
    "Model discovery must use the owned loopback fixture exactly once",
  );
  assert.equal(report.modelFixture.bearerMatched, true);
  assert.equal(
    JSON.stringify(await invoke("read_provider_config")) ===
      JSON.stringify(before),
    true,
    "Model discovery must not write native config or generation verification",
  );
  const discoveryCacheAfter = await page.evaluate(
    (keys) => ({
      connections: localStorage.getItem(keys.providerConnections),
      profile: localStorage.getItem(keys.modelProvider),
    }),
    BROWSER_STORAGE_KEYS,
  );
  assert.deepEqual(discoveryCacheAfter, discoveryCacheBefore);
  await expect(api.getByText("未验证生成", { exact: true })).toBeVisible();
  await checkMetadataHasNoSecret("synthetic-model-directory-secret-free");
  await captureUi("synthetic-model-directory");
  report.checks.push(
    "synthetic-model-directory-does-not-save-or-verify-generation",
  );
  await page.reload();
  await openApi();
  await expectSaved("webview-reload-restores-key-status");
  await page.screenshot({ path: path.join(output, "saved-after-reload.png") });
  await closeOwnedWindow();
  await launch();
  await openApi();
  await expectSaved("native-process-restart-restores-key-status");
  const after = await invoke("read_provider_config");
  assert.equal(
    after.connections.find((item) => item.id === connection.id)?.credentialRef,
    providerId,
  );
  await checkMetadataHasNoSecret(
    "native-and-browser-metadata-contain-no-secret",
  );
  await page.screenshot({
    path: path.join(output, "saved-after-native-restart.png"),
  });

  const cacheBefore = await page.evaluate(
    (keys) => ({
      connections: localStorage.getItem(keys.providerConnections),
      profile: localStorage.getItem(keys.modelProvider),
    }),
    BROWSER_STORAGE_KEYS,
  );
  await page.evaluate((key) => localStorage.setItem(key, "armed"), phaseKey);
  await page.getByLabel("模型名称", { exact: true }).fill(interruptedModel);
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), phaseKey))
    .toContain("native-committed-cache-pending");
  const phase = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    phaseKey,
  );
  const committed = await invoke("read_provider_config");
  const committedConnection = committed.connections.find(
    (item) => item.id === connection.id,
  );
  assert.equal(committed.revision, phase.revision);
  assert.equal(committedConnection?.credentialRef, providerId);
  assert.equal(committedConnection?.model, interruptedModel);
  const cachePending = await page.evaluate(
    (keys) => ({
      connections: localStorage.getItem(keys.providerConnections),
      profile: localStorage.getItem(keys.modelProvider),
    }),
    BROWSER_STORAGE_KEYS,
  );
  assert.deepEqual(
    cachePending,
    cacheBefore,
    "Cache must still carry the earlier acknowledged save",
  );
  assert.equal(
    (await invoke("credential_get", { providerId })) === secret,
    true,
  );
  report.phaseChecks.push({
    phase: phase.phase,
    revision: phase.revision,
    credentialState: phase.credentialState,
    nativeModelCommitted: true,
    cacheStillOld: true,
    syntheticVaultCredentialPreserved: true,
  });
  await checkMetadataHasNoSecret("native-committed-cache-pending-secret-free");
  await captureUi("native-committed-cache-pending");
  await stopOwned("native-commit-cache-pending-process-killed-and-reaped");
  for (let restart = 1; restart <= 2; restart++) {
    await launch();
    await openApi();
    await expectRecoveredIdentity(
      connection.id,
      interruptedModel,
      `cache-publication-crash-restart-${restart}`,
    );
    if (restart === 1)
      await closeOwnedWindow(
        "first-crash-recovery-user-close-exits-owned-process",
      );
  }
  report.passed = true;
} catch (error) {
  report.errors.push(
    String(error instanceof Error ? error.message : error).replaceAll(
      secret,
      "<synthetic credential>",
    ),
  );
  if (page && !page.isClosed()) {
    try {
      await captureDiagnostic("failure-diagnostic");
    } catch {
      report.errors.push("Owned UI diagnostic could not be captured");
    }
  }
} finally {
  try {
    if (modelFixture.listening) {
      modelFixture.closeAllConnections();
      await new Promise((resolve, reject) =>
        modelFixture.close((error) => (error ? reject(error) : resolve())),
      );
    }
    report.modelFixture.closed = !modelFixture.listening;
  } catch {
    report.errors.push("Owned model directory fixture could not be closed");
  }
  try {
    if (attemptedCredential) {
      if (!page || app?.exitCode !== null) {
        await stopOwned();
        await launch();
      }
      const current = await invoke("credential_get", { providerId });
      if (current === secret) await invoke("credential_delete", { providerId });
      else if (current !== null)
        throw new Error(
          "Fixture credential changed externally; preserve it instead of deleting",
        );
      report.credentialCleanupComplete =
        (await invoke("credential_get", { providerId })) === null;
    } else report.credentialCleanupComplete = true;
  } catch (error) {
    report.errors.push(
      String(error instanceof Error ? error.message : error).replaceAll(
        secret,
        "<synthetic credential>",
      ),
    );
  }
  if (page && report.errors.length === 0) {
    try {
      await closeOwnedWindow("cleanup-user-close-exits-owned-process");
    } catch (error) {
      report.errors.push(
        String(error instanceof Error ? error.message : error).replaceAll(
          secret,
          "<synthetic credential>",
        ),
      );
      await stopOwned();
    }
  } else await stopOwned();
  report.passed =
    report.passed &&
    report.errors.length === 0 &&
    report.credentialCleanupComplete &&
    report.modelFixture.closed;
  await fs.writeFile(
    path.join(output, "provider-credential-recovery.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
}
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      checks: report.checks,
      credentialCleanupComplete: report.credentialCleanupComplete,
      modelFixture: report.modelFixture,
      evidence: output,
      errors: report.errors,
    },
    null,
    2,
  ),
);
process.exitCode = report.passed ? 0 : 1;
