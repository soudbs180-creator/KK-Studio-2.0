import { expect, test, type Page } from "@playwright/test";
import { waitForConversationPanelSettled } from "./helpers";
import { createServer } from "node:http";

const endpoint = "http://127.0.0.1:19432/v1/chat/completions";
const delta = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
async function setup(
  page: Page,
  configured = true,
  baseUrl = "http://127.0.0.1:19432/v1",
) {
  await page.goto("/");
  if (configured) {
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await page
      .getByRole("menu")
      .getByRole("button", { name: /配置供应商/ })
      .click();
    await page.getByLabel("API Base URL").fill(baseUrl);
    await page.getByLabel("API Key").fill("fixture-text-key");
    await page.getByLabel("默认模型").fill("gpt-text-test");
    await page.getByRole("button", { name: "保存供应商" }).click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  }
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await waitForConversationPanelSettled(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-text-"]')
    .first();
  await source.getByLabel("文案提示词").fill("给这件产品写一句中文介绍");
  return source;
}

test("文本节点只用真实连接，缺配置明确禁用并保留草稿", async ({ page }) => {
  const source = await setup(page, false);
  await expect(source.getByRole("button", { name: "生成文案" })).toBeDisabled();
  await expect(source).toContainText("请先在设置中配置文本模型连接");
  await expect(
    page.locator('.demo-result-node[data-source="demo"][data-kind="text"]'),
  ).toHaveCount(0);
});

test("文本请求经真实产品链生成中文、保存并在刷新后恢复", async ({ page }) => {
  let requests = 0;
  await page.route(endpoint, async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      model: "gpt-text-test",
      messages: [{ role: "user", content: "给这件产品写一句中文介绍" }],
      stream: true,
    });
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer fixture-text-key",
    );
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    await route.fulfill({
      contentType: "text/event-stream",
      body:
        delta("你好，") +
        delta("这是实际协议返回的文案。") +
        "data: [DONE]\n\n",
    });
  });
  const source = await setup(page);
  await source.getByRole("button", { name: "生成文案" }).click();
  const result = page.locator(
    '.demo-result-node[data-source="provider"][data-kind="text"]',
  );
  await expect(result).toContainText("你好，这是实际协议返回的文案。");
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  expect(requests).toBe(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "画布缩放" }).click();
  await page.getByRole("menuitem", { name: "适应视图" }).click();
  await expect(result).toBeInViewport();
  await result.screenshot({
    path: "docs/changes/2026-09-21-text-and-rule-audit/text-result.png",
  });
  await page.screenshot({
    path: "docs/changes/2026-09-21-text-and-rule-audit/text-preview.png",
  });
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(result).toContainText("你好，这是实际协议返回的文案。");
  expect(requests).toBe(1);
});

test("长文案可编辑保存并刷新恢复，不覆盖提示词或截断正文", async ({ page }) => {
  const original = "完整文案".repeat(1200);
  const edited = `${original}用户修改`;
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: delta(original) + "data: [DONE]\n\n",
    }),
  );
  const source = await setup(page);
  await expect(source.getByLabel("文案提示词")).toHaveAttribute(
    "maxlength",
    "4000",
  );
  await source.getByRole("button", { name: "生成文案" }).click();
  const result = page.locator(
    '.demo-result-node[data-source="provider"][data-kind="text"]',
  );
  await expect(result).toContainText(original);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "画布缩放" }).click();
  await page.getByRole("menuitem", { name: "适应视图" }).click();
  await result.getByRole("button", { name: /预览文案结果/ }).click();
  await page.getByLabel("编辑文案").fill(edited);
  await page.getByRole("button", { name: "保存文案到卡片" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "文案已更新" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(result).toContainText(edited);
});

