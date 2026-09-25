import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { seedSidebarFixture } from "./sidebar-fixture";

async function openWorkspace(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
}

test("最新70px收起侧栏、38×48导航与保留的搜索入口，搜索关闭回焦", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar).toHaveCSS("width", "70px");
  expect(await sidebar.boundingBox()).toMatchObject({ x: 0, width: 70 });
  const rows = await sidebar.locator(".primary-nav button").all();
  for (const [i, row] of rows.entries()) {
    expect(await row.boundingBox()).toMatchObject({
      x: 14,
      y: 131 + i * 52,
      width: 38,
      height: 48,
    });
  }
  const search = sidebar.getByRole("button", { name: "搜索", exact: true });
  expect(await search.boundingBox()).toMatchObject({
    x: 22,
    y: 942,
    width: 26,
    height: 26,
  });
  await search.click();
  const dialog = page.getByRole("dialog", { name: "搜索与收藏" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("搜索内容").fill("不匹配的搜索文本");
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
});

test("四视口保留搜索、账号和设置命中，窄屏展开可操作且Escape回焦", async ({
  page,
}) => {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await openWorkspace(page);
    if (width > 1200)
      await page
        .getByRole("button", { name: "收起侧边栏", exact: true })
        .click();
    const sidebar = page.locator(".sidebar");
    const toggle = sidebar.locator(".sidebar-toggle");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Phone puts search/settings in the header and account in the drawer.
    if (width < 768) await toggle.click();
    for (const name of ["搜索", "个人信息", "打开设置"]) {
      const button = sidebar.getByRole("button", { name, exact: true });
      const hit = await button.evaluate((el) => {
        const b = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
        );
      });
      expect(hit, `${width} ${name}`).toBe(true);
    }
    const account = sidebar.getByRole("button", {
      name: "个人信息",
      exact: true,
    });
    await account.click();
    await expect(sidebar.locator(".account-popup")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(account).toBeFocused();
    if (width < 768) await toggle.click();
    const settings = sidebar.getByRole("button", {
      name: "打开设置",
      exact: true,
    });
    const settingsBounds = (await settings.boundingBox())!;
    if (width > 800) expect(settingsBounds.x).toBeLessThan(61);
    const toolbarBounds = (await page
      .locator(".canvas-toolbar")
      .boundingBox())!;
    expect(
      Math.min(
        settingsBounds.x + settingsBounds.width,
        toolbarBounds.x + toolbarBounds.width,
      ) > Math.max(settingsBounds.x, toolbarBounds.x) &&
        Math.min(
          settingsBounds.y + settingsBounds.height,
          toolbarBounds.y + toolbarBounds.height,
        ) > Math.max(settingsBounds.y, toolbarBounds.y),
      `${width} settings must not cover canvas tools`,
    ).toBe(false);
    await settings.click();
    await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(settings).toBeFocused();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar.locator(".nav-label").first()).toBeVisible();
    await sidebar.getByRole("button", { name: "项目库", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "项目库", exact: true }),
    ).toBeVisible();
    if (width <= 1200) {
      // Navigation closes a compact drawer; Escape still closes an open one.
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await page.keyboard.press("Escape");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toBeFocused();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("个人信息弹层提供可读的账户信息和可用的更新入口", async ({ page }) => {
  await page.goto("/");
  const account = page.getByRole("button", { name: "个人信息", exact: true });
  await account.click();
  const popup = page.locator(".account-popup");
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds?.width).toBe(260);
  expect(bounds?.height).toBe(230);
  await expect(popup.locator(".account-identity strong")).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(popup.locator(".account-popup-actions button")).toHaveCount(2);
  for (const button of await popup
    .locator(".account-popup-actions button")
    .all())
    await expect(button).toBeDisabled();
  await expect(
    popup.getByRole("button", { name: "打开主题设置" }),
  ).toBeVisible();
  const updateButton = popup.getByRole("button", { name: "检测" });
  await expect(updateButton).toBeEnabled();
  await updateButton.click();
  await expect(page.getByRole("heading", { name: "软件更新" })).toBeVisible();
});

test("侧栏快速切换后手机搜索承接焦点，减弱动态无残留动画", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.locator(".sidebar-toggle");
  for (let i = 0; i < 5; i++) await toggle.click();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const search = page.getByRole("button", { name: "搜索", exact: true });
  await search.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "搜索与收藏", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "搜索与收藏" })).toBeVisible();
  await page.keyboard.press("Escape");
  await toggle.click();
  expect(
    await page
      .locator(".sidebar")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("窄屏侧栏在搜索弹窗内保持展开，关闭后外部点击收起", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator(".sidebar-toggle");
  await toggle.click();
  const search = page.getByRole("button", { name: "搜索", exact: true });
  await search.click();
  await page
    .getByRole("dialog", { name: "搜索与收藏" })
    .getByLabel("搜索内容")
    .fill("测试");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  await page.mouse.click(375, 470);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("断点隐藏分组时恢复焦点，顶部菜单仍可展开窄屏侧栏", async ({ page }) => {
  await seedSidebarFixture(page);
  await page.locator(".project-link").first().focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar-toggle")).toBeFocused();
  await page.getByRole("button", { name: "应用功能菜单", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "展开 / 收起侧边栏", exact: true })
    .click();
  await expect(page.locator(".sidebar-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("粗指针侧栏44px命中区不重叠，搜索、设置可触控", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const controls = await page.evaluate(() => {
    const names = [
      ".mobile-search",
      ".sidebar-toggle",
      ".sidebar-settings",
      ".compact-app-trigger",
      ...Array.from(
        { length: 4 },
        (_, index) => `.primary-nav button:nth-child(${index + 1})`,
      ),
    ];
    return names.map((name) => {
      const button = document.querySelector<HTMLElement>(name)!;
      const rect = button.getBoundingClientRect();
      const pseudo = getComputedStyle(button, "::before");
      const width = Math.max(rect.width, parseFloat(pseudo.width) || 0);
      const height = Math.max(rect.height, parseFloat(pseudo.height) || 0);
      return {
        name,
        width,
        height,
        x: rect.x + rect.width / 2 - width / 2,
        y: rect.y + rect.height / 2 - height / 2,
      };
    });
  });
  for (const [index, a] of controls.entries()) {
    expect(a.width).toBeGreaterThanOrEqual(44);
    expect(a.height).toBeGreaterThanOrEqual(44);
    for (const b of controls.slice(index + 1)) {
      expect(
        Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) &&
          Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y),
      ).toBe(false);
    }
  }
  await page.getByRole("button", { name: "搜索与收藏", exact: true }).tap();
  await expect(page.getByRole("dialog", { name: "搜索与收藏" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "打开设置", exact: true }).tap();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await context.close();
});
