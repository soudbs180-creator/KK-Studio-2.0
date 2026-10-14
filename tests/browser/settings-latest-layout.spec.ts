import { expect, test, type Page } from "@playwright/test";

async function openSection(page: Page, name: string) {
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toBeVisible();
  const back = page.getByRole("button", { name: "返回设置分类", exact: true });
  if (
    page.viewportSize()!.width <= 767 &&
    (await page.locator(".settings-panel").getAttribute("data-navigation")) ===
      "detail"
  )
    await back.click();
  await page
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name, exact: true })
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const width of [390, 801, 1099, 1920]) {
  test(`长连接名称保留完整名称且不挤压操作 ${width}`, async ({ page }) => {
    const providerName = "A".repeat(120);
    const serverName = "M".repeat(120);
    await page.addInitScript(
      ({ providerName, serverName }) => {
        localStorage.setItem(
          "kk-studio-next:provider-connections:v1",
          JSON.stringify([
            {
              id: "layout-provider",
              provider: "Layout fixture",
              kind: "user_byok",
              displayName: providerName,
              baseUrl: "https://layout.example.test/v1",
              credentialRef: "layout_ref",
              model: "layout-image",
              capabilities: {
                modalities: ["image"],
                operations: ["generate"],
                async: false,
              },
              state: "active",
              concurrencyLimit: 2,
            },
          ]),
        );
        localStorage.setItem(
          "kk-studio-next:model-provider:v1",
          JSON.stringify({
            version: 1,
            name: "Layout fixture",
            baseUrl: "https://layout.example.test/v1",
            model: "layout-image",
            connectionId: "layout-provider",
          }),
        );
        localStorage.setItem(
          "kk-studio-next:mcp-servers:v1",
          JSON.stringify([
            {
              id: "layout-mcp",
              name: serverName,
              transport: "streamable_http",
              endpoint: "https://layout.example.test/mcp",
              enabled: true,
            },
          ]),
        );
      },
      { providerName, serverName },
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await openSection(page, "模型接入");
    await page
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
    const content = page.locator(".settings-content");
    const provider = page.locator(".provider-connection-list [role=listitem]");
    await expect(provider.locator("strong")).toHaveAttribute(
      "title",
      providerName,
    );
    expect(
      await provider.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(
      await content.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await openSection(page, "扩展");
    await page.getByRole("tab", { name: /MCP/ }).click();
    const server = page.locator(".settings-mcp-server");
    await expect(server.locator("strong").first()).toHaveAttribute(
      "title",
      serverName,
    );
    expect(
      await server.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    const overlap = await server.evaluate((el) => {
      const title = el.querySelector("strong")!.getBoundingClientRect();
      const actions = el
        .querySelector(".settings-mcp-server-actions")!
        .getBoundingClientRect();
      return (
        Math.max(
          0,
          Math.min(title.right, actions.right) -
            Math.max(title.left, actions.left),
        ) *
        Math.max(
          0,
          Math.min(title.bottom, actions.bottom) -
            Math.max(title.top, actions.top),
        )
      );
    });
    expect(overlap).toBe(0);
    expect(
      await content.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await expect(
      server.getByRole("button", { name: "连接", exact: true }),
    ).toBeEnabled();
  });
}

for (const width of [779, 800, 801, 1099]) {
  test(`更新卡片和扩展标签适应内容栏 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await openSection(page, "软件更新");
    const content = page.locator(".settings-content");
    expect(
      await content.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await openSection(page, "扩展");
    const tabs = page.getByRole("tablist", { name: "Skill、MCP 与协作伙伴" });
    expect(
      await tabs.evaluate(
        (el) =>
          el.getBoundingClientRect().right -
          el.closest(".settings-content")!.getBoundingClientRect().right,
      ),
    ).toBeLessThanOrEqual(1);
  });
}

for (const width of [779, 800]) {
  test(`保存提示避让底部分类栏 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 643 });
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await page.getByLabel("主题", { exact: true }).selectOption("light");
    const feedback = page.locator(".settings-feedback");
    await expect(feedback).toBeVisible();
    const visible = await feedback.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const nav = document
        .querySelector(".settings-sidebar")!
        .getBoundingClientRect();
      return {
        separate: b.bottom <= nav.top,
        hit: !!document
          .elementFromPoint(b.left + 20, b.top + b.height / 2)
          ?.closest(".settings-feedback"),
      };
    });
    expect(visible).toEqual({ separate: true, hit: true });
  });
}

test("连接保存与模型能力保存范围明确，连接操作紧邻表单", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await openSection(page, "模型接入");
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const form = page.locator(".provider-form");
  const save = form.getByRole("button", { name: "保存连接", exact: true });
  await expect(save).toBeVisible();
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  expect(
    await save.evaluate((el) => {
      const catalog = el
        .closest("form")!
        .querySelector(".provider-model-catalog")!;
      return !!(
        el.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING
      );
    }),
  ).toBe(true);
  await expect(
    form.getByRole("button", { name: "刷新模型列表", exact: true }),
  ).toHaveCount(0);
  await expect(
    form.getByRole("button", { name: "测试连接并刷新模型", exact: true }),
  ).toHaveCount(1);
  await expect(
    form.getByRole("button", { name: "保存此模型能力", exact: true }),
  ).toHaveCount(1);
});

test("最新设置UI保持宽面板、绿色主题及手机分级导航", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  expect((await page.locator(".settings-panel").boundingBox())!.width).toBe(
    1280,
  );
  expect((await page.locator(".settings-sidebar").boundingBox())!.width).toBe(
    240,
  );
  await openSection(page, "模型接入");
  expect(
    (await page.locator(".model-access-methods").boundingBox())!.width,
  ).toBe(192);
  await page.setViewportSize({ width: 390, height: 844 });
  const back = page.getByRole("button", { name: "返回设置分类", exact: true });
  await expect(back).toBeVisible();
  await back.click();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }),
  ).toBeVisible();
  await expect(page.locator(".settings-content")).toBeHidden();
});
