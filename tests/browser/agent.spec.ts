import { test, expect, type Page } from "@playwright/test";
import { createServer, type ServerResponse } from "node:http";
import { openSeededProject } from "./helpers";
import type { CreationSnapshot } from "../../src/features/creation/model";
const productionOrigin = "http://127.0.0.1:1423";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function readCanvasSnapshot(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
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
}

test("Agent 图变更同步已有/新增节点及 reference 连线并从 IndexedDB 重载", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const agent = await fixture(true);
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await project(page);
    await expect
      .poll(
        async () => (await readCanvasSnapshot(page))?.projects[0]?.items.length,
      )
      .toBe(3);
    const original = (await readCanvasSnapshot(page)).projects[0];
    const oldPath = await page
      .getByTestId("connector-video1")
      .getAttribute("d");
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("对话内容").fill("调整画布位置和引用线");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.received.turns.length).toBe(1);
    agent.emit("tool_call", {
      requestId: "canvas-sync-fixture",
      name: "canvas_apply_ops",
      input: {
        ops: [
          {
            type: "update_node",
            id: "image",
            patch: { position: { x: 160, y: 180 } },
          },
          {
            type: "add_node",
            id: "agent-sync-node",
            nodeType: "image",
            position: { x: 320, y: 500 },
            metadata: { prompt: "新增节点内容" },
          },
          { type: "delete_connections", ids: ["connector-video2"] },
          {
            type: "connect_nodes",
            id: "agent-reference-sync",
            fromNodeId: "image",
            toNodeId: "video2",
          },
        ],
      },
    });
    await expect.poll(() => agent.received.tools.length).toBe(1);
    expect(agent.received.tools[0].result).toMatchObject({
      ok: true,
      applied: 4,
      rejected: [],
    });
    const positions = async () =>
      page
        .locator(
          '[data-testid="canvas-node-image"], [data-testid="canvas-node-agent-sync-node"]',
        )
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            id: node.getAttribute("data-testid"),
            left: (node as HTMLElement).style.left,
            top: (node as HTMLElement).style.top,
          })),
        );
    const expectedPositions = [
      { id: "canvas-node-image", left: "160px", top: "180px" },
      { id: "canvas-node-agent-sync-node", left: "320px", top: "500px" },
    ];
    await expect.soft
      .poll(positions, { timeout: 3000 })
      .toEqual(expectedPositions);
    await expect
      .soft(page.getByTestId("agent-reference-sync"))
      .toBeAttached({ timeout: 3000 });
    await expect
      .soft(page.getByTestId("connector-video2"))
      .toHaveCount(0, { timeout: 3000 });
    await page.screenshot({ path: info.outputPath("agent-canvas-sync.png") });
    await info.attach("canvas-dom", {
      body: JSON.stringify({
        positions: await positions(),
        state: agent.received.state,
      }),
      contentType: "application/json",
    });
    const expectedEdges = [
      original.canvas.edges[0],
      {
        id: "agent-reference-sync",
        source: "image",
        target: "video2",
        kind: "reference",
      },
    ];
    await expect
      .poll(
        async () => (await readCanvasSnapshot(page)).projects[0].canvas.edges,
      )
      .toEqual(expectedEdges);
    await expect(page.getByTestId("connector-video1")).not.toHaveAttribute(
      "d",
      oldPath!,
    );
    expect(
      (await readCanvasSnapshot(page)).projects[0].items.slice(0, 3),
    ).toEqual(original.items);
    await page.evaluate(() => {
      localStorage.removeItem("kk-studio-next:creation:v1");
      sessionStorage.removeItem("kk-studio-next:creation:v1:pending");
      sessionStorage.removeItem("kk-studio-next:creation:v1:pending:recovery");
    });
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
    await expect.poll(positions).toEqual(expectedPositions);
    await expect(page.getByTestId("agent-reference-sync")).toHaveAttribute(
      "d",
      /^M/,
    );
    const restored = (await readCanvasSnapshot(page)).projects[0];
    expect(restored.canvas.positions.image).toEqual({ x: 160, y: 180 });
    expect(restored.canvas.positions["agent-sync-node"]).toEqual({
      x: 320,
      y: 500,
    });
    expect(restored.canvas.edges).toEqual(expectedEdges);
    expect(restored.items.slice(0, 3)).toEqual(original.items);
    expect(restored.items[3].prompt).toBe("新增节点内容");
    expect(agent.received.images).toHaveLength(0);
  } finally {
    await agent.close();
  }
});
test("取消本地拖动保留 Agent 对其他节点的位置和新增节点", async ({ page }) => {
  const agent = await fixture(true);
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await project(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("对话内容").fill("调整其他节点");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.received.turns.length).toBe(1);
    const image = page.getByTestId("canvas-node-image");
    const readPosition = (id: string) =>
      page.getByTestId(`canvas-node-${id}`).evaluate((node) => ({
        x: (node as HTMLElement).style.left,
        y: (node as HTMLElement).style.top,
      }));
    const original = await readPosition("image");
    const preview = (await image.locator(".image-preview").boundingBox())!;
    await page.mouse.move(preview.x + 100, preview.y + 100);
    await page.mouse.down();
    await page.mouse.move(preview.x + 180, preview.y + 140, { steps: 8 });
    await expect.poll(() => readPosition("image")).not.toEqual(original);
    agent.emit("tool_call", {
      requestId: "during-drag",
      name: "canvas_apply_ops",
      input: {
        ops: [
          {
            type: "update_node",
            id: "video1",
            patch: { position: { x: 900, y: 400 } },
          },
          {
            type: "add_node",
            id: "during-drag-node",
            nodeType: "image",
            position: { x: 320, y: 500 },
          },
        ],
      },
    });
    await expect.poll(() => agent.received.tools.length).toBe(1);
    await expect
      .poll(() => readPosition("video1"))
      .toEqual({ x: "900px", y: "400px" });
    await expect
      .poll(() => readPosition("during-drag-node"))
      .toEqual({ x: "320px", y: "500px" });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect.poll(() => readPosition("image")).toEqual(original);
    await expect
      .poll(() => readPosition("video1"))
      .toEqual({ x: "900px", y: "400px" });
    await expect
      .poll(() => readPosition("during-drag-node"))
      .toEqual({ x: "320px", y: "500px" });
  } finally {
    await page.mouse.up();
    await agent.close();
  }
});

