import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  openWorkspace,
  selectSettingsSection,
  waitForConversationPanelSettled,
  selectHomeConversation,
} from "./helpers";

for (const width of [390, 1099, 1920]) {
  test(`首页和 Agent 使用一致控件，发送动作不落单 ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await selectHomeConversation(page);
    const home = page.locator(".start-composer");
    await expect(home.getByText("生成参数", { exact: true })).toHaveCount(0);
    await expect(home.getByLabel("生成数量", { exact: true })).toHaveCount(0);
    for (const selector of [
      ".start-model-picker > button",
      ".start-mode-button",
    ])
      await expect(home.locator(selector)).toHaveCSS(
        "border-radius",
        width < 768 && selector !== ".start-mode-button" ? "1000px" : "8px",
      );
    const homeExtensions = home.getByRole("button", {
      name: "扩展",
      exact: true,
    });
    await expect(homeExtensions).toBeVisible();
    await expect(homeExtensions).toHaveAttribute("title", "扩展");
    await expect(homeExtensions).toHaveAttribute("aria-haspopup", "menu");
    await expect(homeExtensions).toHaveCSS("border-radius", "8px");
    if (width < 768) {
      await expect(homeExtensions).toHaveCSS("width", "44px");
      await expect(homeExtensions).toHaveCSS("height", "44px");
      await expect(homeExtensions.locator("span:not(.ui-icon)")).toBeHidden();
      await home
        .getByRole("button", { name: "更多创作选项", exact: true })
        .click();
    } else
      await expect(homeExtensions.locator("span:not(.ui-icon)")).toBeVisible();
    const homeCenters = await home
      .locator(".start-composer-footer button")
      .evaluateAll((buttons) =>
        buttons
          .filter((button) => button.getClientRects().length)
          .map((button) => {
            const rect = button.getBoundingClientRect();
            return rect.top + rect.height / 2;
          }),
      );
    expect(
      Math.max(...homeCenters) - Math.min(...homeCenters),
    ).toBeLessThanOrEqual(1);
    expect(homeCenters.length).toBeGreaterThanOrEqual(4);
    await openWorkspace(page);
    const open = page.getByRole("button", { name: "打开对话", exact: true });
    if (await open.isVisible()) await open.click();
    await waitForConversationPanelSettled(page);
    const chat = page.locator(".chat-composer");
    await expect(chat).toBeVisible();
    for (const selector of [".chat-model-picker", ".chat-mode-trigger"])
      await expect(chat.locator(selector)).toHaveCSS("border-radius", "1000px");
    const chatExtensions = chat.getByRole("button", {
      name: "扩展",
      exact: true,
    });
    await expect(chatExtensions).toBeVisible();
    await expect(chatExtensions).toHaveAttribute("aria-label", "扩展");
    await expect(chatExtensions).toHaveAttribute("title", "扩展");
    await expect(chatExtensions).toHaveAttribute("aria-haspopup", "menu");
    await expect(chatExtensions).toHaveCSS(
      "border-radius",
      width <= 1200 ? "8px" : "1000px",
    );
    if (width <= 1200) {
      await expect(chatExtensions).toHaveCSS("width", "44px");
      await expect(chatExtensions).toHaveCSS("height", "44px");
      await expect(chatExtensions.locator("span:not(.ui-icon)")).toBeHidden();
    } else
      await expect(chatExtensions.locator("span:not(.ui-icon)")).toBeVisible();
    const tail = chat.locator(".composer-trailing-actions");
    await expect(tail).toBeVisible();
    const layout = await tail.evaluate((group) => {
      const buttons = [...group.querySelectorAll("button")].filter(
        (button) =>
          !button.closest('[role="menu"]') && button.getClientRects().length,
      );
      return {
        centers: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return rect.top + rect.height / 2;
        }),
        right: group.getBoundingClientRect().right,
        edge: group.closest("form")!.getBoundingClientRect().right,
      };
    });
    expect(
      Math.max(...layout.centers) - Math.min(...layout.centers),
    ).toBeLessThanOrEqual(1);
    expect(layout.right).toBeLessThanOrEqual(layout.edge);
    await expect(chat.getByText("生成参数", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`chat-${width}.png`),
      animations: "disabled",
    });
  });
}

test("设置按内容选择紧凑宽度，切换模型后普通页不保留宽外壳", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const panel = page.locator(".settings-panel");
  await panel.evaluate(async (element) => {
    await Promise.all(
      element
        .closest("dialog")!
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  const general = (await panel.boundingBox())!;
  expect(general.width).toBeLessThanOrEqual(960);
  expect(Math.round(general.height)).toBe(674);
  await selectSettingsSection(page, "模型接入");
  const models = (await panel.boundingBox())!;
  expect(models.width).toBeGreaterThan(general.width);
  expect(models.width).toBeLessThanOrEqual(1120);
  await page.screenshot({
    path: info.outputPath("settings-models.png"),
    animations: "disabled",
  });
  await selectSettingsSection(page, "通用设置");
  expect((await panel.boundingBox())!.width).toBe(general.width);
  await page.screenshot({
    path: info.outputPath("settings-update.png"),
    animations: "disabled",
  });
  await selectSettingsSection(page, "软件更新");
  await expect(
    panel.getByRole("heading", { name: "软件更新", exact: true }),
  ).toBeVisible();
});

test("扩展标题、两层标签、帮助和卡片共用内容轴线", async ({ page }, info) => {
  await page.goto("/");
  await page
    .getByRole("complementary", { name: "工作台侧栏" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const shell = await page
    .locator(".catalog-page-skills")
    .evaluate((section) => ({
      width: section.getBoundingClientRect().width,
      parentWidth: section.parentElement!.getBoundingClientRect().width,
    }));
  expect(shell.width).toBe(shell.parentWidth);
  const selectors = [
    ".catalog-page-header",
    ".catalog-page-top-tabs",
    ".catalog-page-toolbar",
    ".extension-help",
    ".catalog-section-title",
    ".catalog-card-grid",
  ];
  const lefts = [];
  for (const selector of selectors) {
    const box = await page
      .locator(`.catalog-page-skills ${selector}`)
      .first()
      .boundingBox();
    expect(box, selector).not.toBeNull();
    lefts.push(box!.x);
  }
  expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: info.outputPath("extensions.png"),
    animations: "disabled",
  });
});

test("图片从空卡片上传后移除上传入口，选中与重载不回到旧工具栏", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-image-/).last();
  await expect(
    node.getByRole("button", { name: "上传图片", exact: true }),
  ).toBeVisible();
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(node.locator(".uploaded-image")).toBeVisible();
  await node.focus();
  await node.press("Enter");
  await expect(
    page
      .getByRole("toolbar", { name: /^图片操作：/ })
      .getByRole("button", { name: "上传图片", exact: true }),
  ).toHaveCount(0);
  await expect(
    node.getByRole("button", { name: "上传图片", exact: true }),
  ).toHaveCount(0);
  const original = createHash("sha256")
    .update((await node.locator(".uploaded-image").getAttribute("src"))!)
    .digest("hex");
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(node.locator(".uploaded-image")).toBeVisible();
  expect(
    createHash("sha256")
      .update((await node.locator(".uploaded-image").getAttribute("src"))!)
      .digest("hex"),
  ).toBe(original);
  await expect(
    node.getByRole("button", { name: "上传图片", exact: true }),
  ).toHaveCount(0);
});
