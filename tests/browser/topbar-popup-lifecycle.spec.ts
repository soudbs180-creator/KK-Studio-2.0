import { expect, test } from "@playwright/test";

test("顶部菜单 Escape 关闭并回焦，随后可以切换到其他菜单", async ({ page }) => {
  await page.goto("/");

  const file = page.getByRole("button", { name: "文件", exact: true });
  const edit = page.getByRole("button", { name: "编辑", exact: true });
  const windowMenu = page.getByRole("button", {
    name: "窗口",
    exact: true,
  });

  await file.click();
  await expect(file).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".menu-popover")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".menu-popover")).toHaveCount(0);
  await expect(file).toHaveAttribute("aria-expanded", "false");
  await expect(file).toBeFocused();

  await edit.click();
  await expect(edit).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".menu-popover")).toContainText("设置");

  await windowMenu.click();
  await expect(edit).toHaveAttribute("aria-expanded", "false");
  await expect(windowMenu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".menu-popover")).toContainText(
    "展开 / 收起侧边栏",
  );

  await page.keyboard.press("Escape");
  await expect(windowMenu).toHaveAttribute("aria-expanded", "false");
  await expect(windowMenu).toBeFocused();
});
