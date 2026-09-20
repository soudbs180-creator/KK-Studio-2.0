import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("左键框选可见卡片，不平移画布；空白点击清空选择", async ({ page }) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  const box = (await canvas.boundingBox())!;
  const stage = page.getByTestId("canvas-stage");
  const before = await stage.getAttribute("style");
  const positions = await page
    .locator("[data-canvas-node]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style")));
  await page.mouse.move(box.x + 150, box.y + 130);
  await page.mouse.down();
  await page.mouse.move(box.x + 1090, box.y + 640, { steps: 12 });
  await expect(page.getByTestId("canvas-marquee")).toBeVisible();
  await expect(
    page.locator('[data-canvas-node][data-selected="true"]'),
  ).toHaveCount(3);
  await page.screenshot({
    path: test.info().outputPath("user-comments-2026-09-08/marquee.png"),
  });
  await page.mouse.up();
  await expect(page.getByTestId("canvas-marquee")).toHaveCount(0);
  await expect(stage).toHaveAttribute("style", before!);
  expect(
    await page
      .locator("[data-canvas-node]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style"))),
  ).toEqual(positions);
  await page.mouse.click(box.x + 25, box.y + 600);
  await expect(
    page.locator('[data-canvas-node][data-selected="true"]'),
  ).toHaveCount(0);
});

for (const button of ["middle", "right"] as const) {
  test(`${button}拖动卡片和平移空白都只移动视图，保留选择`, async ({
    page,
  }) => {
    await openWorkspace(page);
    const canvas = page.getByTestId("infinite-canvas");
    const box = (await canvas.boundingBox())!;
    const node = page.getByTestId("canvas-node-image");
    const before = await node.getAttribute("style");
    for (const point of [
      { x: box.x + 25, y: box.y + 600 },
      { x: box.x + 300, y: box.y + 300 },
    ]) {
      const stage = page.getByTestId("canvas-stage");
      const transform = await stage.getAttribute("style");
      await page.mouse.move(point.x, point.y);
      await page.mouse.down({ button });
      await page.mouse.move(point.x + 60, point.y + 30, { steps: 8 });
      await page.mouse.up({ button });
      await expect(stage).not.toHaveAttribute("style", transform!);
      await expect(node).toHaveAttribute("style", before!);
      await expect(page.getByTestId("canvas-marquee")).toHaveCount(0);
    }
  });
}

test("Shift追加多选可一起拖动；Escape取消拖动恢复位置", async ({ page }) => {
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  await page.keyboard.down("Shift");
  await page.locator(".video-placeholder").first().click();
  await page.keyboard.up("Shift");
  await expect(
    page.locator('[data-canvas-node][data-selected="true"]'),
  ).toHaveCount(2);
  const nodes = page.locator('[data-canvas-node][data-selected="true"]');
  const before = await nodes.evaluateAll((nodes) =>
    nodes.map((node) => ({
      x: (node as HTMLElement).offsetLeft,
      y: (node as HTMLElement).offsetTop,
    })),
  );
  const preview = (await page.locator(".image-preview").boundingBox())!;
  await page.mouse.move(preview.x + 100, preview.y + 100);
  await page.mouse.down();
  await page.mouse.move(preview.x + 140, preview.y + 120, { steps: 8 });
  await page.mouse.up();
  const after = await nodes.evaluateAll((nodes) =>
    nodes.map((node) => ({
      x: (node as HTMLElement).offsetLeft,
      y: (node as HTMLElement).offsetTop,
    })),
  );
  expect(after[0].x - before[0].x).toBeGreaterThan(0);
  expect(after[1].x - before[1].x).toEqual(after[0].x - before[0].x);
  expect(after[1].y - before[1].y).toEqual(after[0].y - before[0].y);
  const original = await page.getByTestId("canvas-stage").getAttribute("style");
  await page.keyboard.down("Space");
  await page.mouse.move(preview.x + 100, preview.y + 100);
  await page.mouse.down();
  await page.mouse.move(preview.x + 170, preview.y + 150, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect(page.getByTestId("canvas-stage")).toHaveAttribute(
    "style",
    original!,
  );
});

test("提示词输入中的H、V和空格不会切换工具或移动画布", async ({ page }) => {
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  const prompt = page.getByLabel("图片提示词");
  await prompt.fill("海岸");
  const stage = page.getByTestId("canvas-stage");
  const before = await stage.getAttribute("style");
  await prompt.pressSequentially(" h v ");
  await expect(prompt).toHaveValue("海岸 h v ");
  await expect(page.getByTestId("infinite-canvas")).toHaveAttribute(
    "data-tool",
    "select",
  );
  await expect(page.getByTestId("infinite-canvas")).toHaveAttribute(
    "data-space-pan",
    "false",
  );
  await expect(stage).toHaveAttribute("style", before!);
});