test("已保存的拖动预览不被 Agent 同节点更新覆盖，松开后可重载", async ({
  page,
}) => {
  const agent = await fixture(true);
  try {
    await page.addInitScript(
      (url) => localStorage.setItem("canvas-agent-url", url),
      agent.url,
    );
    await project(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(
      page.getByText("Codex 主 Agent · 已连接", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("对话内容").fill("调整同一节点");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => agent.received.turns.length).toBe(1);
    const image = page.getByTestId("canvas-node-image");
    const position = () =>
      image.evaluate((node) => ({
        x: (node as HTMLElement).offsetLeft,
        y: (node as HTMLElement).offsetTop,
      }));
    const original = await position();
    const preview = (await image.locator(".image-preview").boundingBox())!;
    await page.mouse.move(preview.x + 100, preview.y + 100);
    await page.mouse.down();
    await page.mouse.move(preview.x + 180, preview.y + 140, { steps: 8 });
    await expect.poll(position).not.toEqual(original);
    const local = await position();
    await expect
      .poll(
        async () =>
          (await readCanvasSnapshot(page)).projects[0].canvas.positions.image,
      )
      .toEqual(local);
    agent.emit("tool_call", {
      requestId: "same-node-drag",
      name: "canvas_apply_ops",
      input: {
        ops: [
          {
            type: "update_node",
            id: "image",
            patch: { position: { x: 900, y: 400 } },
          },
        ],
      },
    });
    await expect.poll(() => agent.received.tools.length).toBe(1);
    await expect.poll(position).toEqual(local);
    await page.mouse.up();
    await expect
      .poll(
        async () =>
          (await readCanvasSnapshot(page)).projects[0].canvas.positions.image,
      )
      .toEqual(local);
    await page.evaluate(() => {
      localStorage.removeItem("kk-studio-next:creation:v1");
      sessionStorage.removeItem("kk-studio-next:creation:v1:pending");
      sessionStorage.removeItem("kk-studio-next:creation:v1:pending:recovery");
    });
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
    await expect.poll(position).toEqual(local);
  } finally {
    await page.mouse.up();
    await agent.close();
  }
});

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
    res.setHeader("Access-Control-Allow-Origin", productionOrigin);
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
  await openSeededProject(page);
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
      path: "test-results/changes/2026-09-23-agent-attachments/evidence/web-attachments.png",
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

for (const scenario of ["image", "missing-original", "text"] as const) {
  const missingOriginal = scenario === "missing-original";
  const textCard = scenario === "text";
  test(`Codex 卡片参考图：${textCard ? "文本卡片拒绝参考图并保留草稿" : missingOriginal ? "原件缺失保留草稿且不提交" : "发送归档原件并恢复唯一结果连线"}`, async ({
    page,
  }) => {
    const agent = await fixture(true);
    const original = Buffer.concat([
      Buffer.from(png, "base64"),
      Buffer.from("product-reference-original"),
    ]);
    const prompt = "保留参考产品外形，将背景改成浅蓝色";
    let externalRequests = 0;
    await page.route("**/images/{generations,edits}", (route) => {
      externalRequests++;
      return route.abort();
    });
    try {
      await page.addInitScript(
        (url) => localStorage.setItem("canvas-agent-url", url),
        agent.url,
      );
      await project(page);
      const reference = page.getByTestId("canvas-node-image");
      await reference.locator('input[type="file"]').first().setInputFiles({
        name: "product-reference.png",
        mimeType: "image/png",
        buffer: original,
      });
      await expect(reference.locator(".uploaded-image")).toBeVisible();
      await reference.locator(".node-add-follow").press("Enter");
      await page
        .getByRole("menu", { name: "新增下游卡片" })
        .getByRole("menuitem", {
          name: textCard ? "文本" : "图片",
          exact: true,
        })
        .click();
      const generator = page
        .getByTestId(
          textCard ? /^canvas-node-added-text-/ : /^canvas-node-added-image-/,
        )
        .first();
      const generatorId = (await generator.getAttribute(
        "data-testid",
      ))!.replace("canvas-node-", "");
      await page
        .getByRole("button", { name: "连接 Codex", exact: true })
        .click();
      await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
      await generator
        .getByRole("button", { name: "画布模型", exact: true })
        .click();
      const menu = generator.getByRole("menu", { name: "选择模型" });
      await menu
        .getByRole("searchbox")
        .fill(textCard ? "Fixture Codex" : "Codex 内置生图");
      await menu
        .getByRole("menuitemradio", {
          name: textCard ? /^Fixture Codex/ : /^Codex 内置生图/,
        })
        .click();
      const promptField = generator.getByLabel(
        textCard ? "文案提示词" : "图片提示词",
      );
      await promptField.fill(prompt);
      if (!textCard) {
        await generator
          .getByRole("button", { name: "生成数量", exact: true })
          .click();
        await generator
          .getByRole("button", { name: "生成 1 个", exact: true })
          .click();
      }
      await expect
        .poll(
          async () =>
            (await readCanvasSnapshot(page)).projects[0].items.find(
              (item) => item.id === "image",
            )?.assetId,
        )
        .toBeTruthy();
      const before = (await readCanvasSnapshot(page)).projects[0];
      expect(before.canvas.edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: "image", target: generatorId }),
        ]),
      );
      if (missingOriginal) {
        const assetId = before.items.find(
          (item) => item.id === "image",
        )!.assetId!;
        await page.evaluate(
          (id) =>
            new Promise<void>((resolve, reject) => {
              const request = indexedDB.open("kk-studio-assets", 1);
              request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction("blobs", "readwrite");
                transaction.objectStore("blobs").delete(id);
                transaction.oncomplete = () => {
                  db.close();
                  resolve();
                };
                transaction.onerror = () => reject(transaction.error);
              };
              request.onerror = () => reject(request.error);
            }),
          assetId,
        );
      }
      await generator
        .getByRole("button", {
          name: textCard ? "生成文案" : "生成图片",
          exact: true,
        })
        .click();
      if (textCard) {
        await expect(generator.locator("[role=status]")).toContainText(
          "文本卡片暂不接收参考图片",
        );
        await expect(promptField).toHaveValue(prompt);
        expect(agent.received.turns).toHaveLength(0);
      } else if (missingOriginal) {
        await expect(generator.locator("[role=status]")).toContainText(
          /原件缺失/,
        );
        await expect(generator.getByLabel("图片提示词")).toHaveValue(prompt);
        expect(agent.received.turns).toHaveLength(0);
      } else {
        await expect.poll(() => agent.received.turns.length).toBe(1);
        expect(agent.received.turns[0].attachments).toEqual([
          expect.objectContaining({
            name: "product-reference.png",
            dataUrl: "data:image/png;base64," + original.toString("base64"),
          }),
        ]);
        expect(agent.received.turns[0].messageMetadata).toMatchObject({
          canvasReferences: [
            {
              nodeId: generatorId,
              kind: "image",
              label: "KK 生成来源",
              text: before.id,
            },
            {
              nodeId: "image",
              kind: "image",
              label: "参考图片",
              title: "product-reference.png",
            },
          ],
        });
        agent.completeNative();
        const resultId = "codex-thread-fixture-native-image";
        await expect
          .poll(async () => (await readCanvasSnapshot(page)).projects[0].items)
          .toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: resultId,
                assetId: expect.any(String),
                generationStatus: "ready",
              }),
            ]),
          );
        agent.emit("agent_event", {
          type: "turn.completed",
          status: "completed",
        });
        await page.reload();
        await page.getByRole("button", { name: "项目库", exact: true }).click();
        await page.locator(".project-library-card").first().click();
        await page
          .getByRole("button", { name: "连接 Codex", exact: true })
          .click();
        await expect(
          page.locator('.demo-result-node[data-source="provider"]'),
        ).toHaveCount(1);
        const restored = (await readCanvasSnapshot(page)).projects[0];
        expect(
          restored.items.filter((item) => item.id === resultId),
        ).toHaveLength(1);
        expect(
          restored.canvas.edges.filter((edge) => edge.target === resultId),
        ).toEqual([
          expect.objectContaining({ source: generatorId, kind: "result" }),
        ]);
        expect(restored.canvas.edges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ source: "image", target: generatorId }),
          ]),
        );
        expect(agent.received.turns).toHaveLength(1);
      }
      expect(agent.received.images).toHaveLength(0);
      expect(externalRequests).toBe(0);
    } finally {
      await agent.close();
    }
  });
}

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
    await page.getByRole("button", { name: "模型接入", exact: true }).click();
    await page
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
    await page.getByLabel("接口地址").fill(agent.url + "/v1");
    await page.getByLabel("API Key", { exact: true }).fill("fixture-key");
    await page.getByLabel("模型名称").fill("image-fixture");
    await page.getByRole("button", { name: "保存连接", exact: true }).click();
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
    await menu.getByRole("menuitem", { name: /^Codex/ }).click();
    await menu.getByRole("menuitemradio", { name: /图片模型未报告/ }).click();
    await expect(
      source.getByText("图片模型未报告", { exact: true }),
    ).toBeVisible();
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
    await chatMenu.getByRole("searchbox").fill("image-fixture");
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
    await project(page);
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await page
      .getByRole("menu")
      .getByRole("button", { name: "模型接入…", exact: true })
      .click();
    await page
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
    await page.getByLabel("接口地址").fill(agent.url + "/v1");
    await page.getByLabel("API Key", { exact: true }).fill("fixture-key");
    await page.getByLabel("模型名称").fill("image-fixture");
    await page.getByRole("button", { name: "保存连接", exact: true }).click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
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
