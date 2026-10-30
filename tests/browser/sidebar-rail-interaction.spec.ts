import { expect, test, type Page } from "@playwright/test";

async function createFolderOnce(page: Page): Promise<void> {
  const create = page.getByRole("button", {
    name: "创建项目文件夹",
    exact: true,
  });
  await expect(create).toBeVisible();
  await expect(create).toBeEnabled();
  const point = await create.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    return { x, y, hit: button.contains(document.elementFromPoint(x, y)) };
  });
  expect(point.hit).toBe(true);
  await page.mouse.click(point.x, point.y, { delay: 32 });
  await expect(page.locator(".folder-heading-toggle")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "新建文件夹", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
}

test("桌面侧栏展开完成才提供稳定可命中的项目操作", async ({ page }) => {
  await page.goto("/");
  // Stretch the existing motion so the intermediate state can be sampled.
  await page.addStyleTag({ content: ":root { --motion-sidebar: 1200ms; }" });
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await sidebar
    .getByRole("button", { name: "展开侧边栏", exact: true })
    .click();
  await expect
    .poll(() =>
      sidebar.evaluate((rail) =>
        rail.getAnimations().some((animation) => {
          const timing = animation.effect?.getComputedTiming();
          return (
            animation.playState === "running" &&
            typeof timing?.progress === "number" &&
            timing.progress > 0 &&
            timing.progress < 1
          );
        }),
      ),
    )
    .toBe(true);
  await expect(
    sidebar.getByRole("button", {
      name: "创建项目文件夹",
      exact: true,
      includeHidden: true,
    }),
  ).toBeHidden();
  await createFolderOnce(page);
  const geometry = await sidebar.evaluate((rail) => ({
    width: rail.getBoundingClientRect().width,
    expectedWidth: parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--sidebar-width",
      ),
    ),
    scrollLeft: rail.querySelector(".project-groups")!.scrollLeft,
  }));
  expect(geometry.width).toBeCloseTo(geometry.expectedWidth, 0);
  expect(geometry.scrollLeft).toBe(0);
});

test("减少动态效果时侧栏项目操作立即可用", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: ":root { --motion-sidebar: 1200ms; }" });
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await sidebar
    .getByRole("button", { name: "展开侧边栏", exact: true })
    .click();
  expect(
    await sidebar.evaluate((rail) =>
      rail
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    ),
  ).toBe(false);
  await createFolderOnce(page);
});

for (const width of [390, 1099]) {
  test(`窄屏侧栏保留可用的项目创建 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
    if (width === 390) {
      await page
        .getByRole("button", { name: "应用功能菜单", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "展开 / 收起侧边栏", exact: true })
        .click();
    } else {
      await sidebar
        .getByRole("button", { name: "展开侧边栏", exact: true })
        .click();
    }
    await createFolderOnce(page);
  });
}
