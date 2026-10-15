import { expect, test } from "@playwright/test";
import { openSeededProject } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("首页没有 API 图片连接时仍可选择账号内置生图，API 目录保持空态和配置入口", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  const builtin = menu.getByRole("menuitemradio", { name: /^Codex 内置生图/ });
  await expect(menu.getByRole("menuitemradio")).toHaveCount(1);
  await expect(builtin).toHaveAttribute("aria-checked", "true");
  await expect(builtin).not.toHaveAttribute("aria-disabled", "true");
  await builtin.click();
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toContainText("Codex 内置生图");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await menu.getByRole("menuitem", { name: /^API 自定义模型/ }).click();
  await expect(menu.getByRole("menuitemradio")).toHaveCount(0);
  await expect(menu).toContainText("暂无模型");
  await expect(
    menu.getByRole("button", { name: "模型接入…", exact: true }),
  ).toBeVisible();
});

test("Figma 483 首页输入保持紧凑尺寸，额外能力仍可访问", async ({ page }) => {
  await page.goto("/");
  const composer = page.locator(".start-composer");
  const desktop = (await composer.boundingBox())!;
  expect(desktop.width).toBe(652);
  expect(desktop.height).toBeGreaterThanOrEqual(170);
  await expect(page.locator(".start-prompt-library")).toHaveCount(0);
  await expect(
    composer.getByRole("button", { name: "开始创建项目" }),
  ).toBeDisabled();
  await expect(page.getByText("先写下一句创意，再开始创建项目。")).toHaveCount(
    0,
  );
  await page.getByLabel("创作提示词").focus();
  await expect(page.getByLabel("创作提示词")).toBeFocused();
  const chooser = page.waitForEvent("filechooser");
  await composer.getByRole("button", { name: "添加参考素材" }).click();
  expect((await chooser).isMultiple()).toBe(true);
  const model = composer.getByRole("button", { name: "模型", exact: true });
  await model.click();
  const menu = composer.getByRole("menu", { name: "选择模型" });
  await expect(menu.getByLabel("生成数量")).toHaveCount(0);
  await expect(menu.getByLabel("隐私模式")).toHaveCount(0);
  await model.click();
  expect((await composer.boundingBox())!.height).toBe(desktop.height);
  await page.setViewportSize({ width: 390, height: 844 });
  const available = await page
    .locator(".start-hero")
    .evaluate((element) => element.clientWidth);
  await expect(composer).toHaveCSS("width", `${available}px`);
  const phone = (await composer.boundingBox())!;
  expect(phone.width).toBe(available);
  expect(phone.x).toBeGreaterThanOrEqual(0);
  expect(phone.x + phone.width).toBeLessThanOrEqual(390);
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
  for (const control of row) expect(control.height).toBe(32);
  expect(
    Math.max(...row.map((item) => item.y)) -
      Math.min(...row.map((item) => item.y)),
  ).toBeLessThanOrEqual(1);
});

