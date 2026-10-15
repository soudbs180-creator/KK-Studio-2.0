import { expect, test, type Page } from "@playwright/test";
import { startAgentServer } from "../helpers/agentServer";
import { expandSidebar, openSeededProject } from "./helpers";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../src/domain/modelProvider";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/features/creation/providerRegistry";
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
  createProject,
  type CreationSnapshot,
} from "../../src/features/creation/model";

const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const provider = {
  id: "legacy-main-gate",
  provider: "Main Gate Fixture",
  displayName: "Main Gate Fixture",
  model: "image-test",
  baseUrl: "https://main-gate.example.test/v1",
  kind: "user_byok",
  credentialRef: "synthetic-missing-credential",
  state: "active",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    async: false,
  },
  concurrencyLimit: 1,
  verificationStatus: "unverified",
};

async function seed(
  page: Page,
  endpoint: string,
  outputCount = 1,
  legacyProject = false,
) {
  const initial = emptySnapshot();
  initial.revision = Date.now();
  initial.homeDraft.model = "image-test";
  initial.homeDraft.outputCount = outputCount;
  if (legacyProject) {
    const project = createProject({
      prompt: "旧项目保留",
      model: "image-test",
      kind: "image",
      attachments: [],
    });
    project.name = "旧 API 独立项目";
    project.composerDraft.prompt = "API 未发送草稿";
    initial.projects = [project];
  }
  await page.addInitScript(
    ({ endpoint, initial, provider, snapshotKey, profileKey, registryKey }) => {
      if (localStorage.getItem("codex-home-seeded")) return;
      localStorage.setItem("codex-home-seeded", "true");
      localStorage.setItem("canvas-agent-url", endpoint);
      localStorage.setItem(snapshotKey, JSON.stringify(initial));
      localStorage.setItem(
        profileKey,
        JSON.stringify({
          version: 1,
          name: provider.provider,
          model: provider.model,
          baseUrl: provider.baseUrl,
        }),
      );
      localStorage.setItem(registryKey, JSON.stringify([provider]));
    },
    {
      endpoint,
      initial,
      provider,
      snapshotKey: CREATION_STORAGE_KEY,
      profileKey: MODEL_PROVIDER_STORAGE_KEY,
      registryKey: PROVIDER_CONNECTIONS_STORAGE_KEY,
    },
  );
}

async function snapshot(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    CREATION_STORAGE_KEY,
  );
}

async function attachHomeRuntime(page: Page) {
  await test.info().attach("home-recovery-runtime", {
    body: JSON.stringify(
      await page.evaluate(() => {
        const app = document.querySelector<HTMLElement>(".app");
        const composer = document.querySelector('[aria-label="对话内容"]');
        return {
          url: location.href,
          route: location.pathname,
          mode: app?.dataset.runtimeMode,
          entry: app?.dataset.runtimeEntry,
          scripts: [...document.scripts]
            .map((script) => script.src)
            .filter(Boolean),
          viewport: { width: innerWidth, height: innerHeight },
          composer: composer?.getBoundingClientRect().toJSON(),
        };
      }),
    ),
    contentType: "application/json",
  });
}

