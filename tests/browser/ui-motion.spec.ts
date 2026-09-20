import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test("搜索弹窗按原稿展示喜欢与收藏双栏，收藏可编辑、查找与移除", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  await page.getByLabel("图片提示词").fill("清晨森林中的小屋");
  await page.getByRole("button", { name: "喜欢当前卡片", exact: true }).click();
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "搜索与收藏" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "喜欢收藏" }).click();
  await expect(
    dialog.getByRole("heading", { name: "喜欢", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "收藏", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".saved-like-card")).toHaveCount(1);
  await expect(dialog.locator(".saved-prompt-card")).toHaveCount(0);
  await dialog.screenshot({
    path: "docs/evidence/catalog-saved-desktop.png",
    animations: "disabled",
  });
  await dialog
    .locator(".saved-like-card")
    .getByRole("button", { name: "编辑" })
    .click();
  await dialog.getByLabel("喜欢名称").fill("森林场景");
  await dialog.getByRole("button", { name: "保存名称" }).click();
  await dialog.getByLabel("搜索内容").fill("森林场景");
  await expect(dialog.locator(".saved-like-card")).toContainText("森林场景");
  await dialog
    .locator(".saved-like-card")
    .getByRole("button", { name: "移除喜欢" })
    .click();
  await expect(dialog.locator(".saved-prompt-card")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "搜索", exact: true }),
  ).toBeFocused();
});

test("视频编辑器只在选中时出现，参数与提示词在切换后保留", async ({ page }) => {
  await openWorkspace(page);
  await expect(page.getByTestId("video-composer")).toHaveCount(0);
  await page.locator(".video-placeholder").last().click();
  const editor = page.getByTestId("video-composer");
  await expect(editor).toBeVisible();
  await page.getByLabel("视频提示词").fill("猎豹在草原上奔跑");
  await page.screenshot({
    path: "docs/evidence/video-composer-desktop.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "视频参数", exact: true }).click();
  await page.getByLabel("视频时长").selectOption("10");
  await page.keyboard.press("Escape");
  await expect(editor).toBeVisible();
  await page
    .getByRole("button", { name: "视频参数", exact: true })
    .press("Escape");
  await expect(editor).toHaveCount(0);
  await page.locator(".video-placeholder").last().click();
  await expect(page.getByLabel("视频提示词")).toHaveValue("猎豹在草原上奔跑");
  await expect(
    page.getByRole("button", { name: "视频参数", exact: true }),
  ).toContainText("10S");
  await page.getByRole("button", { name: "生成数量", exact: true }).click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "生成视频", exact: true }).click();
  await expect(
    page.locator('.demo-result-node[data-kind="video"][data-source="demo"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.demo-result-node[data-kind="video"] .demo-badge'),
  ).toHaveText("示范素材");
});

