import { expect, test, type Locator } from "@playwright/test";
import { expandSidebar, openWorkspace } from "./helpers";

test.use({ reducedMotion: "reduce" });

async function inlineGlyph(button: Locator) {
  await expect(button).toBeVisible();
  await expect(button.locator("img")).toHaveCount(0);
  await expect(button.locator("svg")).toHaveCount(1);
  expect(
    await button.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const glyph = element.querySelector("svg")!.getBoundingClientRect();
      return {
        drawn:
          glyph.width > 0 &&
          glyph.height > 0 &&
          Boolean(
            element.querySelector("svg path, svg rect, svg circle, svg line"),
          ),
        hit: element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        ),
      };
    }),
  ).toEqual({ drawn: true, hit: true });
}

for (const width of [320, 390]) {
  test(`${width}px 四项导航等宽居中悬浮，所有关键图标可点击`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await openWorkspace(page);
    const dock = page.getByRole("navigation", { name: "主导航" });
    await expect(dock.getByRole("button")).toHaveCount(4);
    const geometry = await dock.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return {
        box: box.toJSON(),
        radius: parseFloat(css.borderTopLeftRadius),
        blur: css.backdropFilter,
        buttons: [...element.querySelectorAll("button")].map((button) =>
          button.getBoundingClientRect().toJSON(),
        ),
      };
    });
    expect(geometry.box.left).toBeGreaterThanOrEqual(8);
    expect(width - geometry.box.right).toBeGreaterThanOrEqual(8);
    expect(844 - geometry.box.bottom).toBeGreaterThanOrEqual(8);
    expect(
      Math.abs(geometry.box.left + geometry.box.width / 2 - width / 2),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        (geometry.buttons[0].left + geometry.buttons[3].right) / 2 - width / 2,
      ),
    ).toBeLessThanOrEqual(1);
    expect(geometry.radius).toBeGreaterThanOrEqual(geometry.box.height / 2 - 1);
    expect(geometry.blur).not.toBe("none");
    for (const box of geometry.buttons) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(
        Math.abs(box.width - geometry.buttons[0].width),
      ).toBeLessThanOrEqual(1);
    }
    for (const [name, surface] of [
      ["开始创作", ".start-page"],
      ["对话", ".workspace.chat-mobile .conversation-panel"],
      ["项目库", ".catalog-page-projects"],
      ["扩展", ".catalog-page-skills"],
    ]) {
      const button = dock.getByRole("button", { name, exact: true });
      await inlineGlyph(button);
      await button.click();
      await expect(page.locator(surface)).toBeVisible();
    }
    for (const selector of [
      ".mobile-search",
      ".mobile-project-switch",
      ".compact-app-trigger",
    ])
      await inlineGlyph(page.locator(selector));
    await inlineGlyph(
      page.getByRole("button", { name: "打开设置", exact: true }),
    );
    await page.locator(".mobile-project-switch").click();
    await expect(page.locator(".catalog-page-projects")).toBeVisible();
    await page.locator(".mobile-search").click();
    await expect(
      page.getByRole("dialog", { name: "搜索", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await page.locator(".compact-app-trigger").click();
    await expect(page.getByRole("menu", { name: "应用功能" })).toBeVisible();
    await page.keyboard.press("Escape");
    await dock.getByRole("button", { name: "开始创作", exact: true }).click();
    await page.screenshot({
      path: info.outputPath(`floating-home-${width}.png`),
    });
    await info.attach("dock-geometry", {
      body: JSON.stringify(geometry),
      contentType: "application/json",
    });
  });
}

test("首页模型按钮默认无边框，交互反馈与原有形状保留", async ({ page }) => {
  await page.goto("/");
  const model = page.locator(".start-model-picker > button");
  await expect(model).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  expect(
    parseFloat(
      await model.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ),
  ).toBeGreaterThan(0);
  await model.hover();
  await expect(model).not.toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await model.focus();
  await expect(model).toBeFocused();
  expect(
    await model.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
});

test("分类和菜单保留原有形状，不新增选中高亮描边", async ({ page }) => {
  await page.goto("/");
  const tab = page.getByRole("tab", { name: "创作灵感", exact: true });
  await expect(tab).toHaveCSS("border-radius", "0px");
  await expect(tab).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".start-chip-row button").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
  await page.getByRole("button", { name: "文件", exact: true }).click();
  for (const button of await page.locator(".menu-popover button").all())
    await expect(button).toHaveCSS("border-radius", "8px");
});

test("1601px 展开侧栏后技能入口完整可见且可以点击", async ({ page }, info) => {
  await page.setViewportSize({ width: 1601, height: 900 });
  await page.goto("/");
  await expandSidebar(page);
  await page.getByRole("tab", { name: "技能", exact: true }).click();
  const browse = page
    .locator(".start-skill-callout")
    .getByRole("button", { name: /浏览技能/ });
  await expect(browse).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath("home-skills-1601.png") });
  await browse.click();
  await expect(page.locator(".catalog-page-skills")).toBeVisible();
});