test("首页默认账号生图不被旧 image-test 接管，保存后只发一个 turn 并归档重载", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  const history: unknown[] = [];
  let apiCalls = 0;
  let durableAtTurn: CreationSnapshot | undefined;
  try {
    await seed(page, agent.url);
    await page.route("https://main-gate.example.test/**", async (route) => {
      apiCalls++;
      await route.abort();
    });
    await page.route(agent.url + "/agent/codex/turn", async (route) => {
      durableAtTurn = await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open("kk-studio-next", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const read = db
                .transaction("creation")
                .objectStore("creation")
                .get("snapshot");
              read.onsuccess = () => {
                db.close();
                resolve(read.result);
              };
              read.onerror = () => {
                db.close();
                reject(read.error);
              };
            };
          }),
      );
      await route.continue();
    });
    await page.route(agent.url + "/agent/codex/threads/*", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            json: {
              ok: true,
              conversation: agent.conversation(),
              messages: history,
            },
          })
        : route.continue(),
    );
    await page.route(agent.url + "/agent/codex/generated-image/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(pixel, "base64"),
      }),
    );
    await page.goto("/");
    const beforeRegistry = await page.evaluate(
      (key) => localStorage.getItem(key),
      PROVIDER_CONNECTIONS_STORAGE_KEY,
    );
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText("Codex 内置生图");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    const menu = page.getByRole("menu", { name: "选择模型" });
    const builtin = menu.getByRole("menuitemradio", {
      name: /^Codex 内置生图/,
    });
    await expect(builtin).not.toHaveAttribute("aria-disabled", "true");
    await menu.getByRole("menuitem", { name: /^API 自定义模型/ }).click();
    await menu.getByRole("menuitem", { name: /^Main Gate Fixture/ }).click();
    await menu.getByRole("menuitemradio", { name: /^image-test/ }).click();
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText("image-test");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await menu.getByRole("button", { name: "返回上一级", exact: true }).click();
    await menu.getByRole("button", { name: "返回上一级", exact: true }).click();
    await builtin.click();
    await page.getByLabel("创作提示词").fill("生成一个蓝色玻璃球");
    await page.locator('.start-composer input[type="file"]').setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    await expect.poll(() => agent.turns.length).toBe(1);
    expect(durableAtTurn?.projects).toHaveLength(1);
    expect(durableAtTurn?.activeProjectId).toBe(durableAtTurn?.projects[0].id);
    expect(durableAtTurn?.projects[0].tasks).toHaveLength(0);
    expect(
      durableAtTurn?.projects[0].items[0].generationStatus,
    ).toBeUndefined();
    expect(durableAtTurn?.projects[0].items[0].description).toBe(
      "Codex 内置生图",
    );
    expect(agent.turns[0].prompt).toContain(
      "imagegen/image_generation 生成 1 张图片",
    );
    expect(agent.turns[0].model).not.toBe("image-test");
    expect(agent.turns[0].attachments).toMatchObject([
      { name: "reference.png", dataUrl: "data:image/png;base64," + pixel },
    ]);
    const threadId = agent.conversation().threadId;
    history.push({
      id: "source",
      role: "user",
      threadId,
      turnId: "home-turn",
      ...(agent.turns[0].messageMetadata as object),
    });
    history.push({
      id: "home-image",
      itemId: "home-image",
      role: "tool",
      threadId,
      turnId: "home-turn",
      text: "图片生成完成",
      detail: { kind: "image", status: "completed", savedPath: "fixture.png" },
    });
    agent.emit("agent_event", { type: "turn.completed", status: "completed" });
    await expect(
      page.locator('.demo-result-node[data-source="provider"]'),
    ).toHaveCount(1);
    await expect
      .poll(
        async () =>
          (await snapshot(page)).projects[0].items.find((item) => item.assetId)
            ?.model,
      )
      .toBe("图片模型未报告");
    const saved = await snapshot(page);
    const result = saved.projects[0].items.find((item) => item.assetId);
    expect(result?.model).toBe("图片模型未报告");
    expect(result?.description).toContain("Codex 内置生图");
    expect(apiCalls).toBe(0);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        PROVIDER_CONNECTIONS_STORAGE_KEY,
      ),
    ).toBe(beforeRegistry);
    await page.reload();
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await expect(
      page.locator('.demo-result-node[data-source="provider"]'),
    ).toHaveCount(1);
    expect(
      (await snapshot(page)).projects[0].items.find((item) => item.assetId)
        ?.assetId,
    ).toBe(result?.assetId);
    expect(agent.turns).toHaveLength(1);
  } finally {
    await agent.close();
  }
});

test("聊天选择 Codex 图片后保留意图，普通输入会调用内置生图", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  try {
    await page.addInitScript(
      (endpoint) => localStorage.setItem("canvas-agent-url", endpoint),
      agent.url,
    );
    await openSeededProject(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    const menu = page.getByRole("menu", { name: "选择模型" });
    await menu.getByRole("menuitem", { name: /^Codex/ }).click();
    await menu.getByRole("menuitemradio", { name: /^Codex 内置生图/ }).click();
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText("Codex 内置生图");
    await page.getByLabel("对话内容").fill("一只橙色小猫");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.turns.length).toBe(1);
    expect(agent.turns[0].prompt).toContain(
      "imagegen/image_generation 生成 1 张图片",
    );
    expect(agent.turns[0].messageText).toBe("一只橙色小猫");
    expect(agent.turns[0].model).toBeUndefined();
    expect(JSON.stringify(agent.turns[0].messageMetadata ?? {})).not.toContain(
      "KK 生成来源",
    );
  } finally {
    await agent.close();
  }
});

