import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test("比例菜单缩放到400%并适应视图，不改变卡片位置或草稿", async ({ page }) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const node = page.getByTestId("canvas-node-image");
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.getByLabel("图片提示词").fill("保留这个草稿");
  const position = await node.getAttribute("style");
  const trigger = page.getByRole("button", { name: "画布缩放" });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "画布缩放比例" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemradio", { name: "400%", exact: true }).click();
  await expect(trigger).toHaveText("400%");
  await expect(node).toHaveAttribute("style", position!);
  await expect(page.getByLabel("图片提示词")).toHaveValue("保留这个草稿");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole("menuitem", { name: "适应视图" }).click();
  await expect(node).toHaveAttribute("style", position!);
  const nodeBox = await node.boundingBox();
  const canvas = await page.getByTestId("infinite-canvas").boundingBox();
  expect(nodeBox!.x).toBeGreaterThanOrEqual(canvas!.x);
  expect(nodeBox!.x + nodeBox!.width).toBeLessThan(canvas!.x + canvas!.width);
  expect(nodeBox!.y + nodeBox!.height).toBeLessThan(
    canvas!.y + canvas!.height - 80,
  );
  await trigger.click();
  await page.keyboard.press("End");
  await expect(
    menu.getByRole("menuitemradio", { name: "400%", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId("image-composer")).toBeVisible();
});

test("连线和背景控制真实生效，操作不平移画布", async ({ page }) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const stage = page.getByTestId("canvas-stage");
  const before = await stage.getAttribute("style");
  const lines = page.getByRole("button", { name: "显示连线" });
  await expect(lines).toHaveAttribute("aria-pressed", "true");
  await lines.click();
  await expect(lines).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("connector-video1")).not.toBeVisible();
  await lines.click();
  await expect(page.getByTestId("connector-video1")).toBeVisible();
  await page.getByLabel("画布背景颜色", { exact: true }).fill("#253649");
  await expect(page.getByTestId("infinite-canvas")).toHaveCSS(
    "background-color",
    "rgb(37, 54, 73)",
  );
  await expect(stage).toHaveAttribute("style", before!);
});

test("缩放快捷键只在画布内生效，输入和中文合成不触发", async ({ page }) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const node = page.getByTestId("canvas-node-image");
  const trigger = page.getByRole("button", { name: "画布缩放" });
  await node.focus();
  await page.keyboard.press("Control+=");
  await expect(trigger).toHaveText("110%");
  await page.keyboard.press("Control+-");
  await expect(trigger).toHaveText("100%");
  await page.keyboard.press("Enter");
  const prompt = page.getByLabel("图片提示词");
  await prompt.focus();
  const before = await trigger.textContent();
  await page.keyboard.press("Shift+Digit1");
  await expect(prompt).toHaveValue("!");
  await expect(trigger).toHaveText(before!);
  await node.focus();
  await node.dispatchEvent("keydown", {
    key: "+",
    ctrlKey: true,
    isComposing: true,
  });
  await expect(trigger).toHaveText(before!);
});

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [768, 1024],
  [390, 844],
]) {
  test(`画布导航与菜单 ${width} 可触达`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openWorkspace(page);
    await showCanvasNavigation(page);
    const navigation = page.getByRole("group", { name: "画布导航" });
    await page.getByRole("button", { name: "画布缩放" }).click();
    const menu = page.getByRole("menu", { name: "画布缩放比例" });
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    const desktopScale = Math.min(width / 1920, height / 1080);
    const expectedMinWidth = width <= 800 ? 148 : 196.227 * desktopScale;
    expect(menuBox!.width).toBeGreaterThanOrEqual(expectedMinWidth - 1);
    const firstItem = menu.getByRole("menuitem").first();
    await expect(firstItem).toHaveCSS("font-size", "12px");
    const itemBox = await firstItem.boundingBox();
    const expectedItemHeight = width <= 800 ? 28 : 30 * desktopScale;
    expect(itemBox!.height).toBeGreaterThanOrEqual(expectedItemHeight - 1);
    for (const locator of [navigation, menu]) {
      const box = await locator.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: test.info().outputPath(`navigation-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "小地图", exact: true }).click();
    const map = page.getByRole("region", { name: "画布小地图" });
    await expect(map).toBeVisible();
    const mapBox = await map.boundingBox();
    expect(mapBox!.x).toBeGreaterThanOrEqual(0);
    expect(mapBox!.x + mapBox!.width).toBeLessThanOrEqual(width);
    await map.getByRole("button", { name: "定位 图片创建卡片" }).click();
    await expect(page.getByTestId("image-composer")).toBeVisible();
  });
}
