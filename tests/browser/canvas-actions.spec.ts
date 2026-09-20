import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("图片连续拖动不被浏览器原生图片拖放截断，加号始终跟随", async ({
  page,
}) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  await node.focus();
  await page.keyboard.press("Enter");
  const preview = await page.locator(".image-preview").boundingBox();
  const add = page.getByRole("button", { name: "从图片创建卡片添加下游" });
  const before = await add.boundingBox();
  await page.mouse.move(preview!.x + 180, preview!.y + 180);
  await page.mouse.down();
  await page.mouse.move(preview!.x + 244, preview!.y + 212, { steps: 20 });
  await page.mouse.up();
  const after = await add.boundingBox();
  expect(after!.x - before!.x).toBeCloseTo(64, 0);
  expect(after!.y - before!.y).toBeCloseTo(32, 0);
  const point = await page.getByTestId("connector-video1").evaluate((path) => {
    const curve = path as SVGPathElement;
    const position = curve.getPointAtLength(curve.getTotalLength() * 0.9);
    const screen = new DOMPoint(position.x, position.y).matrixTransform(
      curve.getScreenCTM()!,
    );
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y);
  const remove = page.getByRole("button", {
    name: "删除连线 图片创建卡片 → 视频卡片 1",
    exact: true,
  });
  await expect(remove).toHaveCSS("opacity", "1");
  await expect(remove.locator(".connection-cut-icon")).toBeVisible();
  const cutterBox = (await remove.boundingBox())!;
  await page.mouse.move(
    cutterBox.x + cutterBox.width / 2,
    cutterBox.y + cutterBox.height / 2,
  );
  await expect(remove.locator(".connection-delete-label")).toHaveText(
    "剪开连线",
  );
  await expect(remove.locator(".connection-delete-label")).toHaveCSS(
    "opacity",
    "1",
  );
  await remove.click();
  await expect(page.getByTestId("connector-video1")).toHaveCount(0);
});

test("右侧添加按钮随节点移动，下游卡片和连接可用，删除可撤销", async ({
  page,
}) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  const add = page.getByRole("button", { name: "从图片创建卡片添加下游" });
  await expect(add).toBeVisible();
  const before = await add.boundingBox();
  await node.focus();
  await page.keyboard.press("ArrowRight");
  expect((await add.boundingBox())!.x - before!.x).toBeCloseTo(8);
  await add.click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const next = page.getByTestId(/^canvas-node-added-video-/).nth(0);
  await expect(next).toBeVisible();
  await expect(page.getByTestId(/^connector-added-video-/)).toHaveCount(1);
  const edge = page.getByRole("button", {
    name: "连接 图片创建卡片 → 新视频卡片",
    exact: true,
  });
  await edge.focus();
  await page.keyboard.press("Delete");
  await expect(page.getByTestId(/^connector-added-video-/)).toHaveCount(0);
  await expect(next).toBeVisible();
  await page.getByRole("button", { name: "撤销删除连线", exact: true }).click();
  await expect(page.getByTestId(/^connector-added-video-/)).toHaveCount(1);
});

test("下游菜单 Escape 回焦且不改动卡片，连线删除不删除节点", async ({
  page,
}) => {
  await openWorkspace(page);
  const add = page.getByRole("button", { name: "从视频卡片 1添加下游" });
  const before = await page
    .getByTestId("canvas-node-video1")
    .getAttribute("style");
  await add.click();
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
  await expect(page.getByTestId("canvas-node-video1")).toHaveAttribute(
    "style",
    before!,
  );
  await page
    .getByRole("button", {
      name: "连接 图片创建卡片 → 视频卡片 1",
      exact: true,
    })
    .focus();
  await page
    .getByRole("button", {
      name: "删除连线 图片创建卡片 → 视频卡片 1",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("connector-video1")).toHaveCount(0);
  await expect(page.getByTestId("canvas-node-video1")).toHaveCount(1);
});

test("鼠标能从连线移动到删除按钮，键盘新增后可继续微调节点", async ({
  page,
}) => {
  await openWorkspace(page);
  const edge = page.getByTestId("connector-video1");
  const point = await edge.evaluate((path) => {
    const geometry = path as SVGPathElement;
    const p = geometry.getPointAtLength(geometry.getTotalLength() * 0.9);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(
      geometry.getScreenCTM()!,
    );
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y);
  const remove = page.getByRole("button", {
    name: "删除连线 图片创建卡片 → 视频卡片 1",
    exact: true,
  });
  await expect(remove).toHaveCSS("opacity", "1");
  const box = await remove.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    steps: 12,
  });
  await expect(remove).toHaveCSS("opacity", "1");
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(edge).toHaveCount(0);
  const add = page.getByRole("button", { name: "从图片创建卡片添加下游" });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "文本", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "图片", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "视频", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const node = page.getByTestId(/^canvas-node-added-video-/).nth(0);
  await expect(node).toBeFocused();
  const before = await node.getAttribute("style");
  await page.keyboard.press("ArrowRight");
  await expect(node).not.toHaveAttribute("style", before!);
});