test("首页连接失败后编辑重试清除旧待发草稿并保留下一条输入", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  let releaseTurn!: () => void;
  const turnGate = new Promise<void>((resolve) => {
    releaseTurn = resolve;
  });
  try {
    await seed(page, agent.url, 4);
    await page.route(agent.url + "/config", (route) =>
      route.fulfill({ status: 503, json: { error: "fixture Agent 暂不可用" } }),
    );
    await page.goto("/");
    await expect(page.getByLabel("创作提示词")).toBeVisible();
    await expect(
      page
        .locator(".creation-storage-notice")
        .filter({ hasText: "正在读取本地项目" }),
    ).toHaveCount(0);
    expect((await snapshot(page)).homeDraft.outputCount).toBe(4);
    await page.getByLabel("创作提示词").fill("失败后仍保留的账号任务");
    await page.locator('.start-composer input[type="file"]').setInputFiles({
      name: "kept.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "fixture Agent 暂不可用" }),
    ).toBeVisible();
    await expect(page.getByLabel("对话内容")).toHaveValue(
      "失败后仍保留的账号任务",
    );
    await expect(
      page.getByRole("button", { name: "移除素材 kept.png", exact: true }),
    ).toBeVisible();
    expect((await snapshot(page)).homeDraft.prompt).toBe(
      "失败后仍保留的账号任务",
    );
    expect(agent.turns).toHaveLength(0);
    const failed = await snapshot(page);
    await page.getByLabel("对话内容").fill("编辑后只发送本轮新提示词");
    await page
      .getByRole("button", { name: "移除素材 kept.png", exact: true })
      .click();
    await page.locator('.chat-composer input[type="file"]').setInputFiles({
      name: "retry.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
    await page.unroute(agent.url + "/config");
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    let enteredTurn = false;
    await page.route(agent.url + "/agent/codex/turn", async (route) => {
      enteredTurn = true;
      await turnGate;
      await route.continue();
    });
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => enteredTurn).toBe(true);
    await page.getByLabel("对话内容").fill("正在发送时输入的下一条保留");
    releaseTurn();
    await expect.poll(() => agent.turns.length).toBe(1);
    expect(agent.turns[0].attachments).toMatchObject([{ name: "retry.png" }]);
    expect(agent.turns[0].attachments).toHaveLength(1);
    expect(agent.turns[0].messageText).toBe(
      "编辑后只发送本轮新提示词\n\n参考图片：retry.png",
    );
    expect(agent.turns[0].prompt).toContain(
      "imagegen/image_generation 生成 4 张图片",
    );
    await expect
      .poll(async () => (await snapshot(page)).projects[0].composerDraft.prompt)
      .toBe("");
    const saved = await snapshot(page);
    expect(saved.projects[0].composerDraft.attachments).toEqual([]);
    expect(saved.projects[0].composerDraft.pendingAgent).toBeUndefined();
    expect(saved.homeDraft).toEqual(failed.homeDraft);
    expect(saved.projects[0].attachments).toEqual(
      failed.projects[0].attachments,
    );
    await expect(page.getByLabel("对话内容")).toHaveValue(
      "正在发送时输入的下一条保留",
    );
    await page.screenshot({
      path: test.info().outputPath("home-retry-next-input.png"),
    });
    await attachHomeRuntime(page);
    await page.reload();
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    expect(agent.turns).toHaveLength(1);
  } finally {
    releaseTurn();
    await agent.close();
  }
});

test("首页失败后手动重试按实际turn来源归档连线且重载不重复", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  const history: unknown[] = [];
  let originals = 0;
  try {
    await seed(page, agent.url);
    await page.route(agent.url + "/config", (route) =>
      route.fulfill({ status: 503, json: { error: "retry source offline" } }),
    );
    await page.route(agent.url + "/agent/codex/threads/*", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            json: {
              ok: true,
              conversation: agent.conversation(),
              messages: history,
            },
          })
        : route.continue(),
    );
    await page.route(agent.url + "/agent/codex/generated-image/**", (route) => {
      originals++;
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(pixel, "base64"),
      });
    });
    await page.goto("/");
    await page.getByLabel("创作提示词").fill("手动恢复的来源图片");
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "retry source offline" }),
    ).toBeVisible();
    const project = (await snapshot(page)).projects[0];
    const rootId = project.items[0].id;
    await page.unroute(agent.url + "/config");
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.turns.length).toBe(1);
    const turn = agent.turns[0];
    expect(turn.messageMetadata).toMatchObject({
      canvasReferences: [
        {
          label: "KK 生成来源",
          nodeId: rootId,
          kind: "image",
          text: project.id,
        },
      ],
    });
    const threadId = agent.conversation().threadId,
      turnId = "retry-source-turn";
    history.push({
      id: String(turn.messageId),
      role: "user",
      threadId,
      turnId,
      ...(turn.messageMetadata as object),
    });
    history.push({
      id: "retry-image",
      itemId: "retry-image",
      role: "tool",
      threadId,
      turnId,
      text: "图片生成完成",
      detail: {
        kind: "image",
        status: "completed",
        savedPath: "retry-source.png",
      },
    });
    agent.emit("conversation_changed", {
      ...agent.conversation(),
      status: "ready",
    });
    agent.emit("codex_state", { busy: false });
    agent.emit("agent_event", { type: "turn.completed", status: "completed" });
    await expect(
      page.locator('.demo-result-node[data-source="provider"]'),
    ).toHaveCount(1);
    await expect
      .poll(
        async () =>
          (await snapshot(page)).projects[0].canvas.edges.filter(
            (edge) => edge.source === rootId && edge.kind === "result",
          ).length,
      )
      .toBe(1);
    const saved = (await snapshot(page)).projects[0];
    const result = saved.items.find((item) => item.assetId)!;
    expect(result.assetId).toBeTruthy();
    expect(saved.canvas.edges.filter((edge) => edge.kind === "result")).toEqual(
      [expect.objectContaining({ source: rootId, target: result.id })],
    );
    expect(originals).toBe(1);
    await page.screenshot({
      path: test.info().outputPath("home-retry-source-result.png"),
    });
    await attachHomeRuntime(page);
    await page.reload();
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    await expect(
      page.locator('.demo-result-node[data-source="provider"]'),
    ).toHaveCount(1);
    const restored = (await snapshot(page)).projects[0];
    expect(restored.items.filter((item) => item.assetId)).toHaveLength(1);
    expect(restored.items.find((item) => item.assetId)?.assetId).toBe(
      result.assetId,
    );
    expect(restored.canvas.edges).toEqual(saved.canvas.edges);
    expect(originals).toBe(1);
    expect(agent.turns).toHaveLength(1);
  } finally {
    await agent.close();
  }
});

