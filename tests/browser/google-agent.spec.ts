import { test, expect } from "@playwright/test";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("Google key configuration, dialogue continuity, image archive and restored history", async ({
  page,
}, info) => {
  const requests: Record<string, unknown>[] = [];
  await page.route(
    "https://generativelanguage.googleapis.com/v1beta/**",
    async (route) => {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204 });
      expect(route.request().headers()["x-goog-api-key"]).toBe(
        "fixture-google-key",
      );
      if (route.request().url().includes("/models"))
        return route.fulfill({
          json: {
            models: [
              { name: "models/gemini-3.8-flash" },
              { name: "models/gemini-3.1-flash-image" },
            ],
          },
        });
      const body = route.request().postDataJSON();
      requests.push(body);
      const image = body.model === "gemini-3.1-flash-image";
      await route.fulfill({
        json: {
          id: `interaction-${requests.length}`,
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: image
                ? [{ type: "image", mime_type: "image/png", data: png }]
                : [
                    {
                      type: "text",
                      text: `Google fixture reply ${requests.length}`,
                    },
                  ],
            },
          ],
        },
      });
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByRole("radio", { name: /Gemini CLI 账号/ }).check();
  await page.getByRole("button", { name: "保存登录方式", exact: true }).click();
  await page.getByRole("radio", { name: /密钥登录/ }).check();
  await page
    .getByLabel("Google 密钥", { exact: true })
    .fill("fixture-google-key");
  await expect(page.getByLabel("Google 密钥", { exact: true })).toHaveValue(
    "fixture-google-key",
  );
  await page.getByRole("button", { name: "保存 Google", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("kk-google-login-mode")),
  ).toBeNull();
  await expect(
    page.getByText("Google 已保存，可在对话的执行方式中选择 Google Gemini。", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Gemini CLI 账号/ }).check();
  await page.getByRole("button", { name: "保存登录方式", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("kk-google-login-mode")),
  ).toBe("cli");
  await page.getByRole("radio", { name: /密钥登录/ }).check();
  await expect(page.getByLabel("Google 密钥", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "保存 Google", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "保存 Google", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("kk-google-login-mode")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "测试 Google 连接", exact: true })
    .click();
  await expect(page.getByText(/Google 连接成功/)).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-google-key",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByLabel("执行方式", { exact: true }).selectOption("google");
  await page
    .getByRole("button", { name: "连接 Google Gemini", exact: true })
    .click();
  await expect(
    page.getByText("Google Gemini · 已连接", { exact: true }),
  ).toBeVisible();
  const input = page.getByPlaceholder(
    "和 Google 聊天，或切换到图片模式生成图片",
  );
  await input.fill("Remember SUNFLOWER");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByText("Google fixture reply 1", { exact: true }),
  ).toBeVisible();
  await input.fill("Continue");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByText("Google fixture reply 2", { exact: true }),
  ).toBeVisible();
  expect(requests[1].previous_interaction_id).toBe("interaction-1");
  await page.getByLabel("Google 输出", { exact: true }).selectOption("image");
  await input.fill("Draw a sunflower");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByText("已将 1 张 Google 图片归档到当前画布。", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator(".canvas-node").filter({ hasText: "Google 生成图片" }),
  ).toHaveCount(1);
  expect(requests[2].response_format).toEqual([
    { type: "text" },
    { type: "image", aspect_ratio: "1:1", image_size: "2K" },
  ]);
  await page.screenshot({
    path: info.outputPath("google-image.png"),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(
    page.getByText("Google fixture reply 2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".canvas-node").filter({ hasText: "Google 生成图片" }),
  ).toHaveCount(1);
  await input.fill("Without key");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  expect(requests).toHaveLength(3);
});
