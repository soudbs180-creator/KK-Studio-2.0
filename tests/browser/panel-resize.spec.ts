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
  const history = (await panel
    .getByRole("button", { name: "对话记录" })
    .boundingBox())!;
  const close = (await panel
    .getByRole("button", { name: "收起对话" })
    .boundingBox())!;
  expect(close.x - (history.x + history.width)).toBeLessThanOrEqual(40);
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

test("对话宽度的无障碍最大值等于键盘可达宽度", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkspace(page);
  const panel = page.locator(".conversation-panel");
  const handle = page.getByRole("separator", { name: "调整对话面板宽度" });
  await handle.focus();
  await handle.press("End");
  const reachableMax = Number(await handle.getAttribute("aria-valuemax"));
  expect(reachableMax).toBeLessThan(760);
  await expect
    .poll(async () =>
      Math.abs((await panel.boundingBox())!.width - reachableMax),
    )
    .toBeLessThanOrEqual(2);
  await handle.press("Home");
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuemax")))
    .toBeGreaterThan(reachableMax);
  const sidebar = page.locator(".sidebar");
  await expect
    .poll(async () =>
      sidebar.evaluate((element) =>
        element
          .getAnimations()
          .every((animation) => animation.playState === "finished"),
      ),
    )
    .toBe(true);
  await handle.focus();
  await handle.press("End");
  await expect
    .poll(async () =>
      Math.abs(
        (await panel.boundingBox())!.width -
          Number(await handle.getAttribute("aria-valuemax")),
      ),
    )
    .toBeLessThanOrEqual(2);
});

test("侧栏只使用固定展开与收起宽度，键盘切换保持焦点", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkspace(page);
  const sidebar = page.locator(".sidebar");
  await expect(
    page.getByRole("separator", { name: "调整侧栏宽度" }),
  ).toHaveCount(0);
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(291);
  const toggle = sidebar.locator(".sidebar-toggle");
  await toggle.focus();
  await toggle.press("Enter");
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(70);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-label", "展开侧边栏");
  await toggle.press("Enter");
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(291);
  await expect(toggle).toBeFocused();
});
