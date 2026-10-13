import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test("展开的视频通过小地图重新定位后仍避开底部工具栏", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openWorkspace(page);
  const closeChat = page.getByRole("button", { name: "收起对话", exact: true });
  if (await closeChat.isVisible()) await closeChat.click();
  const node = page.getByTestId("canvas-node-video2");
  await node.focus();
  await page.keyboard.press("Enter");
  const editor = page.getByTestId("video-composer");
  await page.getByLabel("视频提示词").fill("重新定位仍保留展开草稿");
  await editor.getByRole("button", { name: "展开提示词", exact: true }).click();
  await showCanvasNavigation(page);
  const minimap = page.getByRole("button", { name: "小地图", exact: true });
  await minimap.click();
  await page
    .getByRole("region", { name: "画布小地图" })
    .getByRole("button", { name: "定位 视频卡片 2", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "画布小地图" })).toHaveCount(0);
  await expect(editor).toHaveClass(/expanded/);
  await expect(page.getByLabel("视频提示词")).toHaveValue(
    "重新定位仍保留展开草稿",
  );
  const box = await editor.boundingBox();
  const canvas = await page.getByTestId("infinite-canvas").boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(
    canvas!.y + canvas!.height - 70,
  );
  await expect
    .poll(() =>
      editor
        .getByRole("button", { name: "生成视频", exact: true })
        .evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ),
          );
        }),
    )
    .toBe(true);
});

for (const [width, height] of [
  [1920, 1080],
  [1280, 720],
  [960, 720],
]) {
  test(`视频编辑区 ${width} 在选中和展开后可真实点击`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openWorkspace(page);
    for (const id of ["video1", "video2"]) {
      const node = page.getByTestId(`canvas-node-${id}`);
      const position = await node.evaluate((element) => ({
        left: (element as HTMLElement).style.left,
        top: (element as HTMLElement).style.top,
      }));
      await node.focus();
      await page.keyboard.press("Enter");
      const editor = page.getByTestId("video-composer");
      await expect(editor).toBeVisible();
      await page.getByLabel("视频提示词").fill(`保留 ${id} 的草稿`);
      const generate = editor.getByRole("button", {
        name: "生成视频",
        exact: true,
      });
      const assertReachable = async () => {
        await expect
          .poll(() =>
            generate.evaluate((element) => {
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
        const box = await editor.boundingBox();
        const canvas = await page.getByTestId("infinite-canvas").boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(canvas!.x);
        expect(box!.y + box!.height).toBeLessThanOrEqual(
          canvas!.y + canvas!.height - 70,
        );
        if (await page.locator(".conversation-panel").isVisible()) {
          const dock = await page.locator(".conversation-panel").boundingBox();
          expect(box!.x + box!.width).toBeLessThanOrEqual(dock!.x);
        }
      };
      await assertReachable();
      await editor
        .getByRole("button", { name: "展开提示词", exact: true })
        .click();
      await assertReachable();
      await showCanvasNavigation(page);
      await page.getByRole("button", { name: "画布缩放", exact: true }).click();
      await page.getByRole("menuitem", { name: /^适应视图/ }).click();
      await assertReachable();
      expect(
        await node.evaluate((element) => ({
          left: (element as HTMLElement).style.left,
          top: (element as HTMLElement).style.top,
        })),
      ).toEqual(position);
      await editor
        .getByRole("button", { name: "视频参数", exact: true })
        .press("Escape");
      await expect(editor).toHaveCount(0);
      await node.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("视频提示词")).toHaveValue(
        `保留 ${id} 的草稿`,
      );
      await editor
        .getByRole("button", { name: "视频参数", exact: true })
        .press("Escape");
    }
  });
}

for (const [width, height] of [
  [390, 480],
  [1099, 720],
  [1920, 480],
]) {
  test(`任务面板 ${width}×${height} 保持可读并限制在窗口内`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openWorkspace(page);
    const trigger = page.getByRole("button", {
      name: "打开任务列表",
      exact: true,
    });
    await trigger.click();
    const panel = page.getByRole("region", { name: "任务列表", exact: true });
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height - 8);
    await expect(
      panel.getByRole("button", { name: "全部", exact: true }),
    ).toHaveCSS("min-height", "32px");
    await expect(
      panel.getByRole("button", { name: "关闭任务列表", exact: true }),
    ).toHaveCSS("width", "32px");
    expect(
      await panel
        .locator(".task-panel-heading")
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(12);
    const stage = page.getByTestId("canvas-stage");
    const before = await stage.getAttribute("style");
    await panel.locator(".task-grid").hover();
    await page.mouse.wheel(0, 180);
    await expect(stage).toHaveAttribute("style", before!);
    await panel.getByRole("button", { name: "执行中", exact: true }).click();
    await expect(panel.locator(".task-card")).toHaveCount(1);
    const taskCard = panel.getByRole("button", {
      name: "查看正在生成中的演示任务",
      exact: true,
    });
    await taskCard.click();
    const detail = panel.getByRole("dialog", { name: "任务详情", exact: true });
    const closeDetail = detail.getByRole("button", {
      name: "关闭任务详情",
      exact: true,
    });
    await expect(closeDetail).toHaveCSS("width", "32px");
    await expect(closeDetail.locator("img")).toHaveCSS("width", "16px");
    expect(
      await detail
        .locator(
          ".task-detail-heading, .task-detail-body strong, .task-detail-body span, p",
        )
        .evaluateAll((elements) =>
          elements.every(
            (element) => parseFloat(getComputedStyle(element).fontSize) >= 12,
          ),
        ),
    ).toBe(true);
    await closeDetail.click();
    await expect(detail).toHaveCount(0);
    await expect(taskCard).toBeFocused();
    await taskCard.click();
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(panel).toBeVisible();
    await panel
      .getByRole("button", { name: "关闭任务列表", exact: true })
      .click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
