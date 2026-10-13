import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { credentialId } from "../../src/features/creation/providerCredentials.ts";

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
const baseUrl = "https://synthetic.invalid/v1";
const providerName = `Credential-${runId.slice(0, 8)}`;
const providerId = credentialId(baseUrl, providerName);
const secret = `synthetic-credential-${runId}`;
const report = {
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  executable,
  executableSha256: createHash("sha256")
    .update(await fs.readFile(executable))
    .digest("hex"),
  dataRoot,
  profile,
  codexHome,
  startupScope:
    "Owned candidate EXE smoke; executable hash is recorded. Does not replace official launcher freshness/receipt acceptance.",
  credentialScope:
    "Only the unique owned credential reference reaches the real vault. Unrelated settings credential probes are isolated.",
  checks: [],
  runtimeLoads: [],
  errors: [],
  passed: false,
  credentialCleanupComplete: false,
};
let app;
let browser;
let page;
let attemptedCredential = false;

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
              return Promise.reject(
                new Error("Unowned credential mutation refused"),
              );
            if (
              command === "commit_provider_connection" &&
              (args.secret || args.clearSecret) &&
              args.providerId !== ownedId
            )
              return Promise.reject(
                new Error("Unowned credential commit refused"),
              );
            return original(command, args, ...rest);
          };
        };
        await page.addInitScript(isolateCredentialProbes, providerId);
        await page.evaluate(isolateCredentialProbes, providerId);
        report.runtimeLoads.push(
          await page.evaluate(() => ({
            url: location.href,
            assets: Array.from(document.scripts, (script) => script.src).filter(
              Boolean,
            ),
            entry: document.querySelector('meta[name="kk-runtime-entry"]')
              ?.content,
          })),
        );
        return;
      }
      await browser.close();
    } catch {
      /* Owned WebView is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Owned candidate WebView was not available");
}

async function stopOwned() {
  if (app?.pid && app.exitCode === null) {
    try {
      execFileSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      /* Owned process may have exited itself. */
    }
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

async function expectSaved(tag) {
  await expect(page.getByLabel("接口地址")).toHaveValue(baseUrl);
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

try {
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
  await page
    .getByLabel("模型名称", { exact: true })
    .fill("synthetic-image-model");
  attemptedCredential = true;
  await page.getByRole("button", { name: "保存", exact: true }).click();
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
  const browserValues = await page.evaluate(() => Object.values(localStorage));
  assert(
    browserValues.every((value) => !value.includes(secret)),
    "Synthetic secret must not enter browser storage",
  );
  const nativeMetadata = await fs.readFile(
    path.join(dataRoot, "providers/connections.json"),
    "utf8",
  );
  assert.equal(nativeMetadata.includes(secret), false);
  report.checks.push("native-and-browser-metadata-contain-no-secret");
  await page.screenshot({
    path: path.join(output, "saved-after-native-restart.png"),
  });
  report.passed = true;
} catch (error) {
  report.errors.push(
    String(error instanceof Error ? error.message : error).replaceAll(
      secret,
      "<synthetic credential>",
    ),
  );
} finally {
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
    report.credentialCleanupComplete;
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
      evidence: output,
      errors: report.errors,
    },
    null,
    2,
  ),
);
process.exitCode = report.passed ? 0 : 1;
