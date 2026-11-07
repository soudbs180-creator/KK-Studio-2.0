import { expect, test } from "@playwright/test";
import {
  expectApproxCssPx,
  openSettingsSection,
  openWorkspace,
  showCanvasNavigation,
  waitForConversationPanelSettled,
} from "./helpers";

for (const width of [390, 1099, 1920]) {
  test(`当前Figma首页参数不误提交且草稿重载保留 ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await page
      .getByLabel("创作提示词", { exact: true })
      .fill("保留当前参数草稿");
    const more = page.getByRole("button", {
      name: "更多创作选项",
      exact: true,
    });
    if (width === 390) {
      await expect(more).toHaveCSS("width", "32px");
      await more.click();
    }
    const count = page.getByRole("button", { name: "生成数量", exact: true });
    await count.click();
    await page.getByRole("button", { name: "生成 2 个", exact: true }).click();
    await expect(count).toContainText("2");
    await expect(page.getByRole("region", { name: "无限画布" })).toHaveCount(0);
    if (width === 390) {
      await more.click();
      await more.click();
      await expect(
        page.getByRole("dialog", { name: "生成数量选项", exact: true }),
      ).toHaveCount(0);
      await count.click();
      await page.keyboard.press("Escape");
      await expect(count).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(more).toBeFocused();
      const boxes = await page
        .locator(".start-composer-footer button")
        .evaluateAll((buttons) =>
          buttons
            .filter((button) => button.getClientRects().length)
            .map((button) => {
              const b = button.getBoundingClientRect();
              return { x: b.x, right: b.right, y: b.y + b.height / 2 };
            }),
        );
      expect(boxes).toHaveLength(4);
      expect(
        Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)),
      ).toBeLessThanOrEqual(1);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(24);
        expect(box.right).toBeLessThanOrEqual(width - 24);
      }
    }
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("kk-studio-next:creation:v1")),
      )
      .toContain('"outputCount":2');
    await page.reload();
    await expect(page.getByLabel("创作提示词", { exact: true })).toHaveValue(
      "保留当前参数草稿",
    );
    if (width === 390) await more.click();
    await expect(count).toContainText("2");
    await page.screenshot({ path: info.outputPath(`home-${width}.png`) });
  });

  test(`当前Figma设置分组和真实主题偏好 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await openSettingsSection(page, "通用设置");
    const appearance = page.getByRole("region", {
      name: "外观与语言",
      exact: true,
    });
    const creation = page.getByRole("region", {
      name: "创作偏好",
      exact: true,
    });
    await expect(appearance).toBeVisible();
    await expect(creation).toBeVisible();
    for (const section of [appearance, creation]) {
      await expect(section).toHaveCSS("border-top-width", "0px");
      await expect(section).toHaveCSS("padding", "0px");
    }
    const theme = page.getByRole("combobox", { name: "主题外观", exact: true });
    await theme.selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page
      .getByRole("combobox", { name: "强调色", exact: true })
      .selectOption("blue");
    await page.getByRole("button", { name: "管理快捷键", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "快捷键管理", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await page.reload();
    await openSettingsSection(page, "通用设置");
    await expect(theme).toHaveValue("light");
    await expect(
      page.getByRole("combobox", { name: "强调色", exact: true }),
    ).toHaveValue("blue");
    await page.screenshot({ path: info.outputPath(`settings-${width}.png`) });
  });

  test(`当前Figma画布控件与吸附持久状态 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1080 });
    await openWorkspace(page);
    if (width === 1920) {
      await expect(page.locator(".conversation-header-row")).toHaveCSS(
        "height",
        "44px",
      );
      for (const button of await page
        .locator(".conversation-header-actions button")
        .all()) {
        await expect(button).toHaveCSS("width", "32px");
        await expect(button.locator("svg")).toHaveCSS("width", "16px");
      }
    }
    await showCanvasNavigation(page);
    const group = page.getByRole("radiogroup", {
      name: "视图切换",
      exact: true,
    });
    await expectApproxCssPx(group, "width", 116);
    await expect(group).toHaveCSS("height", "36px");
    await expect(
      group.getByRole("radio", { name: "画布", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    const browser = group.getByRole("radio", { name: "浏览器", exact: true });
    await expect(browser).toBeDisabled();
    await expect(browser).toHaveAttribute("title", "浏览器视图暂不可用");
    await expect(
      page.getByRole("group", { name: "画布导航", exact: true }),
    ).toHaveCSS("height", "36px");
    if (width === 1920)
      await expect(
        page.getByRole("group", { name: "画布导航", exact: true }),
      ).toHaveCSS("width", "281px");
    for (const button of await page
      .locator(".canvas-navigation-tools button")
      .all()) {
      await expect(button).toHaveCSS("height", "32px");
      await expect(button.locator("svg")).toHaveCSS("width", "16px");
    }
    const snap = page.getByRole("button", { name: "网格吸附", exact: true });
    const before = await snap.getAttribute("aria-pressed");
    await snap.click();
    await expect(snap).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
    await showCanvasNavigation(page);
    await expect(snap).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
    await waitForConversationPanelSettled(page);
    await page.screenshot({ path: info.outputPath(`canvas-${width}.png`) });
  });
}

test("Figma首页三封面和设计字体实际加载", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (font) =>
          font.family === "Source Han Sans CN VF" && font.status === "loaded",
      ),
    ),
  ).toBe(true);
  const covers = page.locator(".start-inspiration-card img");
  await expect(covers).toHaveCount(3);
  expect(
    await covers.evaluateAll((images) =>
      images.map((image) => image.getAttribute("src")),
    ),
  ).toEqual([
    "/fixtures/demo/blue-hour.png",
    "/design/figma/home-inspiration-product.png",
    "/design/figma/home-inspiration-mv.png",
  ]);
  await expect
    .poll(() =>
      covers.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  const logo = page.locator("[data-brand-logo=hero]");
  await expect(logo).toHaveCSS("width", "64px");
  await expect(logo).toHaveCSS("height", "64px");
  await page.screenshot({
    path: info.outputPath("home-figma-resources-1440.png"),
  });
});
