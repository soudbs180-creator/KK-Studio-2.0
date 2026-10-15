import { expect, test, type Page } from "@playwright/test";
import { openSeededProject } from "./helpers";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/features/creation/providerRegistry";
import { CREATION_STORAGE_KEY } from "../../src/features/creation/model";

async function openConversation(page: Page, declaredOnly = false) {
  await page.addInitScript(
    ({ key, declaredOnly }) => {
      localStorage.setItem(
        key,
        JSON.stringify([
          {
            id: "local-chat",
            provider: "fixture",
            kind: "user_byok",
            displayName: "本机测试",
            baseUrl: "http://127.0.0.1:11434/v1",
            credentialRef: "local-fixture",
            protocol: "openai-compatible",
            authMode: "none",
            model: "chat-a",
            state: "active",
            capabilities: {
              modalities: [declaredOnly ? "image" : "text"],
              operations: ["chat", "generate"],
              async: false,
            },
            concurrencyLimit: 3,
          },
        ]),
      );
      localStorage.setItem(
        "kk-studio:model-catalog:v1",
        JSON.stringify([
          {
            id: "local-chat",
            baseUrl: "http://127.0.0.1:11434/v1",
            credentialRef: "local-fixture",
            fetchedAt: 1,
            protocol: "openai-compatible",
            authMode: "none",
            models: [
              { id: "chat-a", kind: "text", source: "manual" },
              { id: "chat-b", kind: "text", source: "manual" },
            ],
          },
        ]),
      );
    },
    { key: PROVIDER_CONNECTIONS_STORAGE_KEY, declaredOnly },
  );
  await openSeededProject(page);
  await page.getByLabel("执行方式").selectOption("models");
  await page
    .getByLabel("对话模型 1", { exact: true })
    .selectOption(JSON.stringify(["local-chat", "chat-a"]));
  await page
    .getByLabel("对话模型 2", { exact: true })
    .selectOption(JSON.stringify(["local-chat", "chat-b"]));
}
const sse = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
for (const status of [401, 429])
  for (const change of ["protocol", "auth", "revision"] as const)
    test(`late ${status} leaves the saved ${change} connection healthy`, async ({
      page,
    }) => {
      let requests = 0;
      let release!: () => void;
      const pending = new Promise<void>((resolve) => (release = resolve));
      await page.route(
        "http://127.0.0.1:11434/v1/chat/completions",
        async (route) => {
          requests++;
          await pending;
          await route.fulfill({ status, body: "fixture rejection" });
        },
      );
      await openConversation(page);
      await page.getByLabel("多模型对话输入").fill("冻结旧请求身份");
      await page.getByRole("button", { name: "同时发送", exact: true }).click();
      await expect.poll(() => requests).toBe(2);
      const savedRevision = await page.evaluate(
        ({ key, change }) => {
          const connections = JSON.parse(localStorage.getItem(key)!);
          const connection = connections[0];
          connection.healthRevision = (connection.healthRevision ?? 0) + 1;
          if (change === "protocol") connection.protocol = "ollama";
          if (change === "auth") connection.authMode = "api_key";
          localStorage.setItem(key, JSON.stringify(connections));
          window.dispatchEvent(new Event("kk:model-provider-changed"));
          return connection.healthRevision;
        },
        { key: PROVIDER_CONNECTIONS_STORAGE_KEY, change },
      );
      release();
      await expect(
        page.locator(".provider-conversation-replies").getByText("失败", {
          exact: true,
        }),
      ).toHaveCount(2);
      await expect
        .poll(async () =>
          page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)!)[0].activeJobs,
            PROVIDER_CONNECTIONS_STORAGE_KEY,
          ),
        )
        .toBe(0);
      const connection = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!)[0],
        PROVIDER_CONNECTIONS_STORAGE_KEY,
      );
      expect(connection.state).toBe("active");
      expect(connection.cooldownUntil).toBeUndefined();
      expect(connection.healthRevision).toBe(savedRevision);
      if (change === "protocol") expect(connection.protocol).toBe("ollama");
      expect(requests).toBe(2);
    });
