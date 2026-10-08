import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { credentialId } from "../../src/features/creation/providerCredentials.ts";
import {
  claimFixtureCredential,
  releaseFixtureCredential,
} from "./image-edit-credential.mjs";

const root = process.cwd(),
  executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(
  root,
  ".tmp/image-edit/desktop",
  `run-${Date.now()}-${process.pid}`,
);
const dataRoot = path.join(evidence, "data"),
  profile = path.join(evidence, "webview-profile");
const cdp = "http://127.0.0.1:9364",
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requests = [],
  errors = [];
const fixtureProvider = `Image edit fixture ${randomUUID()}`;
let resultBase64, child, browser, page, vaultId, receipt;
let credentialConflictPreserved = false;
async function canvasImageAction(node, name) {
  await node.locator(".uploaded-image").click();
  const toolbar = page.getByRole("toolbar", { name: /^图片操作：/ });
  await expect(toolbar).toBeVisible();
  await expect(node.getByRole("button", { name, exact: true })).toHaveCount(0);
  await toolbar.getByRole("button", { name, exact: true }).click();
}
const server = createServer(async (request, response) => {
  try {
    assert.equal(request.url, "/v1/images/edits");
    assert.equal(
      request.headers.authorization,
      "Bearer fixture-image-edit-key",
    );
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const form = await new Request("http://127.0.0.1/v1/images/edits", {
      method: "POST",
      headers: { "Content-Type": request.headers["content-type"] },
      body: Buffer.concat(chunks),
    }).formData();
    const images = [...form.entries()]
      .filter(([key]) => key === "image" || key === "image[]")
      .map(([, value]) => value);
    assert.equal(images.length, 1);
    assert.equal(form.get("mask").type, "image/png");
    assert.equal(form.get("size"), "1024x1024");
    requests.push({
      maskMime: form.get("mask").type,
      imageCount: images.length,
      size: form.get("size"),
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data: [{ b64_json: resultBase64 }] }));
  } catch (error) {
    errors.push(String(error));
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ error: { message: "fixture rejected request" } }),
    );
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
const saved = () =>
  page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
  );
const nativeInvoke = (command, args = {}) =>
  page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );
async function closeApp() {
  const owned = Boolean(child);
  await browser?.close().catch(() => {});
  browser = undefined;
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await exited;
  }
  child = undefined;
  if (owned)
    await expect
      .poll(() =>
        fetch(`${cdp}/json/version`)
          .then((r) => r.ok)
          .catch(() => false),
      )
      .toBe(false);
}
async function launch() {
  assert.equal(
    await fetch(`${cdp}/json/version`)
      .then((r) => r.ok)
      .catch(() => false),
    false,
    "test CDP port already in use",
  );
  child = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9364 --remote-debugging-address=127.0.0.1",
    },
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error(`Desktop exited: ${child.exitCode}`);
    ready = await fetch(`${cdp}/json/version`)
      .then((r) => r.ok)
      .catch(() => false);
    if (ready) break;
    await pause(200);
  }
  assert(ready, "Desktop CDP did not start");
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.waitForURL("http://tauri.localhost/");
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  assert.equal(
    path
      .resolve(
        await page.evaluate(() =>
          window.__TAURI_INTERNALS__.invoke("get_storage_root"),
        ),
      )
      .toLowerCase(),
    dataRoot.toLowerCase(),
  );
}
try {
  await launch();
  resultBase64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 32, 32);
    return c.toDataURL().split(",")[1];
  });
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByLabel("提供商", { exact: true }).fill(fixtureProvider);
  await page.getByLabel("接口地址").fill(baseUrl);
  const fixtureId = credentialId(baseUrl, fixtureProvider);
  vaultId = await claimFixtureCredential(nativeInvoke, fixtureId);
  const conflictValue = "synthetic-image-edit-existing-value";
  await nativeInvoke("credential_set", {
    providerId: vaultId,
    secret: conflictValue,
  });
  await assert.rejects(
    claimFixtureCredential(nativeInvoke, fixtureId),
    /existing credential/,
  );
  assert.equal(
    (await nativeInvoke("credential_get", { providerId: vaultId })) ===
      conflictValue,
    true,
    "Refused fixture registration must retain the existing value",
  );
  credentialConflictPreserved = true;
  await releaseFixtureCredential(nativeInvoke, vaultId);
  vaultId = undefined;
  vaultId = await claimFixtureCredential(nativeInvoke, fixtureId);
  await page.getByLabel("API Key").fill("fixture-image-edit-key");
  await page.getByLabel("模型名称").fill("image-test");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    page.getByText("连接信息已保存。API Key 不会写入浏览器存储或项目快照。", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.evaluate(() => {
    {
      const connections = JSON.parse(
        localStorage.getItem("kk-studio-next:provider-connections:v1"),
      );
      localStorage.setItem(
        "kk-studio:model-catalog:v1",
        JSON.stringify(
          connections.map((connection) => ({
            id: connection.id,
            baseUrl: connection.baseUrl,
            credentialRef: connection.credentialRef,
            source: "manual",
            fetchedAt: Date.now(),
            models: [
              {
                id: "image-test",
                kind: "image",
                sizes: ["1024x1024", "2048x2048"],
                image: {
                  generate: true,
                  edit: false,
                  inpaint: true,
                  maxReferences: 6,
                },
                source: "manual",
              },
            ],
          })),
        ),
      );
    }
    window.dispatchEvent(new Event("kk:model-provider-changed"));
  });
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.locator(".canvas-node-image").first();
  const original = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 100;
    c.height = 80;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#555555";
    ctx.fillRect(0, 0, 100, 80);
    ctx.fillStyle = "#2233aa";
    ctx.fillRect(30, 20, 30, 30);
    return c.toDataURL().split(",")[1];
  });
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "native-mask.png",
      mimeType: "image/png",
      buffer: Buffer.from(original, "base64"),
    });
  await expect(node.locator(".uploaded-image")).toBeVisible();
  await canvasImageAction(node, "重绘参考图片");
  const dialog = page.getByRole("dialog", { name: "重绘参考图片" });
  await dialog.getByRole("button", { name: "框选区域", exact: true }).click();
  const image = await dialog.locator("canvas.image-original").boundingBox();
  await page.mouse.move(
    image.x + image.width * 0.3,
    image.y + image.height * 0.3,
  );
  await page.mouse.down();
  await page.mouse.move(
    image.x + image.width * 0.5,
    image.y + image.height * 0.5,
  );
  await page.mouse.up();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await dialog.getByRole("button", { name: "撤销编辑" }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "0 个编辑区域",
  );
  await dialog.getByRole("button", { name: "重做编辑" }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await dialog
    .getByRole("button", { name: "清空编辑区域", exact: true })
    .click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "0 个编辑区域",
  );
  await expect(
    dialog.getByRole("button", { name: "清空编辑区域", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "撤销编辑" }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await dialog.getByRole("button", { name: "重做编辑" }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "0 个编辑区域",
  );
  await dialog.getByRole("button", { name: "撤销编辑" }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await dialog.getByRole("textbox", { name: "重绘指令" }).fill("局部改成红色");
  await expect
    .poll(
      async () =>
        (await saved()).snapshot?.projects[0]?.items[0]?.imageEditDraft?.regions
          .length,
    )
    .toBe(1);
  await page.screenshot({ path: path.join(evidence, "editor-native.png") });
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  await expect
    .poll(async () => (await saved()).snapshot?.projects[0]?.tasks[0]?.status, {
      timeout: 20000,
    })
    .toBe("succeeded");
  const snapshot = (await saved()).snapshot,
    project = snapshot.projects[0],
    task = project.tasks[0];
  assert(task.imageEdit.nativeMask);
  assert.equal(
    (await nativeInvoke("task_host_get", { taskId: task.id }))
      .imageEditRequired,
    true,
  );
  assert.equal(requests.length, 1);
  assert.equal(project.items.length, 2);
  const protection = await page.evaluate(
    async ({ task }) => {
      async function pixels(id) {
        const record = await window.__TAURI_INTERNALS__.invoke("asset_read", {
          assetId: id,
        });
        const image = new Image();
        image.src = `data:${record.metadata.mime};base64,${record.dataBase64}`;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = image.naturalWidth;
        c.height = image.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      }
      const before = await pixels(task.imageEdit.sourceAssetId),
        after = await pixels(task.outputs[0].assetId),
        mask = new Set();
      for (const region of task.imageEdit.document.regions)
        for (const [y, x, end] of region.runs)
          for (let p = x; p < end; p++) mask.add(y * 100 + p);
      let changed = 0,
        outsideChanged = 0;
      for (let p = 0; p < 8000; p++)
        for (let channel = 0; channel < 4; channel++)
          if (before[p * 4 + channel] !== after[p * 4 + channel]) {
            if (mask.has(p)) changed++;
            else outsideChanged++;
          }
      return { changed, outsideChanged };
    },
    { task },
  );
  assert(protection.changed > 0);
  assert.equal(protection.outsideChanged, 0);
  const packagePath = path.join(evidence, "mask.kkproj"),
    restored = path.join(evidence, "restored");
  const exported = await page.evaluate(
    ({ destination, revision }) =>
      window.__TAURI_INTERNALS__.invoke("export_project_package", {
        destination,
        expectedRevision: revision,
      }),
    { destination: packagePath, revision: snapshot.revision },
  );
  assert(exported.assetIds.includes(task.imageEdit.maskAssetId));
  const imported = await page.evaluate(
    ({ source, targetRoot }) =>
      window.__TAURI_INTERNALS__.invoke("import_project_package", {
        source,
        targetRoot,
      }),
    { source: packagePath, targetRoot: restored },
  );
  assert.deepEqual(imported.assetIds, exported.assetIds);
  const restoredSnapshot = JSON.parse(
    await readFile(path.join(restored, "projects/creation-v2.json"), "utf8"),
  );
  assert.deepEqual(
    restoredSnapshot.projects[0].tasks[0].imageEdit,
    task.imageEdit,
  );
  assert.deepEqual(
    restoredSnapshot.projects[0].items[0].imageEditDraft,
    project.items[0].imageEditDraft,
  );
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await canvasImageAction(node, "放大查看参考图片");
  const lightbox = page.getByRole("dialog", { name: /预览/ });
  await expect(
    lightbox.getByRole("navigation", { name: "相关图片" }).getByRole("button"),
  ).toHaveCount(2);
  await lightbox.getByRole("button", { name: "删除图片", exact: true }).click();
  await lightbox
    .getByRole("button", { name: "确认删除图片", exact: true })
    .click();
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator(".image-lightbox-info")).toContainText(
    "100 × 80",
  );
  await lightbox.getByRole("button", { name: "重新生成", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await saved()).snapshot?.projects[0]?.tasks.map((task) => task.status),
      { timeout: 20000 },
    )
    .toEqual(["succeeded", "succeeded"]);
  const regenerated = (await saved()).snapshot.projects[0];
  assert.equal(regenerated.tasks.length, 2);
  assert.equal(regenerated.items.length, 2);
  assert.equal(regenerated.tasks[1].retryOfTaskId, undefined);
  assert.notEqual(regenerated.tasks[1].idempotencyKey, task.idempotencyKey);
  assert.equal(requests.length, 2);
  await page.screenshot({ path: path.join(evidence, "lightbox-native.png") });
  const runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document
      .querySelector("[data-runtime-mode]")
      ?.getAttribute("data-runtime-mode"),
    entry: document
      .querySelector("[data-runtime-entry]")
      ?.getAttribute("data-runtime-entry"),
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
    styles: [...document.styleSheets].map((s) => s.href).filter(Boolean),
  }));
  const distScripts = [];
  for (const url of runtime.scripts) {
    const file = new URL(url).pathname,
      expected = await readFile(path.join(root, "dist", file));
    const actual = Buffer.from(
      await page.evaluate(
        async (url) =>
          Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
        url,
      ),
    );
    const sha256 = createHash("sha256").update(actual).digest("hex");
    assert.equal(sha256, createHash("sha256").update(expected).digest("hex"));
    distScripts.push({ file, sha256 });
  }
  await closeApp();
  await launch();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect
    .poll(
      async () => (await saved()).snapshot?.projects[0]?.tasks.at(-1)?.status,
    )
    .toBe("succeeded");
  const restarted = (await saved()).snapshot.projects[0];
  assert.equal(
    restarted.items.length,
    2,
    "deleted original must not return on restart",
  );
  assert(
    restarted.items.every(
      (item) => item.assetId !== task.imageEdit.sourceAssetId,
    ),
  );
  assert.equal(requests.length, 2, "restart must not resubmit edits");
  const restartedReceipts = await nativeInvoke("task_host_list");
  assert.equal(restartedReceipts.length, 2);
  assert(
    restartedReceipts.every((record) => record.imageEditRequired === true),
  );
  assert.deepEqual(errors, []);
  receipt = {
    runtime,
    distScripts,
    executableSha256: createHash("sha256")
      .update(await readFile(executable))
      .digest("hex"),
    requests,
    protection,
    packageAssetCount: exported.assetIds.length,
    restart: "PASS",
    compositionMarkerSurvivedRestart: true,
    clearUndoRedo: "PASS",
    credentialConflictPreserved,
    errors,
  };
} catch (error) {
  if (page && browser) {
    await page
      .screenshot({ path: path.join(evidence, "failure.png") })
      .catch(() => {});
    const summary = await saved()
      .then((value) =>
        value.snapshot?.projects.flatMap((project) =>
          project.tasks.map((task) => ({
            id: task.id,
            status: task.status,
            error: task.error,
          })),
        ),
      )
      .catch(() => undefined);
    await writeFile(
      path.join(evidence, "failure.json"),
      JSON.stringify(
        { error: String(error), summary, requests, errors },
        null,
        2,
      ) + "\n",
    );
  }
  throw error;
} finally {
  try {
    if (vaultId) {
      if (
        !page ||
        page.isClosed() ||
        !browser?.isConnected() ||
        child?.exitCode !== null
      ) {
        await closeApp();
        await launch();
      }
      await releaseFixtureCredential(nativeInvoke, vaultId);
      vaultId = undefined;
    }
  } finally {
    try {
      await closeApp();
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }
}
receipt.credentialCleanupComplete = true;
await writeFile(
  path.join(evidence, "desktop-acceptance.json"),
  JSON.stringify(receipt, null, 2) + "\n",
);
process.stdout.write(
  JSON.stringify({ desktopImageEdit: "PASS", evidence, ...receipt }) + "\n",
);
