import { test, expect, type Page } from "@playwright/test";
import { createServer, type ServerResponse } from "node:http";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
async function fixture(nativeImage = false) {
  let stream: ServerResponse | undefined;
  const conversation = {
    revision: 1,
    conversationId: "conv-fixture",
    threadId: "",
    status: "idle",
    mcpStatuses: {},
  };
  const received: {
    turns: Record<string, unknown>[];
    tools: Record<string, unknown>[];
    images: Record<string, unknown>[];
    state: Record<string, unknown>;
  } = { turns: [], tools: [], images: [], state: {} };
  const messages: unknown[] = [];
  const emit = (type: string, data: unknown) =>
    stream?.write(`event: ${type}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`);
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:1423");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "content-type,x-canvas-agent-token,authorization,idempotency-key",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const path = new URL(req.url!, "http://localhost").pathname;
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (path.startsWith("/agent/codex/generated-image/")) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(Buffer.from(png, "base64"));
      return;
    }
    if (path === "/events") {
      stream = res;
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      emit("hello", { codex: { busy: false }, conversation });
      return;
    }
    res.setHeader("Content-Type", "application/json");
    let payload: unknown = { ok: true };
    if (path === "/config") payload = { ok: true, protocolVersion: 6 };
    if (path === "/canvas/state") received.state = body;
    if (path.endsWith("/models"))
      payload = {
        ok: true,
        data: [
          {
            id: "gpt-fixture",
            model: "gpt-fixture",
            displayName: "Fixture Codex",
          },
        ],
      };
    if (path.endsWith("/usage"))
      payload = {
        rateLimitsByLimitId: {
          codex: {
            primary: {
              usedPercent: 35,
              windowDurationMins: 300,
              resetsAt: 2000000000,
            },
          },
        },
      };
    if (path.endsWith("/conversation/prepare")) {
      conversation.threadId = "thread-fixture";
      conversation.status = "ready";
      payload = { ok: true, conversation };
    }
    if (path.includes("/threads/"))
      payload = { ok: true, conversation, messages };
    if (path.endsWith("/turn")) {
      received.turns.push(body);
      payload = { ok: true, state: conversation };
      if (nativeImage) {
        messages.push({
          id: "user",
          role: "user",
          text: body.messageText,
          threadId: conversation.threadId,
          turnId: "native-turn",
          ...(body.messageMetadata as object),
        });
        res.end(JSON.stringify(payload));
        return;
      }
      setTimeout(() => {
        const text = "fixture 流式回复";
        messages.push({ id: "reply", role: "assistant", text });
        emit("agent_event", {
          type: "item.updated",
          item: { id: "reply", type: "agent_message", delta: "fixture " },
        });
        emit("agent_event", {
          type: "item.completed",
          item: { id: "reply", type: "agent_message", text },
        });
        const tool = {
          requestId: "once",
          name: "canvas_apply_ops",
          input: {
            ops: [
              {
                type: "add_node",
                id: "agent-img",
                nodeType: "image",
                metadata: {
                  prompt: "优化后的蓝色产品图",
                  model: "image-fixture",
                },
              },
              { type: "run_generation", nodeId: "agent-img" },
            ],
          },
        };
        emit("tool_call", tool);
        emit("tool_call", tool);
      }, 10);
    }
    if (path === "/canvas/result") {
      received.tools.push(body);
      emit("agent_event", { type: "turn.completed", status: "completed" });
    }
    if (path === "/v1/images/generations") {
      received.images.push(body);
      payload = { data: [{ b64_json: png }] };
    }
    res.end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("fixture port missing");
  return {
    url: `http://127.0.0.1:${address.port}`,
    received,
    emit,
    completeNative: () => {
      messages.push({
        id: "native-image",
        itemId: "native-image",
        role: "tool",
        text: "内置图片",
        threadId: conversation.threadId,
        turnId: "native-turn",
        detail: {
          kind: "image",
          status: "completed",
          savedPath: "fixture/output.png",
        },
      });
      emit("agent_event", { type: "turn.completed", status: "completed" });
    },
    close: async () => {
      stream?.end();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
async function project(page: Page) {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("region", { name: "无限画布" }).waitFor();
}

test("Agent 图片上传发送、离线保留、API 草稿隔离与真实视口多选", async ({
  page,
}) => {
  const agent = await fixture(true);
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await page.goto("/");
    await project(page);
    const composer = page.locator(".chat-composer");
    await expect(
      page.getByRole("button", { name: "添加对话素材" }),
    ).toBeEnabled();
    await composer.locator('input[type="file"]').setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await expect(
      page.getByRole("button", { name: "移除素材 reference.png" }),
    ).toBeVisible();
    await page.getByLabel("执行方式").selectOption("direct");
    await expect(
      page.getByRole("button", { name: "移除素材 reference.png" }),
    ).toHaveCount(0);
    await page.getByLabel("对话内容").fill("API 草稿");
    await page.getByLabel("执行方式").selectOption("codex");
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    await page.getByLabel("对话内容").fill("请描述附图");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("连接");
    await expect(
      page.getByRole("button", { name: "移除素材 reference.png" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.received.turns.length).toBe(1);
    expect(agent.received.turns[0].attachments).toEqual([
      expect.objectContaining({
        name: "reference.png",
        type: "image/png",
        width: 1,
        height: 1,
        dataUrl: "data:image/png;base64," + png,
      }),
    ]);
    await expect(page.getByLabel("对话内容")).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "移除素材 reference.png" }),
    ).toHaveCount(0);
    agent.emit("tool_call", {
      requestId: "select-fixture",
      name: "canvas_apply_ops",
      input: {
        ops: [
          { type: "select_nodes", ids: ["image", "video1"] },
          { type: "set_viewport", viewport: { x: 120, y: 90, k: 0.6 } },
        ],
      },
    });
    await expect.poll(() => agent.received.tools.length).toBe(1);
    await expect(page.getByTestId("canvas-node-image")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect(page.getByTestId("canvas-node-video1")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect
      .poll(() => agent.received.state.viewport)
      .toEqual({ x: 120, y: 90, k: 0.6 });
    const actual = await page
      .getByRole("region", { name: "无限画布" })
      .evaluate((el) => ({
        x: el.style.getPropertyValue("--canvas-pan-x"),
        y: el.style.getPropertyValue("--canvas-pan-y"),
      }));
    expect(actual).toEqual({ x: "120px", y: "90px" });
    await page.screenshot({
      path: "docs/changes/2026-09-23-agent-attachments/evidence/web-attachments.png",
    });
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await expect
      .poll(async () =>
        page
          .getByRole("region", { name: "无限画布" })
          .evaluate((el) => el.style.getPropertyValue("--canvas-pan-x")),
      )
      .toBe("120px");
  } finally {
    await agent.close();
  }
});
test("默认 Codex 断开时保留草稿，不误发生成 API", async ({ page }) => {
  await page.goto("/");
  await project(page);
  await page.getByLabel("对话内容").fill("优化提示词");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByLabel("对话内容")).toHaveValue("优化提示词");
  await expect(page.getByRole("alert")).toContainText(/连接/);
});

test("Agent 图片批次失败阻止发送，重新选择可恢复；切走再返回丢弃迟到画布读取", async ({
  page,
}) => {
  await page.goto("/");
  await project(page);
  await page.getByLabel("对话内容").fill("分析参考图片");
  const file = {
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
  const input = page.locator('.chat-composer input[type="file"]');
  await input.setInputFiles(
    Array.from({ length: 7 }, (_, index) => ({
      ...file,
      name: `ref-${index}.png`,
    })),
  );
  await expect(page.getByRole("alert")).toContainText("本批图片未添加");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "发送消息", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "添加对话素材", exact: true }),
  ).toBeEnabled();
  await input.setInputFiles([
    file,
    { name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") },
  ]);
  await expect(page.getByRole("alert")).toContainText("格式或大小无效");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(0);
  await page.evaluate(() => {
    const original = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob) {
      if (blob instanceof File && blob.name === "read-fail.png") {
        FileReader.prototype.readAsDataURL = original;
        this.dispatchEvent(new ProgressEvent("error"));
        this.dispatchEvent(new ProgressEvent("loadend"));
        return;
      }
      original.call(this, blob);
    };
  });
  await input.setInputFiles([file, { ...file, name: "read-fail.png" }]);
  await expect(page.getByRole("alert")).toContainText("本批图片未添加");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "发送消息", exact: true }),
  ).toBeDisabled();
  await input.setInputFiles(file);
  await expect(
    page.getByRole("button", { name: "移除素材 reference.png" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "发送消息", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "移除素材 reference.png" }).click();
  const source = page.getByTestId("canvas-node-image");
  await source.click();
  await source.locator('input[type="file"]').first().setInputFiles(file);
  await expect(source.locator(".uploaded-image")).toBeVisible();
  // Delay only the next original read; use actual IndexedDB bytes and the real component.
  await page.evaluate(() => {
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (query) {
      const request = get.call(this, query);
      if (this.name !== "blobs" || this.transaction.mode !== "readonly")
        return request;
      IDBObjectStore.prototype.get = get;
      Object.defineProperty(request, "onsuccess", {
        set(handler) {
          request.addEventListener("success", (event) => {
            (
              window as unknown as { releaseAgentRead: () => void }
            ).releaseAgentRead = () => handler.call(request, event);
          });
        },
      });
      return request;
    };
  });
  await page.getByLabel("引用画布图片").selectOption("image");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as unknown as { releaseAgentRead?: unknown })
            .releaseAgentRead,
      ),
    )
    .toBe("function");
  await page.getByLabel("执行方式").selectOption("direct");
  await page.getByLabel("执行方式").selectOption("codex");
  await page.evaluate(() =>
    (window as unknown as { releaseAgentRead: () => void }).releaseAgentRead(),
  );
  // Wait for the real read/digest continuation to settle via the next successful read.
  await page.getByLabel("引用画布图片").selectOption("image");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(1);
  await expect(page.getByLabel("对话内容")).toHaveValue("分析参考图片");
  await page.getByRole("button", { name: /移除素材 reference/ }).click();
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(0);
  await input.setInputFiles(
    Array.from({ length: 6 }, (_, index) => ({
      ...file,
      name: `valid-${index}.png`,
      buffer: Buffer.concat([file.buffer, Buffer.from([index])]),
    })),
  );
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(6);
  await page.getByLabel("引用画布图片").selectOption("image");
  await expect(page.getByRole("alert")).toContainText("本次画布图片未添加");
  await expect(
    page.getByRole("button", { name: "发送消息", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "忽略未添加的图片" }).click();
  await expect(
    page.getByRole("button", { name: "发送消息", exact: true }),
  ).toBeEnabled();
});

