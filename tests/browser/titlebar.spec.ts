import { expect, test } from "@playwright/test";

for (const width of [390, 1099, 1920]) {
  test(`Web 顶栏 ${width}px 保留导航且不显示原生窗口按钮`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.locator(".window-controls")).toHaveCount(0);
    expect(
      await page.locator(".topbar").getAttribute("data-tauri-drag-region"),
    ).toBeNull();
    if (width >= 768) {
      const menu = page
        .getByRole("navigation", { name: "应用菜单" })
        .getByRole("button", { name: "文件", exact: true });
      await menu.click();
      await expect(page.locator(".menu-popover")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      await expect(page.locator(".preview-label")).toHaveText("浏览器版");
    } else {
      await expect(
        page.getByRole("button", { name: "切换项目", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "搜索与收藏", exact: true }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
