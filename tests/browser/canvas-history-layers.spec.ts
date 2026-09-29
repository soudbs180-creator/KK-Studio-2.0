import { expect, test, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

async function addNodeFromBlank(page: Page, label: string) {
  const canvas = page.getByTestId("infinite-canvas");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.dblclick(bounds.x + 420, bounds.y + 420);
  await page.getByRole("menuitem", { name: label, exact: true }).click();
  return { canvas, bounds };
}

test("画布右键撤销和重做会恢复新增节点", async ({ page }) => {
  await openWorkspace(page);
  const { canvas, bounds } = await addNodeFromBlank(page, "视频");
  const created = page.getByTestId(/^canvas-node-added-video-/).first();
  await expect(created).toBeVisible();

  await page.mouse.click(bounds.x + 40, bounds.y + 500, { button: "right" });
  const menu = page.getByRole("menu", { name: "画布菜单" });
  await expect(menu.getByRole("menuitem", { name: "撤销" })).toBeEnabled();
  await menu.getByRole("menuitem", { name: "撤销" }).click();
  await expect(created).toHaveCount(0);

  await page.mouse.click(bounds.x + 40, bounds.y + 500, { button: "right" });
  await expect(
    page.getByRole("menu", { name: "画布菜单" }).getByRole("menuitem", {
      name: "重做",
    }),
  ).toBeEnabled();
  await page
    .getByRole("menu", { name: "画布菜单" })
    .getByRole("menuitem", { name: "重做" })
    .click();
  await expect(
    page.getByTestId(/^canvas-node-added-video-/).first(),
  ).toBeVisible();
  await canvas.focus();
  await page.keyboard.press("Control+Z");
  await expect(
    page.getByTestId(/^canvas-node-added-video-/).first(),
  ).toHaveCount(0);
  await page.keyboard.press("Control+Y");
  await expect(
    page.getByTestId(/^canvas-node-added-video-/).first(),
  ).toBeVisible();
});

test("画布菜单可以切换吸附并打开图层搜索定位", async ({ page }) => {
  await openWorkspace(page);
  const { bounds } = await addNodeFromBlank(page, "图片");
  await expect(
    page.getByTestId(/^canvas-node-added-image-/).first(),
  ).toBeVisible();
  await page.mouse.click(bounds.x + 40, bounds.y + 500, { button: "right" });
  const menu = page.getByRole("menu", { name: "画布菜单" });
  const snap = menu.getByRole("menuitemcheckbox", { name: "网格吸附" });
  await expect(snap).toHaveAttribute("aria-checked", "false");
  await snap.click();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("kk-canvas-ui-preferences-v1")),
    )
    .toContain('"snapEnabled":true');
  await page.mouse.click(bounds.x + 40, bounds.y + 500, { button: "right" });
  await expect(
    page
      .getByRole("menu", { name: "画布菜单" })
      .getByRole("menuitemcheckbox", { name: "网格吸附" }),
  ).toHaveAttribute("aria-checked", "true");

  await page
    .getByRole("menu", { name: "画布菜单" })
    .getByRole("menuitem", {
      name: "图层管理",
    })
    .click();
  const panel = page.getByRole("region", { name: "画布图层" });
  await expect(panel).toBeVisible();
  await panel.screenshot({
    path: "docs/changes/2026-09-29-kaworkai-canvas/evidence/layers-panel.png",
  });
  await panel.getByRole("searchbox", { name: "搜索图层" }).fill("新图片");
  await expect(
    panel.getByRole("button", { name: /定位 新图片卡片/ }),
  ).toBeVisible();
  await panel.getByRole("button", { name: /定位 新图片卡片/ }).click();
  await expect(
    page.getByTestId(/^canvas-node-added-image-/).first(),
  ).toBeVisible();
});