test("旧首页 8 张不被静默截断，用户明确改成 1 张后才提交", async ({ page }) => {
  const agent = await startAgentServer("idle");
  try {
    await seed(page, agent.url, 8);
    await page.goto("/");
    await page.getByLabel("创作提示词").fill("保留原数量直到明确修正");
    await expect(
      page.getByRole("button", { name: "开始创建项目", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".start-composer-feedback")).toContainText(
      "8 张",
    );
    expect((await snapshot(page)).homeDraft.outputCount).toBe(8);
    expect(agent.turns).toHaveLength(0);
    await page
      .getByRole("button", { name: "改为生成 1 张", exact: true })
      .click();
    await expect
      .poll(async () => (await snapshot(page)).homeDraft.outputCount)
      .toBe(1);
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    await expect.poll(() => agent.turns.length).toBe(1);
    expect(agent.turns[0].prompt).toContain(
      "imagegen/image_generation 生成 1 张图片",
    );
  } finally {
    await agent.close();
  }
});

test("首页账号生图不把图片意图写入旧项目的普通 Codex 聊天", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  try {
    await seed(page, agent.url, 1, true);
    await page.goto("/");
    await page.getByLabel("创作提示词").fill("新项目账号生图");
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    await expect.poll(() => agent.turns.length).toBe(1);
    agent.emit("conversation_changed", {
      ...agent.conversation(),
      status: "ready",
    });
    agent.emit("agent_event", { type: "turn.completed", status: "completed" });
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "旧 API 独立项目" })
      .click();
    await expect(page.getByLabel("执行方式")).toHaveValue("codex");
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText("Codex 账号默认");
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    await page.getByLabel("对话内容").fill("普通聊天只解释颜色");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.turns.length).toBe(2);
    expect(String(agent.turns[1].prompt).split("用户指令：\n").at(-1)).toBe(
      "普通聊天只解释颜色",
    );
    const old = (await snapshot(page)).projects.find(
      (project) => project.name === "旧 API 独立项目",
    )!;
    expect(old.model).toBe("image-test");
    expect(old.composerDraft.prompt).toBe("API 未发送草稿");
    expect(old.items[0].generationSource).toBeUndefined();
  } finally {
    await agent.close();
  }
});

