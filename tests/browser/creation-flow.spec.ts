import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase("kk-studio-next");
        request.onsuccess =
          request.onerror =
          request.onblocked =
            () => resolve();
      }),
  );
  await page.reload();
});

test("未配置连接时保留首页草稿并打开供应商设置", async ({ page }) => {
  const prompt = "一只在雨夜霓虹中奔跑的白兔";
  await page.getByLabel("创作提示词").fill(prompt);
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await expect(page.getByLabel("API Key")).toBeVisible();
  await expect(page.getByLabel("创作提示词")).toHaveValue(prompt);
});

test("首页权限模式询问可取消确认且输入仍保留", async ({ page }) => {
  const prompt = "需要用户确认才创建的项目";
  await page.getByLabel("创作提示词").fill(prompt);
  await page.getByRole("button", { name: /当前模式：自动/ }).click();
  await page
    .locator(".start-mode-popover")
    .getByRole("menuitemradio", { name: "询问" })
    .click();
  await expect(
    page.getByRole("button", { name: /当前模式：询问/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await expect(page.getByRole("group", { name: "确认创建项目" })).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByLabel("创作提示词")).toHaveValue(prompt);
});

test("输入栏 Skill 和插件先显示局部空态，再进入各自管理入口", async ({
  page,
}) => {
  await page
    .getByRole("region", { name: "开始创作" })
    .getByRole("button", { name: "Skill", exact: true })
    .click();
  await expect(page.getByRole("menu", { name: "选择 Skill" })).toContainText(
    "没有可用",
  );
  await page.getByRole("menuitem", { name: "浏览 Skill 目录" }).click();
  await expect(
    page.getByRole("heading", { name: "Skill", exact: true }),
  ).toBeVisible();
});

test("工作台消息属于当前项目，刷新后项目库可重新打开", async ({ page }) => {
  await page.route(
    "https://models.example.test/v1/images/generations",
    async (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              b64_json:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            },
          ],
        }),
      }),
  );
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("test-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByLabel("创作提示词").fill("项目隔离检查");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".workspace-content:not([hidden])")).toBeVisible();
  // This exercises sequential edits and persistence. The workspace opens before
  // the first provider result is archived; a second task is rejected while busy.
  await expect(page.locator(".project-task-succeeded")).toHaveCount(1);
  await page.getByLabel("对话内容").fill("第二次修改要求");
  await page.getByRole("button", { name: "发送消息" }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".message-bubble")).toHaveCount(2);
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page
    .getByRole("button", { name: "项目库", description: "项目库" })
    .click();
  const card = page.getByRole("button", { name: /项目隔离检查/ });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator(".workspace-content:not([hidden])")).toBeVisible();
  await expect(page.locator(".conversation-messages")).toContainText(
    "第二次修改要求",
  );
});

test("首页加号添加图片并支持删除，模型入口是本次创作选择器", async ({
  page,
}) => {
  const chooser = page
    .getByRole("region", { name: "开始创作" })
    .locator('input[type="file"]');
  await chooser.setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(page.getByLabel("已添加的参考素材")).toBeVisible();
  await expect(page.getByRole("button", { name: /移除素材/ })).toBeVisible();
  await page.getByRole("button", { name: "移除素材 blue-hour.png" }).click();
  await expect(page.getByLabel("已添加的参考素材")).toHaveCount(0);
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await expect(page.getByRole("menu")).toContainText("kk-image-2");
});

test("配置连接后图片任务使用 provider 响应回填结果节点", async ({ page }) => {
  await page.route(
    "https://models.example.test/v1/images/generations",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              b64_json:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            },
          ],
        }),
      });
    },
  );
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("test-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByLabel("创作提示词").fill("provider 回填测试");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-succeeded")).toContainText("已完成");
  await expect(
    page.locator(".demo-result-node[data-source=provider]"),
  ).toHaveCount(1);
});

test("批量数量会随请求发送并归档多个 provider 结果", async ({ page }) => {
  let requestedCount = 0;
  const pixel =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  await page.route(
    "https://models.example.test/v1/images/generations",
    async (route) => {
      const body = route.request().postDataJSON() as { n?: number };
      requestedCount = body.n ?? 0;
      expect(route.request().headers()["idempotency-key"]).toMatch(
        /^project-.*-generation-/,
      );
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: [{ b64_json: pixel }, { b64_json: pixel }],
        }),
      });
    },
  );
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("test-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByLabel("生成数量").selectOption("4");
  await page.getByLabel("创作提示词").fill("批量结果归档测试");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-partial")).toContainText("部分完成");
  await expect(
    page.locator('.demo-result-node[data-source="provider"]'),
  ).toHaveCount(2);
  expect(requestedCount).toBe(4);
});

test("运行中的图片任务可取消并停留在当前项目", async ({ page }) => {
  await page.route(
    "https://models.example.test/v1/images/generations",
    () =>
      new Promise(() => {
        // The browser request is expected to be aborted by the cancel action.
      }),
  );
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("test-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByLabel("创作提示词").fill("取消任务测试");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-running")).toBeVisible();
  await page
    .locator(".project-task-running")
    .getByRole("button", { name: "取消" })
    .click();
  await expect(page.locator(".project-task-cancelled")).toContainText("已取消");
});

test("工作台未发送的输入和附件随项目保存，切换回来仍可继续", async ({
  page,
}) => {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByLabel("对话内容").fill("先保存这段工作台草稿");
  await page
    .locator('.chat-composer input[type="file"]')
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(page.getByLabel("已添加的参考素材")).toBeVisible();
  await expect(page.getByLabel("对话内容")).toHaveValue("先保存这段工作台草稿");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: /未命名项目/ }).click();
  await expect(page.getByLabel("对话内容")).toHaveValue("先保存这段工作台草稿");
  await expect(page.getByLabel("已添加的参考素材")).toBeVisible();
});
