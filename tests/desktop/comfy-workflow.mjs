import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const root = process.cwd(),
  directory = process.env.KK_COMFY_EVIDENCE_DIR;
assert(
  directory && path.isAbsolute(directory),
  "Set KK_COMFY_EVIDENCE_DIR to a new absolute evidence directory",
);
await fs.mkdir(directory, { recursive: false });
const exe = path.join(root, "src-tauri/target/release/kk-studio.exe");
await fs.access(exe);
const fixture = path.join(directory, "fixture-ComfyUI");
await fs.mkdir(path.join(fixture, "comfy"), { recursive: true });
await fs.writeFile(path.join(fixture, "folder_paths.py"), "");
const statePath = path.join(directory, "engine-state.json");
const command = [
  process.execPath,
  path.join(root, "tests/helpers/comfyEngineFixture.mjs"),
  root,
  statePath,
];
await fs.writeFile(
  path.join(fixture, "main.py"),
  `import subprocess\nsubprocess.call(${JSON.stringify(command)})\n`,
);
const data = path.join(directory, "data"),
  profile = path.join(directory, "webview-profile");
await fs.mkdir(data);
await fs.mkdir(profile);
const port = 9348;
try {
  const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
    signal: AbortSignal.timeout(300),
  });
  assert(!response.ok, "Native test CDP port is already occupied");
} catch (error) {
  if (error.code === "ERR_ASSERTION") throw error;
}
const child = spawn(exe, ["--data-dir", data], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_USER_DATA_FOLDER: profile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
  },
});
let browser, page;
const diagnostics = [];
try {
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  page = browser.contexts().flatMap((c) => c.pages())[0];
  assert(page);
  page.on("console", (m) =>
    diagnostics.push({ type: m.type(), text: m.text().slice(0, 500) }),
  );
  page.on("pageerror", (e) => diagnostics.push({ error: e.message }));
  page.on("requestfailed", (r) =>
    diagnostics.push({ url: r.url(), error: r.failure()?.errorText }),
  );
  await page.waitForURL("http://tauri.localhost/");
  const actual = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(
    path.resolve(actual).toLowerCase(),
    path.resolve(data).toLowerCase(),
  );
  const scan = await page.evaluate(
    (root) =>
      window.__TAURI_INTERNALS__.invoke("comfyui_scan_directory", { root }),
    fixture,
  );
  assert(scan.detected);
  const start = await page.evaluate(
    (p) =>
      window.__TAURI_INTERNALS__.invoke("comfyui_start_process", { path: p }),
    fixture,
  );
  assert(start.owned && start.pid);
  try {
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            window.__TAURI_INTERNALS__.invoke("comfyui_process_status"),
          ),
        { timeout: 20_000 },
      )
      .toMatchObject({ owned: true, ready: true });
  } catch (error) {
    const diagnostic = {
      direct: await fetch("http://127.0.0.1:8188/system_stats", {
        signal: AbortSignal.timeout(2000),
      })
        .then((r) => r.status)
        .catch((e) => e.name),
      native: await page.evaluate(() =>
        window.__TAURI_INTERNALS__
          .invoke("comfyui_http_json", { path: "/system_stats", body: null })
          .catch((error) => ({ error: String(error) })),
      ),
      proxyEnvironment: Boolean(
        process.env.HTTP_PROXY ||
        process.env.HTTPS_PROXY ||
        process.env.ALL_PROXY,
      ),
    };
    await fs.writeFile(
      path.join(directory, "health-diagnostic.json"),
      JSON.stringify(diagnostic),
    );
    throw error;
  }
  await page.evaluate(() =>
    localStorage.setItem(
      "kk-studio.comfyui.workflows.v1",
      JSON.stringify([
        {
          id: "native-fixture",
          name: "Native fixture workflow",
          description: "no GPU",
          source: "imported",
          tags: [],
          createdAt: 1,
          updatedAt: 1,
          workflow: { 1: { class_type: "FixtureOutput", inputs: {} } },
        },
      ]),
    ),
  );
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "ComfyUI 工作流", exact: true })
    .click();
  const card = page.getByTestId("comfy-workflow-node");
  await expect(card).toBeVisible();
  await card.getByLabel("选择 ComfyUI 工作流").selectOption("native-fixture");
  await expect(
    card.getByRole("button", { name: "快速生成", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(async () =>
      JSON.parse(await fs.readFile(statePath, "utf8")).clients.some((c) =>
        c.endsWith("-host"),
      ),
    )
    .toBe(true);
  await card.getByRole("button", { name: "快速生成", exact: true }).click();
  await expect(page.locator('[data-node-id^="comfy-output-"]')).toHaveCount(1, {
    timeout: 20_000,
  });
  await card.getByRole("button", { name: "进入工作流", exact: true }).click();
  const frame = page.frameLocator('iframe[title="ComfyUI 原生编辑器"]');
  await expect(
    frame.getByRole("button", { name: "Queue Prompt" }),
  ).toBeVisible();
  const isolation = await page
    .frames()
    .find((f) => f.url().startsWith("http://127.0.0.1:8188"))
    ?.evaluate(async () => ({
      ipc: typeof window.__TAURI_INTERNALS__,
      name: window.name,
      access: await window.__TAURI_INTERNALS__?.invoke("get_storage_root").then(
        () => "ALLOWED",
        (error) => String(error),
      ),
    }));
  await fs.writeFile(
    path.join(directory, "iframe-isolation.json"),
    JSON.stringify(isolation),
  );
  assert.match(isolation.access, /not allowed by ACL/);
  assert.match(isolation.name, /-editor$/);
  // WebView2 CDP mouse input in a top-layer iframe is not a native pointer acceptance check.
  await frame.getByRole("button", { name: "Queue Prompt" }).focus();
  await frame.getByRole("button", { name: "Queue Prompt" }).press("Enter");
  await expect
    .poll(
      async () =>
        JSON.parse(await fs.readFile(statePath, "utf8")).prompts.length,
      { timeout: 5000 },
    )
    .toBe(2);
  await page.getByRole("button", { name: "← 返回画布", exact: true }).click();
  await expect(page.locator('[data-node-id^="comfy-output-"]')).toHaveCount(2, {
    timeout: 20_000,
  });
  const snapshot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
  );
  const saved = snapshot.snapshot;
  assert(saved?.projects);
  const project = saved.projects.find(
    (p) => p.items.filter((i) => i.id.startsWith("comfy-output-")).length === 2,
  );
  assert(project, "both outputs must be in one durable project");
  const outputs = project.items.filter((i) => i.id.startsWith("comfy-output-"));
  const source = project.items.find((i) => i.comfyWorkflow);
  for (const output of outputs) {
    assert(
      project.canvas.edges.some(
        (e) =>
          e.source === source.id &&
          e.target === output.id &&
          e.kind === "result",
      ),
    );
    const original = await page.evaluate(
      (assetId) => window.__TAURI_INTERNALS__.invoke("asset_read", { assetId }),
      output.assetId,
    );
    assert.equal(
      createHash("sha256")
        .update(Buffer.from(original.dataBase64, "base64"))
        .digest("hex"),
      createHash("sha256")
        .update(
          await fs.readFile(
            path.join(root, "public/fixtures/demo/blue-hour.png"),
          ),
        )
        .digest("hex"),
    );
  }
  await fs.writeFile(
    path.join(directory, "snapshot-response.json"),
    JSON.stringify(snapshot, null, 2),
  );
  await page.screenshot({
    path: path.join(directory, "native-comfy-canvas.png"),
  });
  const engine = JSON.parse(await fs.readFile(statePath, "utf8"));
  assert.equal(engine.prompts.length, 2);
  assert(engine.wsSent >= 2);
  assert(engine.prompts[0].client.endsWith("-host"));
  assert(engine.prompts[1].client.endsWith("-editor"));
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .getByRole("button", { name: `打开编辑 ${project.name}`, exact: true })
    .click();
  await expect(page.locator('[data-node-id^="comfy-output-"]')).toHaveCount(2, {
    timeout: 20_000,
  });
  await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("comfyui_stop_process"),
  );
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.__TAURI_INTERNALS__.invoke("comfyui_process_status"),
        ),
      { timeout: 15_000 },
    )
    .toMatchObject({ owned: false, ready: false, pid: null });
  const bytes = await fs.readFile(exe);
  await fs.writeFile(
    path.join(directory, "receipt.json"),
    JSON.stringify(
      {
        exe,
        exeSha256: createHash("sha256").update(bytes).digest("hex"),
        engine,
        isolation,
        source:
          "isolated native fixture; no GPU or installed-client acceptance",
      },
      null,
      2,
    ),
  );
  console.log(
    "Native P6.1 fixture: owned process, IPC, WebSocket, editor queue, archive, canvas edges, reload and stop PASS",
  );
} finally {
  await fs.writeFile(
    path.join(directory, "page-diagnostics.json"),
    JSON.stringify(diagnostics, null, 2),
  );
  if (page)
    await page
      .evaluate(() => window.__TAURI_INTERNALS__.invoke("comfyui_stop_process"))
      .catch(() => {});
  await browser?.close().catch(() => {});
  child.kill();
}
