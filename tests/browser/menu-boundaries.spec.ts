import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test("账号菜单跨窄屏断点后仍优先关闭，键盘展开不让侧栏监听抢占", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "个人信息", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator(".sidebar-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".account-popup")).toBeVisible();
  await page
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  await expect(page.locator(".account-popup")).toHaveCount(0);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.mouse.click(375, 470);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("侧栏菜单在同一侧栏中的其他操作开始时关闭", async ({ page }) => {
  await page.goto("/");
  const sort = page.getByRole("button", {
    name: "项目显示与排序",
    exact: true,
  });
  const account = page.getByRole("button", { name: "个人信息", exact: true });
  await sort.click();
  await account.click();
  await expect(page.getByRole("menu", { name: "项目显示与排序" })).toHaveCount(
    0,
  );
  await expect(page.locator(".account-popup")).toBeVisible();
  await account.click();
  await expect(page.locator(".account-popup")).toHaveCount(0);
  await account.click();
  await sort.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".account-popup")).toHaveCount(0);
  await expect(
    page.getByRole("menu", { name: "项目显示与排序" }),
  ).toBeVisible();
  await account.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "项目显示与排序" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".account-popup")).toHaveCount(0);
  await expect(account).toHaveAttribute("aria-expanded", "false");
});

test("工具菜单切换到资产弹窗后不在背景残留", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "选择画布工具", exact: true }).click();
  await expect(page.getByRole("menu", { name: "画布工具选择" })).toBeVisible();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "资产管理" })).toBeVisible();
  await expect(
    page.getByRole("menu", { name: "画布工具选择", includeHidden: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "资产管理", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".canvas-tool-menu")).toHaveCount(0);
});

test("侧栏项目右键菜单在打开同一项目时关闭", async ({ page }) => {
  await page.goto("/");
  const project = page
    .locator(".project-entry .project-link")
    .filter({ hasText: "KK项目" });
  await project.click({ button: "right" });
  await expect(
    page.getByRole("menu", { name: "项目组设置", exact: true }),
  ).toBeVisible();
  await project.click();
  await expect(
    page.getByRole("menu", { name: "项目组设置", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
});

test("画布导航菜单在切换背景和连线时关闭且操作仍生效", async ({ page }) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const zoom = page.getByRole("button", { name: "画布缩放", exact: true });
  for (const selector of [".canvas-background", ".canvas-lines"]) {
    await zoom.click();
    const button = page.locator(selector);
    const before = await button.getAttribute("aria-pressed");
    await button.click();
    await expect(page.getByRole("menu", { name: "画布缩放比例" })).toHaveCount(
      0,
    );
    await expect(zoom).toHaveAttribute("aria-expanded", "false");
    await expect(button).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
  }
});
