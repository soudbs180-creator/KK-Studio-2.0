import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import {
  createProject,
  emptySnapshot,
  serializeCreationSnapshot,
} from "../../src/features/creation/model.ts";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems.ts";
import { createProjectCanvas } from "../../src/domain/projectCanvas.ts";
import { credentialId } from "../../src/integrations/providers/credentialVault.ts";
import { inspectDesktopRelease } from "../../scripts/windows/desktop-release.mjs";

const evidence = process.env.KK_STEP2_DESKTOP_EVIDENCE;
const dataRoot = process.env.KK_STEP2_DESKTOP_DATA;
assert(evidence && dataRoot, "Explicit isolated Desktop paths required");
assert(
  path.resolve(dataRoot).startsWith(path.resolve(evidence)),
  "Data must be isolated below this evidence run",
);
await fs.mkdir(evidence, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  checks: [],
  requests: 0,
  passed: false,
};
const secret = `fixture-step2-${randomUUID()}`;
const providerName = `Step2-${randomUUID().slice(0, 8)}`;
const shot = {
  id: "1",
  scene: "门口",
  description: "小林穿红衣",
  dialogue: "我回来了",
  durationSeconds: 3,
  shotSize: "MS",
  cameraMovement: "固定",
  characters: ["小林"],
  props: [],
  assetIds: [],
};
const server = createServer(
  (req, res) =>
    void respond(req, res).catch((error) => {
      res.writeHead(500);
      res.end(String(error).replaceAll(secret, "<synthetic>"));
    }),
);
async function respond(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ data: [{ id: "gpt-storyboard-fixture" }] }));
    return;
  }
  assert.equal(
    req.headers.authorization === `Bearer ${secret}`,
    true,
    "Fixture authentication missing",
  );
  let body = "";
  for await (const chunk of req) body += chunk;
  const input = JSON.parse(body);
  assert.equal(input.model, "gpt-storyboard-fixture");
  const prompt = input.messages[0].content;
  report.requests++;
  const content = prompt.includes("提炼角色设定表")
    ? [{ characterName: "小林", kind: "costume", requiredAttributes: ["红衣"] }]
    : {
        title: "回家",
        shots: [
          {
            ...shot,
            id: prompt.includes('"id":"1-1"') ? "1-1" : "1",
            description:
              report.requests === 2
                ? "小林穿蓝衣"
                : report.requests > 3
                  ? "小林穿红衣，缓步走进门口"
                  : shot.description,
          },
        ],
      };
  res.setHeader("Content-Type", "text/event-stream");
  res.end(
    `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(content) } }] })}\n\ndata: [DONE]\n\n`,
  );
}
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
const credential = credentialId(baseUrl, providerName);
let browser,
  page,
  ownsCredential = false;
const check = (name) => {
  report.checks.push(name);
  console.log(`PASS ${name}`);
};
const invoke = (command, args) =>
  page.evaluate(
    ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
    { command, args },
  );
