import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("A2 目录卡在桌面和手机共用页面类型几何", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const name of ["Skill", "ComfyUI 工作流"]) {
    await page
      .locator(".sidebar")
      .getByRole("button", { name, exact: true })
      .click();
    const grid = page.locator(".catalog-card-grid").first();
    const card = grid.locator(".catalog-card").first();
    await expect(grid).toHaveCSS("column-gap", "16px");
    await expect(card).toHaveCSS("border-radius", "12px");
    await expect(card.locator(".catalog-card-body")).toHaveCSS(
      "padding",
      "12px",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(card).toHaveCSS("border-radius", "12px");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("搜索面板采用面板、输入与列表各自的圆角档位", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const panel = page.getByTestId("catalog-panel");
  await expect(panel).toHaveCSS("border-radius", "20px");
  await expect(panel.locator(".catalog-search")).toHaveCSS(
    "border-radius",
    "10px",
  );
  await expect(panel.locator(".catalog-tabs button").first()).toHaveCSS(
    "height",
    "40px",
  );
  await expect(panel.locator(".catalog-result").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toHaveCSS("border-radius", "20px");
  await expect(panel.locator(".catalog-search")).toHaveCSS(
    "border-radius",
    "10px",
  );
});

test("A1 资产画廊在桌面和手机使用可读的卡片与控件档位", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    if (width === 390) {
      await page.getByRole("button", { name: "应用功能菜单" }).click();
      await page.getByRole("menuitem", { name: "资产管理" }).click();
    } else {
      await page
        .getByRole("navigation", { name: "应用菜单" })
        .getByRole("button", { name: "文件", exact: true })
        .click();
      await page.getByRole("button", { name: "资产管理", exact: true }).click();
    }
    const panel = page.getByTestId("asset-panel");
    const card = panel.locator(".asset-card").first();
    await expect(panel.locator(".asset-content")).toHaveCSS(
      "column-gap",
      "12px",
    );
    await expect(card).toHaveCSS("border-radius", "12px");
    await expect(card).toHaveCSS("padding", "4px");
    await expect(card.locator(".asset-thumbnail")).toHaveCSS(
      "border-radius",
      "8px",
    );
    await expect(card.locator(".asset-name")).toHaveCSS("font-size", "11px");
    await expect(panel.locator(".asset-search-row")).toHaveCSS(
      "height",
      "32px",
    );
    await expect(panel.locator(".asset-filters select").first()).toHaveCSS(
      "height",
      "28px",
    );
    const filters = await panel.locator(".asset-filters").boundingBox();
    const content = await panel.locator(".asset-content").boundingBox();
    expect(filters && content && filters.y + filters.height <= content.y).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await panel
      .getByRole("textbox", { name: "搜索文件" })
      .fill("no-assets-ui-architecture");
    await expect(panel.locator(".asset-empty")).toBeVisible();
    await expect(panel.locator(".asset-empty .primary-button")).toHaveCSS(
      "min-height",
      "40px",
    );
  }
});

test("提示词库空态只提供一个明确的加载入口", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    if (width === 390) {
      await page.getByRole("button", { name: "应用功能菜单" }).click();
      await page.getByRole("menuitem", { name: "提示词库" }).click();
    } else {
      await page
        .getByRole("navigation", { name: "应用菜单" })
        .getByRole("button", { name: "文件", exact: true })
        .click();
      await page.getByRole("button", { name: "提示词库", exact: true }).click();
    }
    const dialog = page.getByRole("dialog", { name: "提示词库" });
    await expect(dialog.locator(".prompt-library-empty")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "加载来源" })).toHaveCount(
      1,
    );
    await expect(dialog.locator(".prompt-library-detail")).toHaveCount(0);
    const bounds = await dialog.locator(".prompt-library-empty").boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(240);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }
});

test("A2 提示词卡与 A4 预览使用目录卡档位", async ({ page }) => {
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      json: [
        {
          id: "architecture",
          title: "光影场景",
          prompt: "柔和的侧光与清晰的主体轮廓",
          tags: ["产品"],
        },
      ],
    }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "应用菜单" })
    .getByRole("button", { name: "文件", exact: true })
    .click();
  await page.getByRole("button", { name: "提示词库", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "提示词库" });
  await dialog.getByRole("button", { name: "加载来源" }).click();
  const card = dialog.locator(".prompt-library-item").first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS("border-radius", "12px");
  await expect(card).toHaveCSS("padding", "12px");
  await expect(card.locator(".prompt-library-item-description")).toHaveCSS(
    "font-size",
    "12px",
  );
  await card.click();
  await expect(dialog.locator(".prompt-library-detail")).toBeVisible();
});