test("文本排队期间删除来源节点，异步检查完成后也不得发送", async ({ page }) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.abort();
  });
  const source = await setup(page);
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    Object.assign(window, { releaseTextHash: release, textHashStarted: false });
    crypto.subtle.digest = async (...args) => {
      Object.assign(window, { textHashStarted: true });
      await held;
      return original(...args);
    };
  });
  await source.getByRole("button", { name: "生成文案" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { textHashStarted: boolean }).textHashStarted,
      ),
    )
    .toBe(true);
  await source.locator("h3").click();
  await page.keyboard.press("Delete");
  await expect(source).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { releaseTextHash: () => void }).releaseTextHash(),
  );
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  expect(requests).toBe(0);
});

for (const [label, body] of [
  ["断流", delta("不完整片段")],
  ["空响应", "data: [DONE]\n\n"],
]) {
  test(`文本${label}不得伪装成功或自动重复请求`, async ({ page }) => {
    let requests = 0;
    await page.route(endpoint, async (route) => {
      requests++;
      await route.fulfill({ contentType: "text/event-stream", body });
    });
    const source = await setup(page);
    await source.getByRole("button", { name: "生成文案" }).click();
    await expect(source).toContainText("受理状态不明");
    await expect(
      page.locator(
        '.demo-result-node[data-source="provider"][data-kind="text"]',
      ),
    ).toHaveCount(0);
    expect(requests).toBe(1);
  });
}

test("文本 HTTP 拒绝可以修正后重试，失败正文不会泄漏", async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 400, body: "private-provider-error" }),
  );
  const source = await setup(page);
  await source.getByRole("button", { name: "生成文案" }).click();
  await expect(source).toContainText("HTTP 400");
  await expect(page.locator("body")).not.toContainText(
    "private-provider-error",
  );
  await expect(
    page.locator('.demo-result-node[data-source="provider"][data-kind="text"]'),
  ).toHaveCount(0);
});

test("文本离线时保留输入且不发送请求", async ({ page, context }) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.abort();
  });
  const source = await setup(page);
  await context.setOffline(true);
  await source.getByRole("button", { name: "生成文案" }).click();
  await expect(source).toContainText("当前离线");
  await expect(source.getByLabel("文案提示词")).toHaveValue(
    "给这件产品写一句中文介绍",
  );
  expect(requests).toBe(0);
});

test("文本受理后取消保持 unknown，迟到内容不发布成功结果", async ({ page }) => {
  let started = false;
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    started = true;
    await hold;
    await route
      .fulfill({
        contentType: "text/event-stream",
        body: delta("迟到文本") + "data: [DONE]\n\n",
      })
      .catch(() => undefined);
  });
  const source = await setup(page);
  await source.getByRole("button", { name: "生成文案" }).click();
  await expect.poll(() => started).toBe(true);
  await source.getByRole("button", { name: "取消文案生成" }).click();
  release();
  await expect(source).toContainText("受理状态不明");
  await expect(source.getByRole("button", { name: "生成文案" })).toBeDisabled();
  await expect(
    page.locator('.demo-result-node[data-source="provider"][data-kind="text"]'),
  ).toHaveCount(0);
});

test("本机真实 HTTP SSE 在完成前显示流式草稿，完整结束后才保存结果", async ({
  page,
}) => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,content-type,idempotency-key",
    );
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write(delta("第一段中文正在流式生成"));
    await pending;
    response.end(delta("，完整结束。") + "data: [DONE]\n\n");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("fixture server missing port");
    const source = await setup(
      page,
      true,
      `http://127.0.0.1:${address.port}/v1`,
    );
    await source.getByRole("button", { name: "生成文案" }).click();
    await expect(source.locator(".prompt-creation-placeholder")).toContainText(
      "第一段中文正在流式生成",
    );
    await expect(
      page.locator(
        '.demo-result-node[data-source="provider"][data-kind="text"]',
      ),
    ).toHaveCount(0);
    await expect(
      source.getByRole("button", { name: "取消文案生成" }),
    ).toBeEnabled();
    finish();
    await expect(
      page.locator(
        '.demo-result-node[data-source="provider"][data-kind="text"]',
      ),
    ).toContainText("第一段中文正在流式生成，完整结束。");
  } finally {
    finish();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
