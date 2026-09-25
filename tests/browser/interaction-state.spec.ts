import { expect, test } from "@playwright/test";
import { openSeededProject, showCanvasNavigation } from "./helpers";

const openWorkspace = openSeededProject;

test("画布背景在点和网格之间切换，缩放到最小时降低点阵密度", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const canvas = page.getByTestId("infinite-canvas");
  const pattern = page.getByRole("button", { name: "切换为网格背景" });
  await expect(pattern).toHaveAttribute("aria-pressed", "false");
  await expect(pattern.locator("img")).toHaveAttribute(
    "src",
    "/design/figma/nav-background.svg",
  );
  await pattern.click();
  const dots = page.getByRole("button", { name: "切换为点状背景" });
  await expect(dots).toHaveAttribute("aria-pressed", "true");
  await expect(dots.locator("img")).toHaveAttribute(
    "src",
    "/design/figma/canvas-dots.svg",
  );
  await expect(canvas).toHaveClass(/canvas-pattern-grid/);
  await expect(canvas).toHaveCSS("background-image", /linear-gradient/);
  await expect(canvas).toHaveCSS("background-color", "rgb(10, 10, 10)");
  const panelPattern = await page
    .locator(".conversation-panel")
    .evaluate(
      (element) => getComputedStyle(element, "::before").backgroundImage,
    );
  // Figma 1:8090 has an opaque panel; changing the canvas background must
  // not add the canvas pattern to the conversation surface.
  expect(panelPattern).toBe("none");
});

test("视频声音默认关闭，关联连线随选中节点流动", async ({ page }) => {
  await openWorkspace(page);
  const video = page.getByTestId("canvas-node-video1");
  await video.focus();
  await page.keyboard.press("Enter");
  const voice = page.getByRole("button", { name: "视频声音" });
  await expect(voice).toHaveAttribute("aria-pressed", "false");

  const image = page.getByTestId("canvas-node-image");
  await image.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".connection.is-related")).toHaveCount(2);
  for (const path of await page
    .locator(
      ".connection.is-related .canvas-connectors > path:not(.connection-hit)",
    )
    .all()) {
    await expect(path).toHaveCSS("stroke", "rgb(58, 58, 64)");
    await expect(path).toHaveCSS("stroke-width", "2px");
  }
  await expect(
    page.locator(".connection.is-related .connection-particles circle"),
  ).toHaveCount(6);
  await video.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".connection.is-related")).toHaveCount(1);
  await expect(
    page.locator(".connection.is-related .connection-particles circle"),
  ).toHaveCount(3);
});

test("图片和视频占位图共享统一视觉尺寸", async ({ page }) => {
  await openWorkspace(page);
  for (const selector of [
    '[data-testid="canvas-node-image"] .image-symbol',
    '[data-testid="canvas-node-video1"] .video-symbol',
  ]) {
    const icon = page.locator(selector);
    await expect(icon).toHaveCSS("width", "56px");
    await expect(icon).toHaveCSS("height", "56px");
    await expect(icon).toHaveCSS("opacity", "0.72");
  }
});

test("对话空态在消息区垂直居中，语音输入默认关闭且可用", async ({ page }) => {
  await openWorkspace(page);
  await page.getByLabel("执行方式").selectOption("direct");
  const messages = page.locator(".conversation-messages");
  const empty = page.locator(".conversation-empty");
  const messagesBox = (await messages.boundingBox())!;
  const emptyBox = (await empty.boundingBox())!;
  const messagesCenter = messagesBox.y + messagesBox.height / 2;
  const emptyCenter = emptyBox.y + emptyBox.height / 2;
  expect(Math.abs(emptyCenter - messagesCenter)).toBeLessThanOrEqual(2);
  const panelPattern = await page
    .locator(".conversation-panel")
    .evaluate(
      (element) => getComputedStyle(element, "::before").backgroundImage,
    );
  expect(panelPattern).toBe("none");
  const voice = page.getByRole("button", { name: "开启语音输入" });
  await expect(voice).toBeEnabled();
  await expect(voice).toHaveAttribute("aria-pressed", "false");
  await expect(voice).toHaveCSS("opacity", "1");
  // DS 1.3 separates the 32px desktop target from the 16px source glyph.
  await expect(voice).toHaveCSS("height", "32px");
  await expect(voice.locator("img")).toHaveAttribute(
    "src",
    "/design/figma/mic-off.svg",
  );
  await expect(page.locator(".chat-composer textarea")).toHaveCSS(
    "font-size",
    "14px",
  );
  await expect(page.locator(".chat-composer textarea")).toHaveCSS(
    "line-height",
    "20px",
  );
  const mode = page.getByRole("button", { name: "AI权限模式" });
  await expect(mode).toHaveText("自动");
  await mode.click();
  const modeMenu = page.getByRole("menu");
  await expect(modeMenu).toBeVisible();
  await modeMenu.getByRole("menuitemradio", { name: "自动" }).click();
  await expect(mode).toHaveText("自动");
  await expect(page.getByRole("status")).toContainText("自动模式");
});