test("首页非法参考图批次阻止纯文本降级发送，重新选有效图片后可提交", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  try {
    await seed(page, agent.url);
    await page.goto("/");
    await page.getByLabel("创作提示词").fill("必须带上所选参考图");
    const files = page.locator('.start-composer input[type="file"]');
    await files.setInputFiles(
      Array.from({ length: 7 }, (_, index) => ({
        name: `ref-${index}.png`,
        mimeType: "image/png",
        buffer: Buffer.from(pixel, "base64"),
      })),
    );
    await expect(page.locator(".start-composer-feedback")).toContainText(
      "最多添加 6 张",
    );
    await expect(
      page.getByRole("button", { name: "开始创建项目", exact: true }),
    ).toBeDisabled();
    expect(agent.turns).toHaveLength(0);
    await files.setInputFiles({
      name: "valid.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
    await expect(
      page.getByRole("button", { name: "开始创建项目", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    await expect.poll(() => agent.turns.length).toBe(1);
    expect(agent.turns[0].attachments).toMatchObject([{ name: "valid.png" }]);
  } finally {
    await agent.close();
  }
});

test("项目 API 切到 Codex 图片和 Google 后可重开，各通道草稿保持隔离", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  const reopen = async () => {
    await page.reload();
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
  };
  try {
    await seed(page, agent.url);
    await openSeededProject(page);
    await page.getByLabel("执行方式").selectOption("direct");
    await page.getByLabel("对话内容").fill("API 独立输入保留");
    await page.locator('.chat-composer input[type="file"]').setInputFiles({
      name: "api-only.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
    await page.getByRole("button", { name: "模型", exact: true }).click();
    const menu = page.getByRole("menu", { name: "选择模型" });
    await menu.getByRole("searchbox").fill("image-test");
    await menu.getByRole("menuitemradio", { name: /^image-test/ }).click();
    await expect
      .poll(async () => (await snapshot(page)).projects[0].composerDraft)
      .toMatchObject({
        prompt: "API 独立输入保留",
        attachments: [{ name: "api-only.png" }],
        providerConnectionId: provider.id,
        modelSelection: { source: "api", model: "image-test" },
      });
    const before = (await snapshot(page)).projects[0].composerDraft;
    await page.getByLabel("执行方式").selectOption("codex");
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "移除素材 api-only.png", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await menu.getByRole("searchbox").fill("Codex 内置生图");
    await menu.getByRole("menuitemradio", { name: /^Codex 内置生图/ }).click();
    await page.getByLabel("执行方式").selectOption("google");
    await page.getByLabel("对话内容").fill("Google 独立输入保留");
    await page.getByLabel("执行方式").selectOption("codex");
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText("Codex 内置生图");
    await reopen();
    await expect(page.getByLabel("执行方式")).toHaveValue("codex");
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText("Codex 内置生图");
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    await page.getByLabel("执行方式").selectOption("direct");
    await expect(page.getByLabel("对话内容")).toHaveValue("API 独立输入保留");
    await expect(
      page.getByRole("button", { name: "移除素材 api-only.png", exact: true }),
    ).toBeVisible();
    const after = (await snapshot(page)).projects[0].composerDraft;
    expect(after.prompt).toBe(before.prompt);
    expect(after.attachments).toEqual(before.attachments);
    expect(after.providerConnectionId).toBe(before.providerConnectionId);
    await page.getByLabel("执行方式").selectOption("google");
    await reopen();
    await expect(page.getByLabel("执行方式")).toHaveValue("google");
    expect(agent.turns).toHaveLength(0);
  } finally {
    await agent.close();
  }
});
