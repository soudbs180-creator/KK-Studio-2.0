import { test, expect } from "@playwright/test";

test("Gemini CLI login mode: configure, connect and chat through the local bridge without API key", async ({
  page,
}) => {
  const chats: Record<string, unknown>[] = [];
  await page.route("http://127.0.0.1:1424/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/status"))
      return route.fulfill({
        json: { installed: true, version: "1.2.3", login: true },
      });
    const body = route.request().postDataJSON();
    chats.push(body);
    await route.fulfill({
      json: {
        text: `CLI fixture reply ${chats.length}`,
        sessionId: `cli-session-${chats.length}`,
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByRole("radio", { name: /Gemini CLI 账号/ }).check();
  await page.getByRole("button", { name: "保存登录方式", exact: true }).click();
  await expect(
    page.getByText("已切换为 Gemini CLI 登录方式", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "检测 Gemini CLI", exact: true })
    .click();
  await expect(page.getByText(/Gemini CLI 已就绪/)).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("kk-google-login-mode")),
  ).toBe("cli");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByLabel("执行方式", { exact: true }).selectOption("google");
  await expect(
    page.getByText("通过本机 Gemini CLI（Google 账号登录）免 API Key 对话。", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "连接 Google Gemini", exact: true })
    .click();
  await expect(
    page.getByText("Google Gemini · 已连接", { exact: true }),
  ).toBeVisible();

  const input = page.getByPlaceholder(
    "和 Google 聊天（Gemini CLI 通道，仅文字）",
  );
  await input.fill("Hello CLI");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByText("CLI fixture reply 1", { exact: true }),
  ).toBeVisible();
  await input.fill("Again");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByText("CLI fixture reply 2", { exact: true }),
  ).toBeVisible();
  expect(chats[0]).toMatchObject({ prompt: "Hello CLI" });
  expect(chats[1]).toMatchObject({
    prompt: "Again",
    resumeSessionId: "cli-session-1",
  });

  const output = page.getByLabel("Google 输出", { exact: true });

  await expect(output.locator('option[value="image"]')).toHaveAttribute(
    "disabled",
    /.*/,
  );
  await expect(
    page.getByText("Gemini CLI 通道仅支持对话；生图请改用 API Key 登录方式。", {
      exact: true,
    }),
  ).toBeVisible();
});