test("explicit text declarations remain selectable on a connection with an older image default", async ({
  page,
}) => {
  await openConversation(page, true);
  await expect(page.getByLabel("对话模型 1", { exact: true })).toHaveValue(
    JSON.stringify(["local-chat", "chat-a"]),
  );
  await expect(page.getByLabel("对话模型 2", { exact: true })).toHaveValue(
    JSON.stringify(["local-chat", "chat-b"]),
  );
});
test("two model replies use frozen routes, independent multi-turn history and existing durable tasks", async ({
  page,
}) => {
  const bodies: Array<{
    model: string;
    messages: Array<{ role: string; content: string }>;
  }> = [];
  await page.route(
    "http://127.0.0.1:11434/v1/chat/completions",
    async (route) => {
      expect(route.request().headers().authorization).toBeUndefined();
      const body = route.request().postDataJSON();
      bodies.push(body);
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse(`${body.model} 回复 ${bodies.length}`),
      });
    },
  );
  await openConversation(page);
  await page
    .getByLabel("对话助手", { exact: true })
    .selectOption("assistant-code-reviewer");
  await page.getByLabel("多模型对话输入").fill("检查这段代码");
  await page.getByRole("button", { name: "同时发送", exact: true }).click();
  await expect(
    page
      .locator(".provider-conversation-replies")
      .getByText("已完成", { exact: true }),
  ).toHaveCount(2);
  expect(bodies).toHaveLength(2);
  expect(bodies.every((body) => body.messages[0].role === "system")).toBe(true);
  expect(bodies.map((body) => body.messages.at(-1)?.content)).toEqual([
    "检查这段代码",
    "检查这段代码",
  ]);
  await page.getByLabel("多模型对话输入").fill("继续说明修复理由");
  await page.getByRole("button", { name: "同时发送", exact: true }).click();
  await expect(
    page
      .locator(".provider-conversation-replies")
      .getByText("已完成", { exact: true }),
  ).toHaveCount(4);
  for (const body of bodies.slice(2)) {
    const replies = body.messages.filter(
      (message) => message.role === "assistant",
    );
    expect(replies).toHaveLength(1);
    expect(replies[0].content).toContain(body.model);
    expect(replies[0].content).not.toContain(
      body.model === "chat-a" ? "chat-b" : "chat-a",
    );
  }
  const tasks = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).projects[0].tasks,
    CREATION_STORAGE_KEY,
  );
  expect(tasks).toHaveLength(4);
  expect(
    new Set(
      tasks.map((task: { idempotencyKey: string }) => task.idempotencyKey),
    ).size,
  ).toBe(4);
  await page.screenshot({ path: ".tmp/cherry-red/provider-conversation.png" });
});
test("one explicit rejection preserves the other reply and does not retry", async ({
  page,
}) => {
  let calls = 0;
  await page.route(
    "http://127.0.0.1:11434/v1/chat/completions",
    async (route) => {
      calls++;
      const body = route.request().postDataJSON();
      await route.fulfill(
        body.model === "chat-b"
          ? { status: 401, body: "fixture rejection" }
          : {
              status: 200,
              contentType: "text/event-stream",
              body: sse("成功结果保留"),
            },
      );
    },
  );
  await openConversation(page);
  await page.getByLabel("多模型对话输入").fill("比较方案");
  await page.getByRole("button", { name: "同时发送", exact: true }).click();
  await expect(
    page
      .locator(".provider-conversation-replies")
      .getByText("已完成", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".provider-conversation-replies")
      .getByText("失败", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".provider-conversation-replies")
      .getByText("成功结果保留", { exact: true }),
  ).toBeVisible();
  expect(calls).toBe(2);
  await expect(
    page.getByRole("button", { name: "同时发送", exact: true }),
  ).toBeDisabled();
});
