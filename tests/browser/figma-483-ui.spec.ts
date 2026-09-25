import { expect, test } from "@playwright/test";
import { openSeededProject } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("Figma 483 首页输入保持紧凑尺寸，额外能力仍可访问", async ({ page }) => {
  await page.goto("/");
  const composer = page.locator(".start-composer");
  const desktop = (await composer.boundingBox())!;
  expect(desktop.width).toBe(652);
  expect(desktop.height).toBeGreaterThanOrEqual(170);
  await expect(page.locator(".start-prompt-library")).toHaveCount(0);
  await composer.getByRole("button", { name: "开始创建项目" }).click();
  await expect(page.getByText("先写下一句创意，再开始创建项目。")).toHaveCount(
    0,
  );
  await expect(page.getByLabel("创作提示词")).toBeFocused();
  const add = composer.getByRole("button", { name: "添加素材与生成设置" });
  await add.click();
  const options = composer.getByRole("dialog", {
    name: "添加素材与生成设置",
  });
  await expect(options.getByLabel("生成数量")).toBeVisible();
  await expect(options.getByLabel("隐私模式")).toBeVisible();
  await expect(
    options.getByRole("button", { name: "插件（MCP）" }),
  ).toBeVisible();
  await expect(
    options.getByRole("button", { name: "伙伴（智能体）" }),
  ).toBeVisible();
  await options.getByLabel("生成数量").selectOption("4");
  await add.click();
  expect((await composer.boundingBox())!.height).toBe(desktop.height);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await composer.boundingBox())?.width)
    .toBe(306);
  const phone = (await composer.boundingBox())!;
  expect(phone.width).toBe(306);
  expect(phone.height).toBeGreaterThanOrEqual(170);
  const row = await composer
    .locator(".start-composer-footer")
    .evaluate((footer) =>
      [
        ".start-add-button",
        ".start-model-picker > button",
        ".composer-ext-skill > button",
        ".start-mic-button",
        ".start-mode-button",
        ".start-submit-button",
      ].map((selector) => {
        const rect = footer.querySelector(selector)!.getBoundingClientRect();
        return { x: rect.x, y: rect.y, height: rect.height };
      }),
    );
  expect(row.slice(0, 3).map((item) => item.x)).toEqual(
    [...row.slice(0, 3).map((item) => item.x)].sort((a, b) => a - b),
  );
  expect(row.slice(3).map((item) => item.x)).toEqual(
    [...row.slice(3).map((item) => item.x)].sort((a, b) => a - b),
  );
  for (const control of row) expect(control.height).toBeGreaterThanOrEqual(44);
});

test("首页模型弹层选择真实 API 图片模型并保存连接身份", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu", { name: "选择模型" })
    .getByRole("button", { name: /配置供应商与模型/ })
    .click();
  await page.getByLabel("供应商名称", { exact: true }).fill("星河 API");
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置" }).click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const choice = page
    .getByRole("menu", { name: "选择模型" })
    .getByRole("menuitemradio", { name: /image-test.*星河 API/ });
  await expect(choice).toBeVisible();
  const menu = page.getByRole("menu", { name: "选择模型" });
  const options = menu.getByRole("menuitemradio");
  expect(await options.count()).toBeGreaterThan(1);
  await options.first().focus();
  await options.first().press("End");
  await expect(options.last()).toBeFocused();
  await options.last().press("Home");
  await expect(options.first()).toBeFocused();
  await options.first().press("ArrowDown");
  await expect(options.nth(1)).toBeFocused();
  await options.nth(1).press("ArrowUp");
  await expect(options.first()).toBeFocused();
  const search = menu.getByRole("searchbox", { name: "搜索模型" });
  await search.fill("image");
  await search.press("ArrowLeft");
  await expect(search).toBeFocused();
  expect(
    await search.evaluate(
      (input) => (input as HTMLInputElement).selectionStart,
    ),
  ).toBe(4);
  await search.press("Home");
  expect(
    await search.evaluate(
      (input) => (input as HTMLInputElement).selectionStart,
    ),
  ).toBe(0);
  await search.clear();
  await choice.click();
  await page.reload();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await expect(
    page
      .getByRole("menu", { name: "选择模型" })
      .getByRole("menuitemradio", { name: /image-test.*星河 API/ }),
  ).toHaveAttribute("aria-checked", "true");
});