test("任务面板按 Runtime / Tasks 展示卡片，滚轮和 Escape 不影响画布", async ({
  page,
}) => {
  await openWorkspace(page);
  const trigger = page.getByRole("button", { name: "打开任务列表" });
  await trigger.click();
  const panel = page.getByRole("region", { name: "任务列表" });
  await expect(panel).toHaveAttribute("data-node-id", "396:938");
  await expect(panel.getByText("点击查看")).toBeVisible();
  await expect(panel.getByText("演示 · 生成中")).toBeVisible();
  await expect
    .poll(() => panel.boundingBox())
    .toEqual({
      x: 321,
      y: 108,
      width: 196,
      height: 240,
    });
  await expect(
    panel.getByRole("button", { name: "全部", exact: true }),
  ).toHaveCSS("min-height", "14px");
  await panel.screenshot({
    path: "docs/evidence/runtime-tasks-2026-09-11/task-panel.png",
    animations: "disabled",
  });
  await expect(panel.locator(".task-card")).toHaveCount(2);
  await panel.getByRole("button", { name: "查看演示任务 2026/9/5" }).click();
  await expect(panel.getByRole("dialog", { name: "任务详情" })).toBeVisible();
  await trigger.click();
  await expect(panel).toHaveCount(0);
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("dialog", { name: "任务详情" })).toHaveCount(0);
  const before = await page.getByTestId("canvas-stage").getAttribute("style");
  await panel.hover();
  await page.mouse.wheel(0, 180);
  await expect(page.getByTestId("canvas-stage")).toHaveAttribute(
    "style",
    before!,
  );
  await panel.getByRole("button", { name: "执行中", exact: true }).click();
  await expect(panel.locator(".task-card")).toHaveCount(1);
  await expect(panel.getByText("演示 · 生成中")).toBeVisible();
  await panel.getByRole("button", { name: "失败", exact: true }).click();
  await expect(panel.getByText("暂无失败任务")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("整理画布与小地图可实际定位节点，导航控件不跟随画布平移", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const trigger = page.getByRole("button", { name: "打开任务列表" });
  const triggerBefore = await trigger.boundingBox();
  const canvas = await page.getByTestId("infinite-canvas").boundingBox();
  await page.mouse.move(canvas!.x + 25, canvas!.y + 500);
  await page.mouse.down();
  await page.mouse.move(canvas!.x + 125, canvas!.y + 580);
  await page.mouse.up();
  expect(await trigger.boundingBox()).toEqual(triggerBefore);
  await page.getByRole("button", { name: "整理画布", exact: true }).click();
  await page.getByRole("button", { name: "小地图", exact: true }).click();
  const map = page.getByRole("region", { name: "画布小地图" });
  await expect(map).toBeVisible();
  await map.screenshot({
    path: "docs/evidence/canvas-minimap.png",
    animations: "disabled",
  });
  await map.getByRole("button", { name: "定位 图片创建卡片" }).click();
  await expect(page.getByTestId("image-composer")).toBeVisible();
});

test("减少动态效果模式关闭进场动画，弹窗关闭恢复焦点", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  expect(await dialog.evaluate((e) => getComputedStyle(e).animationName)).toBe(
    "none",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
});

test("窄桌面展开编辑器后，参数与生成按钮不被工具栏遮挡", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  await page.getByRole("button", { name: "展开提示词", exact: true }).click();
  const editor = page.getByTestId("image-composer");
  await expect
    .poll(() =>
      editor.evaluate((element) => (element as HTMLElement).offsetHeight),
    )
    .toBe(330);
  await expect
    .poll(async () =>
      editor.locator(".generate-button").evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        );
      }),
    )
    .toBe(true);
  const controls = await editor.locator(".creation-controls").boundingBox();
  const toolbar = await page
    .getByRole("toolbar", { name: "画布工具" })
    .boundingBox();
  expect(controls!.y + controls!.height).toBeLessThan(toolbar!.y);
});

test("键盘关闭任务弹层不取消卡片选择，上传只由可见按钮触发", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByTestId("canvas-node-image").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "任务列表" })).toHaveCount(0);
  await expect(page.getByTestId("image-composer")).toBeVisible();
  const fileInputs = page.locator(".canvas-node input[type=file]");
  expect(
    await fileInputs.evaluateAll((elements) =>
      elements.every((element) => element.hasAttribute("hidden")),
    ),
  ).toBe(true);
});

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [768, 1024],
  [390, 844],
]) {
  test(`搜索收藏弹窗 ${width} 可操作且无横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    if (width <= 800)
      await page
        .getByRole("button", { name: "搜索与收藏", exact: true })
        .click();
    else {
      await page.getByRole("button", { name: "搜索", exact: true }).focus();
      await page.keyboard.press("Control+k");
    }
    const panel = page.getByTestId("catalog-panel");
    await expect(page.getByLabel("搜索内容")).toBeFocused();
    await panel.getByRole("tab", { name: "喜欢收藏" }).click();
    await panel.screenshot({
      path: `docs/evidence/catalog-${width}.png`,
      animations: "disabled",
    });
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