test("Agent 画布引用接受恰好 8 MiB 的合法原件", async ({ page }) => {
  await page.goto("/");
  await project(page);
  const image = Buffer.from(png, "base64");
  const source = page.getByTestId("canvas-node-image");
  await source.click();
  await source
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "boundary.png",
      mimeType: "image/png",
      buffer: Buffer.concat([
        image,
        Buffer.alloc(8 * 1024 * 1024 - image.length),
      ]),
    });
  await expect(source.locator(".uploaded-image")).toBeVisible();
  await page.getByLabel("引用画布图片").selectOption("image");
  await expect(
    page.getByRole("button", { name: "移除素材 boundary.png" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("画布引用发送真实原件；原件丢失和损坏图片均保留草稿且不发纯文本", async ({
  page,
}) => {
  const agent = await fixture(true);
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await page.goto("/");
    await project(page);
    const source = page.getByTestId("canvas-node-image");
    await source.click();
    await source
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "canvas.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
    await expect(source.locator(".uploaded-image")).toBeVisible();
    await page.getByLabel("引用画布图片").selectOption("image");
    await expect(
      page.locator(".chat-composer .start-attachment-chip"),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("对话内容").fill("读取画布原件");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.received.turns.length).toBe(1);
    expect(agent.received.turns[0].attachments).toEqual([
      expect.objectContaining({ dataUrl: "data:image/png;base64," + png }),
    ]);
    expect(agent.received.turns[0].messageMetadata).toMatchObject({
      canvasReferences: [{ nodeId: "image", kind: "image" }],
    });
    agent.emit("agent_event", { type: "turn.completed", status: "completed" });
    await expect(page.getByLabel("引用画布图片")).toBeEnabled();
    await page.getByLabel("引用画布图片").selectOption("image");
    await expect(
      page.locator(".chat-composer .start-attachment-chip"),
    ).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("kk-studio-assets", 1);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("blobs", "readwrite");
            transaction.objectStore("blobs").clear();
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
            transaction.onerror = () => reject(transaction.error);
          };
        }),
    );
    await page.getByLabel("对话内容").fill("保留失败草稿");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("原件缺失");
    await expect(
      page.locator(".chat-composer .start-attachment-chip"),
    ).toHaveCount(1);
    expect(agent.received.turns.length).toBe(1);
    await page.locator(".chat-composer .start-attachment-row button").click();
    await page.locator('.chat-composer input[type="file"]').setInputFiles({
      name: "corrupt.png",
      mimeType: "image/png",
      buffer: Buffer.from("not-an-image"),
    });
    await expect(
      page.getByRole("button", { name: "移除素材 corrupt.png" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("无法解码");
    await expect(page.getByLabel("对话内容")).toHaveValue("保留失败草稿");
    expect(agent.received.turns.length).toBe(1);
  } finally {
    await agent.close();
  }
});

test("卡片 Codex 生图在刷新后归档并恢复来源；切 API 清除旧路由", async ({
  page,
}) => {
  const agent = await fixture(true);
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await page.getByRole("button", { name: "模型供应商", exact: true }).click();
    await page.getByLabel("API Base URL").fill(agent.url + "/v1");
    await page.getByLabel("API Key").fill("fixture-key");
    await page.getByLabel("默认模型").fill("image-fixture");
    await page.getByRole("button", { name: "保存供应商", exact: true }).click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await project(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    const source = page.getByTestId("canvas-node-image");
    await source.focus();
    await source.press("Enter");
    await source.getByRole("button", { name: "画布模型", exact: true }).click();
    const menu = source.getByRole("menu", { name: "选择模型" });
    await menu.getByRole("menuitem", { name: "Codex ›", exact: false }).click();
    await menu.getByRole("menuitemradio", { name: /Fixture Codex/ }).click();
    await page.getByLabel("图片提示词").fill("用内置工具生成蓝色球");
    await source.getByRole("button", { name: "生成图片", exact: true }).click();
    await expect.poll(() => agent.received.turns.length).toBe(1);
    expect(agent.received.turns[0].messageMetadata).toMatchObject({
      canvasReferences: [{ nodeId: "image", kind: "image" }],
    });
    await page.reload();
    agent.completeNative();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.locator('.demo-result-node[data-source="provider"]'),
    ).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const projects = JSON.parse(
            localStorage.getItem("kk-studio-next:creation:v1") || "{}",
          ).projects;
          return projects?.[0]?.canvas.edges.some(
            (edge: { source: string; target: string }) =>
              edge.source === "image" &&
              edge.target === "codex-thread-fixture-native-image",
          );
        }),
      )
      .toBe(true);
    expect(agent.received.images).toHaveLength(0);
    await page.getByRole("button", { name: "模型", exact: true }).click();
    const chatMenu = page.getByRole("menu", { name: "选择模型" });
    await chatMenu.getByRole("button", { name: "切换全部模型" }).click();
    await chatMenu
      .getByRole("menuitemradio", { name: /image-fixture/ })
      .click();
    await expect(page.getByLabel("执行方式")).toHaveValue("direct");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const node = JSON.parse(
            localStorage.getItem("kk-studio-next:creation:v1") || "{}",
          ).projects?.[0]?.items.find(
            (item: { id: string }) => item.id === "image",
          );
          return { model: node?.model, source: node?.generationSource ?? null };
        }),
      )
      .toEqual({ model: "image-fixture", source: null });
  } finally {
    await agent.close();
  }
});
test("KK 输入框 → 命名 SSE → MCP → 已配置图片 API，重复工具只提交一次", async ({
  page,
}) => {
  const agent = await fixture();
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await page.goto("/");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await page
      .getByRole("menu")
      .getByRole("button", { name: /配置供应商/ })
      .click();
    await page.getByLabel("API Base URL").fill(agent.url + "/v1");
    await page.getByLabel("API Key").fill("fixture-key");
    await page.getByLabel("默认模型").fill("image-fixture");
    await page.getByRole("button", { name: "保存供应商" }).click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await project(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("对话内容").fill("优化后生成一张图片");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(
      page.locator('.demo-result-node[data-source="provider"]'),
    ).toHaveCount(1);
    await expect(page.locator(".chat-agent-item.is-assistant")).toHaveText(
      "fixture 流式回复",
    );
    await expect.poll(() => agent.received.tools.length).toBe(1);
    expect(agent.received.images).toHaveLength(1);
    expect(agent.received.images[0].prompt).toContain("优化后的蓝色产品图");
    expect(JSON.stringify(agent.received.tools)).toContain("taskId");
    expect(JSON.stringify(agent.received.state)).not.toContain("fixture-key");
    await page.locator(".chat-agent-usage summary").click();
    await expect(page.locator(".chat-agent-usage")).toContainText("65%");
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-item.is-assistant")).toContainText(
      "fixture 流式回复",
    );
    expect(agent.received.images).toHaveLength(1);
  } finally {
    await agent.close();
  }
});
