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
    path: "test-results/changes/2026-09-29-kaworkai-canvas/evidence/layers-panel.png",
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

test("删除带连线节点后一次撤销恢复节点和连线，重做后仍能继续编辑", async ({
  page,
}) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  await page
    .getByRole("button", { name: "从图片创建卡片添加下游", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).first();
  const edge = page.getByTestId(/^connector-added-video-/).first();
  await expect(node).toBeVisible();
  await expect(edge).toHaveCount(1);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await node.focus();
    await page.keyboard.press("Delete");
    await expect(node).toHaveCount(0);
    await expect(edge).toHaveCount(0);
    await canvas.focus();
    await page.keyboard.press("Control+Z");
    await expect(node).toHaveCount(1);
    await expect(edge).toHaveCount(1);
    await page.keyboard.press("Control+Y");
    await expect(node).toHaveCount(0);
    await expect(edge).toHaveCount(0);
    await page.keyboard.press("Control+Z");
    await expect(node).toHaveCount(1);
    await expect(edge).toHaveCount(1);
  }
  const before = await node.getAttribute("style");
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await expect(node).not.toHaveAttribute("style", before!);
  await canvas.focus();
  await page.keyboard.press("Control+Z");
  await expect(node).toHaveAttribute("style", before!);
  await expect(edge).toHaveCount(1);
});

test("超过80帧的连续拖动只撤销一次且保留拖动前的编辑历史", async ({ page }) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  const node = page.getByTestId("canvas-node-image");
  const initial = await node.getAttribute("style");
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await expect(node).not.toHaveAttribute("style", initial!);
  const beforeDrag = (await node.getAttribute("style"))!;
  const preview = (await node.locator(".image-preview").boundingBox())!;
  await page.mouse.move(preview.x + 180, preview.y + 180);
  await page.mouse.down();
  await page.mouse.move(preview.x + 360, preview.y + 270, { steps: 90 });
  await page.mouse.up();
  await expect(node).not.toHaveAttribute("style", beforeDrag);
  const afterDrag = (await node.getAttribute("style"))!;
  await canvas.focus();
  await page.keyboard.press("Control+Z");
  await expect(node).toHaveAttribute("style", beforeDrag);
  await page.keyboard.press("Control+Z");
  await expect(node).toHaveAttribute("style", initial!);
  await page.keyboard.press("Control+Y");
  await expect(node).toHaveAttribute("style", beforeDrag);
  await page.keyboard.press("Control+Y");
  await expect(node).toHaveAttribute("style", afterDrag);
});

for (const cancellation of [
  "Escape",
  "pointercancel",
  "blur",
  "pan",
] as const) {
  test(`${cancellation}取消手势恢复起点且不清空已有重做`, async ({ page }) => {
    await openWorkspace(page);
    const canvas = page.getByTestId("infinite-canvas");
    const node = page.getByTestId("canvas-node-image");
    const stage = page.getByTestId("canvas-stage");
    const initialNode = (await node.getAttribute("style"))!;
    const initialStage = (await stage.getAttribute("style"))!;
    await node.focus();
    await page.keyboard.press("ArrowRight");
    await expect(node).not.toHaveAttribute("style", initialNode);
    const nextNode = (await node.getAttribute("style"))!;
    await canvas.focus();
    await page.keyboard.press("Control+Z");
    await expect(node).toHaveAttribute("style", initialNode);
    const preview = (await node.locator(".image-preview").boundingBox())!;
    const button = cancellation === "pan" ? "middle" : "left";
    await page.mouse.move(preview.x + 180, preview.y + 180);
    await page.mouse.down({ button });
    await page.mouse.move(preview.x + 280, preview.y + 240, { steps: 12 });
    if (cancellation === "pan")
      await expect(stage).not.toHaveAttribute("style", initialStage);
    else await expect(node).not.toHaveAttribute("style", initialNode);
    if (cancellation === "pointercancel")
      await canvas.dispatchEvent("pointercancel", { pointerId: 1 });
    else if (cancellation === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    else await page.keyboard.press("Escape");
    await page.mouse.up({ button });
    await expect(node).toHaveAttribute("style", initialNode);
    await expect(stage).toHaveAttribute("style", initialStage);
    await canvas.focus();
    await page.keyboard.press("Control+Y");
    await expect(node).toHaveAttribute("style", nextNode);
    await page.keyboard.press("Control+Z");
    await expect(node).toHaveAttribute("style", initialNode);
  });
}
