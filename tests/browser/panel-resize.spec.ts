import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("桌面宽度可用鼠标和键盘调整，平板不出现无效拖拽柄", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkspace(page);
  const panel = page.locator(".conversation-panel");
  const handle = page.getByRole("separator", { name: "调整对话面板宽度" });
  await expect(handle).toBeVisible();
  const initialWidth = (await panel.boundingBox())!.width;
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 - 200,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await panel.boundingBox())!.width)
    .toBeGreaterThan(initialWidth + 180);
  const hud = (await page.locator(".canvas-hud-right").boundingBox())!;
  const expandedPanel = (await panel.boundingBox())!;
  expect(hud.x + hud.width).toBeLessThanOrEqual(expandedPanel.x);

  await handle.focus();
  await expect(handle).toBeFocused();
  const draggedWidth = (await panel.boundingBox())!.width;
  await handle.press("ArrowRight");
  await expect
    .poll(async () => (await panel.boundingBox())!.width)
    .toBeLessThan(draggedWidth);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(handle).toBeHidden();
});
