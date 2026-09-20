import { expect, test } from "@playwright/test";
import { openWorkspace, waitForConversationPanelSettled } from "./helpers";

test("底栏心形无需选择节点，直接打开喜欢与收藏搜索", async ({ page }) => {
  await openWorkspace(page);
  const library = page.getByRole("button", {
    name: "打开喜欢与收藏",
    exact: true,
  });
  await expect(library).toBeEnabled();
  await library.click();
  await expect(page.locator(".catalog-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(library).toBeFocused();
});

test("底栏选择菜单切换抓手，拖拽移动视图而不改节点坐标", async ({ page }) => {
  await openWorkspace(page);
  const toggle = page.getByRole("button", {
    name: "选择画布工具",
    exact: true,
  });
  await toggle.click();
  await page
    .getByRole("menuitemradio", { name: "抓手工具", exact: true })
    .click();
  await expect(toggle).toBeFocused();
  const canvas = page.getByTestId("infinite-canvas");
  await expect(canvas).toHaveAttribute("data-tool", "hand");
  const node = page.getByTestId("canvas-node-image");
  const before = await node.getAttribute("style");
  const stage = await page.getByTestId("canvas-stage").getAttribute("style");
  const box = await page.locator(".image-preview").boundingBox();
  await page.mouse.move(box!.x + 150, box!.y + 150);
  await page.mouse.down();
  await page.mouse.move(box!.x + 190, box!.y + 170, { steps: 8 });
  await page.mouse.up();
  await expect(node).toHaveAttribute("style", before!);
  await expect(page.getByTestId("canvas-stage")).not.toHaveAttribute(
    "style",
    stage!,
  );
  await canvas.focus();
  await page.keyboard.press("v");
  await expect(canvas).toHaveAttribute("data-tool", "select");
  await expect(
    page.getByRole("button", { name: "收起画布工具栏" }),
  ).toHaveCount(0);
});

test("663px对话入口为图标，帮助先打开原稿两项菜单", async ({ page }) => {
  await page.setViewportSize({ width: 663, height: 698 });
  await openWorkspace(page);
  const chat = page.getByRole("button", { name: "打开对话", exact: true });
  await expect(chat).toHaveText("");
  await chat.click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await waitForConversationPanelSettled(page);
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  const help = page.getByRole("menu", { name: "帮助与快捷键", exact: true });
  await expect(
    help.getByRole("menuitem", { name: "帮助教程", exact: true }),
  ).toBeVisible();
  await expect(
    help.getByRole("menuitem", { name: "快捷按键", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "帮助与快捷键", exact: true }),
  ).toBeFocused();
});

test("工具与帮助菜单保持可读尺寸、快捷键三栏及窄屏可用", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "选择画布工具", exact: true }).click();
  const tools = page.getByRole("menu", { name: "画布工具选择", exact: true });
  const toolsBox = await tools.boundingBox();
  expect(toolsBox!.width).toBe(90);
  expect(toolsBox!.height).toBe(50);
  await tools.screenshot({
    path: "docs/evidence/user-comments-2026-09-08/tool-menu.png",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  const help = page.getByRole("menu", { name: "帮助与快捷键", exact: true });
  const helpBox = await help.boundingBox();
  expect(helpBox!.width).toBe(103);
  expect(helpBox!.height).toBe(50);
  await help.screenshot({
    path: "docs/evidence/user-comments-2026-09-08/help-menu.png",
  });
  await help.getByRole("menuitem", { name: "快捷按键", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "快捷按键" });
  for (const tab of ["全局", "画布", "文件"]) {
    await panel.getByRole("tab", { name: tab, exact: true }).click();
    await expect(panel.getByRole("tabpanel")).toBeVisible();
    const panelBounds = (await panel.boundingBox())!;
    expect(panelBounds.x + panelBounds.width / 2).toBeCloseTo(960, 0);
    await panel.screenshot({
      animations: "disabled",
      path: `docs/evidence/user-comments-2026-09-08/shortcuts-${tab}.png`,
    });
  }
  for (const width of [1440, 768, 663, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await panel.getByRole("tab", { name: "画布", exact: true }).click();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(
      await panel
        .locator(".shortcuts-body")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  await panel.screenshot({
    path: "docs/evidence/user-comments-2026-09-08/shortcuts-390.png",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "帮助与快捷键", exact: true }),
  ).toBeFocused();
});
