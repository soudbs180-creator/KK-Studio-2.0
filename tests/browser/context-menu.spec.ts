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