test("首页模型弹层选择真实 API 图片模型并保存连接身份", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu", { name: "选择模型" })
    .getByRole("button", { name: "模型接入…", exact: true })
    .click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await page.getByLabel("提供商", { exact: true }).fill("星河 API");
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-key");
  await page.getByLabel("模型名称").fill("image-test");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByLabel("提供商", { exact: true }).fill("星河 API B");
  await page.getByLabel("接口地址").fill("https://models-b.example.test/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-key-b");
  await page.getByLabel("模型名称").fill("image-second");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置" }).click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await menu.getByRole("button", { name: "切换全部模型", exact: true }).click();
  const choice = page
    .getByRole("menu", { name: "选择模型" })
    .getByRole("menuitemradio", { name: /image-test.*星河 API/ });
  await expect(choice).toBeVisible();
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

test("搜索四类保持点击、方向键导航、单一选中与关闭回焦", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "搜索", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "搜索", exact: true });
  const tabs = dialog.getByRole("tablist", { name: "搜索分类" });
  await expect(tabs.getByRole("tab")).toHaveText([
    "全部",
    "画布卡片",
    "项目",
    "已加载资源",
  ]);
  const selected = (name: string) =>
    tabs.getByRole("tab", { name, exact: true });
  await selected("项目").click();
  await expect(selected("项目")).toHaveAttribute("aria-selected", "true");
  await expect(
    dialog.getByRole("tabpanel", { name: "项目", exact: true }),
  ).toBeVisible();
  await selected("项目").focus();
  await selected("项目").press("End");
  await expect(selected("已加载资源")).toBeFocused();
  await expect(selected("已加载资源")).toHaveAttribute("aria-selected", "true");
  await selected("已加载资源").press("Home");
  await expect(selected("全部")).toBeFocused();
  await selected("全部").press("ArrowRight");
  await expect(selected("画布卡片")).toBeFocused();
  await expect(selected("画布卡片")).toHaveAttribute("aria-selected", "true");
  await selected("画布卡片").press("ArrowLeft");
  await expect(selected("全部")).toBeFocused();
  await expect(selected("全部")).toHaveAttribute("aria-selected", "true");
  await expect(tabs.locator('[aria-selected="true"]')).toHaveCount(1);
  await expect(tabs.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(tabs.locator('[tabindex="-1"]')).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("Figma 483 画布输入与模型菜单采用独立尺寸", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1038 });
  await openSeededProject(page);
  await page.locator(".image-preview").click();
  const composer = page.getByTestId("image-composer");
  await page.screenshot({
    path: test
      .info()
      .outputPath(
        "changes/2026-09-24-ui-regression/evidence/web-canvas-composer-1440.png",
      ),
  });
  await composer.screenshot({
    path: test
      .info()
      .outputPath(
        "changes/2026-09-24-ui-regression/evidence/web-canvas-composer-component.png",
      ),
  });
  const frame = (await composer.boundingBox())!;
  expect(frame.width).toBe(590);
  expect(frame.height).toBe(237);
  await expect(composer).toHaveCSS("border-radius", "30px");
  const modelButton = composer.locator(".model-button");
  const modelGeometry = await modelButton.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const label = button.querySelector<HTMLElement>(".model-name")!;
    const style = getComputedStyle(button);
    const hit = document.elementFromPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    return {
      width: box.width,
      height: box.height,
      labelWidth: label.clientWidth,
      fullLabelWidth: label.scrollWidth,
      fontSize: parseFloat(style.fontSize),
      alignment: style.justifyContent,
      hit: hit === button || (hit !== null && button.contains(hit)),
    };
  });
  expect(modelGeometry.width).toBeGreaterThanOrEqual(32);
  expect(modelGeometry.width).toBeLessThanOrEqual(260);
  expect(modelGeometry.height).toBe(32);
  expect(modelGeometry.labelWidth).toBeGreaterThanOrEqual(
    modelGeometry.fullLabelWidth,
  );
  expect(modelGeometry.fontSize).toBeGreaterThanOrEqual(12);
  expect(modelGeometry.alignment).toBe("center");
  expect(modelGeometry.hit).toBe(true);
  expect((await composer.locator(".image-params").boundingBox())!.width).toBe(
    119,
  );
  await composer.getByRole("button", { name: "画布模型" }).click();
  const menu = composer.getByRole("menu", { name: "选择模型" });
  const box = (await menu.boundingBox())!;
  expect(box.width).toBe(320);
  expect(box.height).toBeGreaterThan(64);
  expect(box.height).toBeLessThanOrEqual(520);
  await page.screenshot({
    path: test
      .info()
      .outputPath(
        "changes/2026-09-24-ui-regression/evidence/web-canvas-composer-model-1440.png",
      ),
  });
  await menu.screenshot({
    path: test
      .info()
      .outputPath(
        "changes/2026-09-24-ui-regression/evidence/web-canvas-model-menu-component.png",
      ),
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
