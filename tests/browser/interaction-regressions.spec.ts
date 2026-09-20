import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("删除前一个节点后，后一个节点保留自己的草稿", async ({ page }) => {
  await openWorkspace(page);
  for (const [index, draft] of ["第一张草稿", "第二张草稿"].entries()) {
    await page.getByRole("button", { name: "添加资源" }).click();
    await page.getByRole("menuitem", { name: "图片", exact: true }).click();
    await expect(
      page.getByTestId(/^canvas-node-added-image-/).nth(index),
    ).toBeVisible();
    await page.getByLabel("图片提示词").fill(draft);
  }
  const first = page.getByTestId(/^canvas-node-added-image-/).nth(0);
  const secondId = await page
    .getByTestId(/^canvas-node-added-image-/)
    .nth(1)
    .getAttribute("data-testid");
  const second = page.getByTestId(secondId!);
  await first.focus();
  await page.keyboard.press("Delete");
  await second.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("图片提示词")).toHaveValue("第二张草稿");
});

for (const width of [1920, 390]) {
  test(`新增卡片的完整编辑区在可操作区域内 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await openWorkspace(page);
    await page.getByRole("button", { name: "添加资源" }).click();
    await page.getByRole("menuitem", { name: "图片", exact: true }).click();
    expect(
      await page.getByTestId("infinite-canvas").evaluate((element) => ({
        x: element.scrollLeft,
        y: element.scrollTop,
      })),
    ).toEqual({ x: 0, y: 0 });
    const card = await page
      .getByTestId(/^canvas-node-added-image-/)
      .nth(0)
      .boundingBox();
    const canvas = await page.getByTestId("infinite-canvas").boundingBox();
    const toolbar = await page
      .getByRole("toolbar", { name: "画布工具" })
      .boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(canvas!.x);
    expect(card!.y).toBeGreaterThanOrEqual(canvas!.y + 60);
    expect(card!.x + card!.width).toBeLessThanOrEqual(
      canvas!.x + canvas!.width,
    );
    expect(card!.y + card!.height).toBeLessThan(toolbar!.y);
    if (width === 1920) {
      const chat = await page.locator(".conversation-panel").boundingBox();
      expect(card!.x + card!.width).toBeLessThan(chat!.x);
    }
  });
}

test("选中编辑器随窗口缩窄重新适配，卡片坐标和草稿保留", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  await node.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("图片提示词").fill("窗口变化后保留的草稿");
  const position = await node.getAttribute("style");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => {
      const card = await node.boundingBox();
      const canvas = await page.getByTestId("infinite-canvas").boundingBox();
      const toolbar = await page
        .getByRole("toolbar", { name: "画布工具" })
        .boundingBox();
      return Boolean(
        card &&
        canvas &&
        toolbar &&
        card.x >= canvas.x &&
        card.x + card.width <= canvas.x + canvas.width &&
        card.y >= canvas.y + 60 &&
        card.y + card.height <= toolbar.y,
      );
    })
    .toBe(true);
  await expect(node).toHaveAttribute("style", position!);
  await expect(page.getByLabel("图片提示词")).toHaveValue(
    "窗口变化后保留的草稿",
  );
});

test("模型测试拒绝 HTML 假成功并可从 HTTP 错误恢复", async ({ page }) => {
  let mode = "html";
  await page.route("https://models.example.test/v1/models", (route) => {
    if (mode === "html")
      return route.fulfill({
        contentType: "text/html",
        body: "<html>Login</html>",
      });
    if (mode === "error") return route.fulfill({ status: 401 });
    return route.fulfill({ json: { data: [{ id: "image-model" }] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".provider-status")).toHaveClass(/is-error/);
  mode = "error";
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".provider-status")).toContainText("HTTP 401");
  mode = "success";
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".provider-status")).toHaveClass(/is-success/);
});

test("取消、编辑配置与离线状态不会留下过期的连接成功提示", async ({
  page,
  context,
}) => {
  let release: () => void = () => {};
  let complete: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const done = new Promise<void>((resolve) => {
    complete = resolve;
  });
  await page.route("https://models.example.test/v1/models", async (route) => {
    await pending;
    await route.fulfill({ json: { data: [] } });
    complete();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  const request = page.waitForRequest("https://models.example.test/v1/models");
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await request;
  await page.getByRole("button", { name: "取消测试" }).click();
  await expect(page.locator(".provider-status")).toHaveClass(/is-cancelled/);
  await page.getByLabel("API Base URL").fill("https://another.example.test/v1");
  release();
  await done;
  await expect(page.locator(".provider-status")).toHaveClass(/is-idle/);
  await context.setOffline(true);
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".provider-status")).toHaveClass(/is-offline/);
  await context.setOffline(false);
});

test("配置入口定位到对应设置分类，菜单支持 Escape", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源" }).click();
  await expect(
    page.getByRole("menuitem", { name: "图片", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("menuitem", { name: "图片", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加资源" })).toBeFocused();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await expect(
    page.getByRole("region", { name: "任务列表" }).getByText("演示 · 生成中"),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "任务列表" })
    .getByRole("button", { name: "关闭任务列表" })
    .click();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await expect(page.getByLabel("API Base URL")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "Skill", exact: true })
    .click();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "设置" })
      .getByRole("button", { name: "通用", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