test("搜索分类指示线沿底边移动，顶部手柄保持静态", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const tabs = page.getByRole("tablist", { name: "搜索分类" });
  const marker = tabs.locator(".catalog-tab-indicator");
  const first = (await marker.boundingBox())!;
  const tabBox = (await tabs.boundingBox())!;
  expect(
    Math.abs(first.y + first.height - tabBox.y - tabBox.height),
  ).toBeLessThan(2);
  await tabs.getByRole("tab", { name: "项目", exact: true }).click();
  const next = (await marker.boundingBox())!;
  const selected = (await tabs
    .getByRole("tab", { name: "项目" })
    .boundingBox())!;
  expect(next.x).toBeGreaterThan(first.x);
  expect(Math.abs(next.x - selected.x)).toBeLessThan(1);
  await expect(tabs.getByRole("tab", { name: "项目" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".catalog-handle")).toHaveCSS(
    "background-color",
    "rgb(133, 133, 133)",
  );
});

test("Figma 483 画布输入与模型菜单采用独立尺寸", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1038 });
  await openSeededProject(page);
  await page.locator(".image-preview").click();
  const composer = page.getByTestId("image-composer");
  await page.screenshot({
    path: "docs/changes/2026-09-24-ui-regression/evidence/web-canvas-composer-1440.png",
  });
  await composer.screenshot({
    path: "docs/changes/2026-09-24-ui-regression/evidence/web-canvas-composer-component.png",
  });
  const frame = (await composer.boundingBox())!;
  expect(frame.width).toBe(590);
  expect(frame.height).toBe(237);
  await expect(composer).toHaveCSS("border-radius", "30px");
  expect((await composer.locator(".model-button").boundingBox())!.width).toBe(
    106,
  );
  expect((await composer.locator(".image-params").boundingBox())!.width).toBe(
    119,
  );
  await composer.getByRole("button", { name: "画布模型" }).click();
  const menu = composer.getByRole("menu", { name: "选择模型" });
  const box = (await menu.boundingBox())!;
  expect(box.width).toBe(227);
  expect(box.height).toBe(318);
  await page.screenshot({
    path: "docs/changes/2026-09-24-ui-regression/evidence/web-canvas-composer-model-1440.png",
  });
  await menu.screenshot({
    path: "docs/changes/2026-09-24-ui-regression/evidence/web-canvas-model-menu-component.png",
  });
  const title = (await menu
    .locator(".kk-model-menu-top > strong")
    .boundingBox())!;
  const search = (await menu.getByRole("searchbox").boundingBox())!;
  expect(
    Math.abs(title.y + title.height / 2 - search.y - search.height / 2),
  ).toBeLessThan(1);
});

test("手机首页对话入口创建空白上下文并由同一按钮收起", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const chatTab = page.getByRole("button", { name: "对话", exact: true });
  await chatTab.click();
  await expect(page.locator(".workspace-content")).toBeVisible();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await expect(chatTab).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".image-preview")).toHaveCount(0);
  await chatTab.click();
  await expect(page.locator(".conversation-panel")).toBeHidden();
  await expect(chatTab).not.toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "应用功能菜单" }).click();
  await page
    .getByRole("menu", { name: "应用功能" })
    .getByRole("menuitem", { name: "展开 / 收起对话" })
    .click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await expect(chatTab).toHaveAttribute("aria-current", "page");
});

for (const width of [834, 1920]) {
  test(`对话保持展开且 ${width}px 开关前后坐标一致`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 834 ? 900 : 1080 });
    await openSeededProject(page);
    const panel = page.locator(".conversation-panel");
    const close = panel.getByRole("button", { name: "收起对话" });
    if (await close.isVisible()) await close.click();
    const opener = page.getByRole("button", { name: "打开对话" });
    const before = (await opener.boundingBox())!;
    const sidebarToggle = (await page
      .locator(".sidebar-toggle")
      .boundingBox())!;
    expect(
      Math.abs(
        sidebarToggle.y +
          sidebarToggle.height / 2 -
          before.y -
          before.height / 2,
      ),
    ).toBeLessThanOrEqual(1);
    for (const name of ["打开任务列表", "画布缩放", "整理画布"]) {
      const control = (await page.getByRole("button", { name }).boundingBox())!;
      expect(
        Math.abs(control.y + control.height / 2 - before.y - before.height / 2),
      ).toBeLessThanOrEqual(1);
    }
    await opener.click();
    await expect(panel).toBeVisible();
    await page.locator(".topbar").click({ position: { x: 8, y: 8 } });
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeVisible();
    const after = (await close.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(0.5);
    await close.click();
    await expect(panel).toBeHidden();
  });
}