try {
  report.release = inspectDesktopRelease(process.cwd());
  assert.equal(
    report.release.reason,
    "current",
    "Desktop receipt must match current source",
  );
  browser = await chromium.connectOverCDP("http://127.0.0.1:19993");
  page = browser.contexts().flatMap((c) => c.pages())[0];
  assert(page);
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  const actualRoot = await invoke("get_storage_root");
  assert.equal(
    path.resolve(actualRoot).toLowerCase(),
    path.resolve(dataRoot).toLowerCase(),
  );
  report.runtime = await page.evaluate(() => ({
    url: location.href,
    entry: document.querySelector(".app")?.getAttribute("data-runtime-entry"),
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
  }));
  check("current-native-runtime-and-isolated-data-root");
  await seed();
  await optics();
  await configure();
  await storyboard();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "架构蓝图映射", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "导出架构蓝图", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: path.join(evidence, "desktop-blueprint-menu.png"),
  });
  check("native-blueprint-export-action");
  const saved = (await invoke("read_creation_snapshot")).snapshot;
  assert.equal(JSON.stringify(saved).includes(secret), false);
  assert.equal(
    saved.projects[0].items.find((i) => i.id === "image").parameters.optics
      .azimuthDeg,
    -45,
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await openProject();
  await expect(
    page.locator(
      '.canvas-node[data-testid^="canvas-node-storyboard-"]:not([data-testid^="canvas-node-storyboard-source-"])',
    ),
  ).toHaveCount(1);
  check("native-reload-preserves-optics-and-repaired-shot");
  report.passed = true;
} catch (error) {
  report.error = String(error).replaceAll(secret, "<synthetic>");
  process.exitCode = 1;
} finally {
  if (ownsCredential && page) {
    await invoke("credential_delete", { providerId: credential });
    assert.equal(
      await invoke("credential_get", { providerId: credential }),
      null,
    );
    check("synthetic-credential-cleanup");
  }
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(
    path.join(evidence, "desktop-receipt.json"),
    JSON.stringify(report, null, 2),
  );
}
async function seed() {
  const loaded = await invoke("read_creation_snapshot");
  assert(
    !loaded.snapshot?.projects?.length ||
      loaded.snapshot.projects.every((p) => p.name === "深水区桌面验证"),
    "Never replace unrelated data",
  );
  const project = createProject({
    prompt: "",
    kind: "image",
    model: "kk-image-2",
    attachments: [],
  });
  project.name = "深水区桌面验证";
  project.items = structuredClone(BASE_CANVAS_ITEMS);
  project.canvas = createProjectCanvas(project.items);
  project.chats[project.activeChatId].messages = [];
  project.messages = [];
  const snapshot = serializeCreationSnapshot({
    ...emptySnapshot(),
    version: 3,
    revision: (loaded.snapshot?.revision ?? 0) + 1,
    activeProjectId: project.id,
    projects: [project],
  });
  await invoke("write_creation_snapshot", {
    expectedRevision:
      loaded.status === "missing" ? null : loaded.snapshot.revision,
    snapshot,
  });
  await page.reload();
  await openProject();
}
async function openProject() {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "深水区桌面验证" })
    .click();
  await expect(page.getByTestId("canvas-node-image")).toBeVisible();
}
async function optics() {
  const node = page.getByTestId("canvas-node-image");
  await node.focus();
  await page.keyboard.press("Enter");
  await node.getByRole("button", { name: "镜头与导演台", exact: true }).click();
  await node.getByRole("button", { name: "启用光学参数", exact: true }).click();
  await node
    .getByRole("button", { name: "肖像特写 85mm f/1.4", exact: true })
    .click();
  await node.getByLabel("水平环绕角", { exact: true }).fill("");
  await node.getByLabel("水平环绕角", { exact: true }).pressSequentially("-45");
  await node.getByLabel("水平环绕角", { exact: true }).press("Tab");
  await expect(node.getByLabel("水平环绕角", { exact: true })).toHaveValue(
    "-45",
  );
  await page.screenshot({ path: path.join(evidence, "desktop-director.png") });
  await node.getByRole("button", { name: "镜头与导演台", exact: true }).click();
  check("native-director-preset-and-negative-angle");
}
async function configure() {
  assert.equal(
    await invoke("credential_get", { providerId: credential }),
    null,
    "Fixture credential must be new",
  );
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "模型接入", exact: true })
    .click();
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await page.getByLabel("提供商", { exact: true }).fill(providerName);
  await page.getByLabel("接口地址").fill(baseUrl);
  await page.getByLabel("API Key", { exact: true }).fill(secret);
  await page.getByLabel("模型名称").fill("gpt-storyboard-fixture");
  ownsCredential = true;
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  check("native-configured-loopback-text-provider");
}
async function storyboard() {
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "漫剧分镜工作流", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "小说 / 剧本转分镜",
    exact: true,
  });
  await dialog
    .getByLabel("小说 / 剧本", { exact: true })
    .fill("小林穿红衣走进门口，说：我回来了。");
  await dialog
    .getByRole("button", { name: "从剧本提炼设定表", exact: true })
    .click();
  await expect(dialog.getByLabel("固定特征", { exact: true })).toHaveValue(
    "红衣",
  );
  await dialog.getByRole("button", { name: "生成分镜", exact: true }).click();
  await expect(dialog).toContainText("一致性检查通过");
  assert.equal(report.requests, 3);
  await dialog
    .getByRole("button", { name: "添加到画布 / 资产", exact: true })
    .click();
  await expect(dialog).toContainText("分镜已保存");
  await dialog
    .getByRole("button", { name: "重修本镜 1-1", exact: true })
    .click();
  await expect(dialog).toContainText("缓步走进门口");
  assert.equal(report.requests, 4);
  await page.screenshot({
    path: path.join(evidence, "desktop-storyboard.png"),
  });
  await dialog.getByRole("button", { name: "关闭对话框", exact: true }).click();
  check("native-bible-repair-and-single-shot-writeback");
}