test("画布工具栏分隔线保持竖向居中", async ({ page }) => {
  await openWorkspace(page);
  const toolbar = page.getByRole("toolbar", { name: "画布工具" });
  const toolbarBox = (await toolbar.boundingBox())!;
  const dividers = toolbar.locator(":scope > .toolbar-divider");
  await expect(dividers).toHaveCount(2);
  for (const divider of await dividers.all()) {
    const box = (await divider.boundingBox())!;
    // Figma source uses a zero-width layout slot with a 2x18px painted line
    // centered one pixel into that slot (node 309:1774 / Line 3).
    expect(box.width).toBe(0);
    expect(box.height).toBe(20);
    const line = await divider.evaluate((node) => {
      const style = getComputedStyle(node, "::before");
      return { width: style.width, height: style.height };
    });
    expect(line.width).toBe("2px");
    expect(line.height).toBe("18px");
    expect(
      Math.abs(box.y + box.height / 2 - (toolbarBox.y + toolbarBox.height / 2)),
    ).toBeLessThanOrEqual(1);
  }
});

test("画布工具栏菜单沿用Figma原稿尺寸", async ({ page }) => {
  await openWorkspace(page);
  const toolbar = page.getByRole("toolbar", { name: "画布工具" });
  await toolbar.locator(".toolbar-toggle").click();
  const toolMenu = toolbar.locator(".canvas-tool-menu");
  await expect(toolMenu).toBeVisible();
  expect((await toolMenu.boundingBox())!).toMatchObject({
    width: 90,
    height: 50,
  });
  await page.keyboard.press("Escape");
  await toolbar.locator(".toolbar-help").click();
  const helpMenu = toolbar.locator(".canvas-help-menu");
  await expect(helpMenu).toBeVisible();
  expect((await helpMenu.boundingBox())!).toMatchObject({
    width: 103,
    height: 50,
  });
});

test("侧栏收起后展开入口回到品牌位并隐藏兔子标志", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "收起侧边栏" }).click();
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar.locator(".brand .logo")).toBeHidden();
  const toggle = sidebar.getByRole("button", { name: "展开侧边栏" });
  const brand = await sidebar.locator(".brand").boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox!.y).toBeGreaterThanOrEqual(brand!.y);
  expect(toggleBox!.y).toBeLessThan(brand!.y + brand!.height + 12);
});

test("真实未分组项目可改名，删除需要确认", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "创建未分组项目" }).click();
  const project = page.locator(".project-entry").first();
  await project.getByRole("textbox", { name: "项目名称" }).fill("初始项目");
  await project.getByRole("textbox", { name: "项目名称" }).press("Enter");
  await expect(project.getByRole("button", { name: "置顶项目" })).toBeVisible();
  await project.getByRole("button", { name: "更多项目设置" }).click();
  const menu = page.getByRole("menu", { name: "项目设置" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "改名字" }).click();
  await project.getByRole("textbox", { name: "项目名称" }).fill("新项目");
  await project.getByRole("textbox", { name: "项目名称" }).press("Enter");
  await expect(project.getByRole("button", { name: /新项目/ })).toBeVisible();
  await project.getByRole("button", { name: "更多项目设置" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("menuitem", { name: "删除项目" }).click();
  await expect(page.locator(".project-entry")).toHaveCount(0);
});

test("文案卡四种写作方式实际更新指令", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "从图片创建卡片添加下游" }).click();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-text-/).nth(0);
  await expect(node).toBeVisible();
  await node.focus();
  await page.keyboard.press("Enter");
  const card = node.locator(".prompt-creation");
  await expect(card.locator(".prompt-presets button")).toHaveCount(4);
  await expect(
    card.getByText("写作指令可直接编辑", { exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "剧本生成", exact: true }).click();
  await expect(card.getByLabel("文案提示词")).toHaveValue(/请.*剧本/);
});
