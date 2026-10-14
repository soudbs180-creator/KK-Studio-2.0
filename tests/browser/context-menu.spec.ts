import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("右键画布打开 172:367 菜单并可进入添加节点", async ({ page }) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.click(bounds.x + 40, bounds.y + 500, { button: "right" });
  const menu = page.locator(".canvas-context-menu");
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS("width", "280px");
  await expect(menu).toHaveCSS("min-height", "213px");
  await expect(page.getByRole("menuitem", { name: "上传" })).toBeDisabled();
  await page.getByRole("menuitem", { name: "添加节点" }).click();
  await expect(page.locator(".add-node-menu")).toBeVisible();
});

test("短屏编辑器打开时上下文和添加命令仍可点选并保留源草稿", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const added = page.getByTestId(/^canvas-node-added-video-/).last();
  const source = page.getByTestId((await added.getAttribute("data-testid"))!);
  await page.getByLabel("视频提示词").fill("上下文操作保留草稿");
  const canvas = page.getByTestId("infinite-canvas");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.click(bounds.x + 6, bounds.y + 150, { button: "right" });
  const menu = page.locator(".canvas-context-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "添加节点", exact: true }).click();
  const picker = page.locator(".add-node-menu");
  await expect(picker).toBeVisible();
  await picker.getByRole("menuitem", { name: "文本", exact: true }).click();
  await expect(page.getByTestId(/^canvas-node-added-text-/)).toHaveCount(1);
  await source.focus();
  await source.press("Enter");
  await expect(page.getByLabel("视频提示词")).toHaveValue("上下文操作保留草稿");
});
