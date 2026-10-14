import { test, expect } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("资产搜索、空态恢复、列表、紧凑视图及创建主体", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("width", "900px");
  await expect(panel).toHaveCSS("height", "696px");
  await panel.screenshot({ path: "test-results/runtime/assets-desktop.png" });
  await page.getByRole("textbox", { name: "搜索文件" }).fill("找不到");
  await expect(page.getByText("没有找到匹配的资产")).toBeVisible();
  await panel.screenshot({ path: "test-results/runtime/assets-empty.png" });
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await expect(page.locator(".asset-card")).toHaveCount(9);
  await page.getByLabel("类型筛选").selectOption("video");
  await expect(page.locator(".asset-card")).toHaveCount(0);
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await page.getByRole("button", { name: "列表视图" }).click();
  await expect(page.locator(".asset-content")).toHaveClass(/list/);
  await page.getByRole("button", { name: "网格视图" }).click();
  await page.getByRole("button", { name: "收起资产管理" }).click();
  expect(await panel.boundingBox()).toMatchObject({ width: 305 });
  const thumbnail = await page
    .locator(".asset-thumbnail")
    .first()
    .boundingBox();
  expect(Math.abs(thumbnail!.width - thumbnail!.height)).toBeLessThan(2);
  const firstCard = await page.locator(".asset-card").first().boundingBox();
  const secondRow = await page.locator(".asset-card").nth(2).boundingBox();
  expect(secondRow!.y).toBeGreaterThanOrEqual(firstCard!.y + firstCard!.height);
  expect(
    await page
      .locator(".asset-content")
      .evaluate((e) => e.scrollHeight > e.clientHeight),
  ).toBe(true);
  await panel.screenshot({ path: "test-results/runtime/assets-compact.png" });
  await page.getByRole("tab", { name: "资产", exact: true }).click();
  await page.getByRole("button", { name: "创建主体", exact: true }).click();
  await page.getByPlaceholder("例如：品牌代言人").fill("测试角色");
  await page.locator("form").getByRole("button", { name: "创建主体" }).click();
  await expect(
    page.getByRole("button", { name: "选择 测试角色" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "资源管理", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("设置主题保存重载、键盘关闭及导航", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await page
    .getByRole("dialog")
    .screenshot({ path: "test-results/runtime/settings-integrated.png" });
  await page.getByLabel("主题", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByLabel("主题", { exact: true }).selectOption("dark");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.getByRole("heading", { name: "项目库" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "扩展", exact: true }),
  ).toBeVisible();
});

test("未接入的通用设置明确禁用原因", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  const watermark = dialog.getByRole("switch", {
    name: "去除水印",
    exact: true,
  });
  await expect(watermark).toBeDisabled();
  await expect(
    dialog.getByText("当前模型协议未提供水印参数，暂不能影响生成结果。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.locator("img.settings-nav-icon").first()).toHaveAttribute(
    "width",
    "20",
  );
  await expect(dialog.locator("img.settings-nav-icon").first()).toHaveAttribute(
    "height",
    "20",
  );
  await expect(dialog.locator("img.settings-nav-icon").first()).toHaveCSS(
    "width",
    "20px",
  );
  await expect(dialog.locator("img.settings-nav-icon").first()).toHaveCSS(
    "height",
    "20px",
  );
});

test("模型接入使用 API 地址，连接状态真实且密钥不落盘", async ({ page }) => {
  await page.route("https://models.example.test/v1/models", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer session-key");
    await route.fulfill({ status: 200, json: { data: [] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await page.getByRole("textbox", { name: "提供商" }).fill("测试供应商");
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key", { exact: true }).fill("session-key");
  await page.getByLabel("模型名称").fill("image-model-v2");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("kk-studio-next:model-provider:v1"),
  );
  expect(saved).toContain("models.example.test");
  expect(saved).not.toContain("session-key");
  await page.getByRole("button", { name: "测试连接并刷新模型" }).click();
  await expect(
    page.getByText("已获取 0 个模型；生成能力仍需实际验证。", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "设置" })
    .screenshot({ path: "test-results/runtime/settings-model-provider.png" });
  await page.reload();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(page.getByLabel("接口地址")).toHaveValue(
    "https://models.example.test/v1",
  );
  await expect(page.getByLabel("API Key", { exact: true })).toHaveValue("");
});

test("豆包预置一次性填入名称和方舟地址", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const presets = page.locator("details.provider-presets");
  await presets.getByText("服务商预设与接口文档", { exact: true }).click();
  await presets.getByLabel("搜索服务商", { exact: true }).fill("豆包");
  await presets
    .getByRole("group", { name: "服务商预设", exact: true })
    .getByRole("button", { name: "豆包（火山方舟） OpenAI 兼容", exact: true })
    .click();
  const detail = presets.getByRole("region", { name: "预设详情", exact: true });
  await expect(detail.getByRole("link", { name: "官方网站" })).toHaveAttribute(
    "href",
    "https://www.volcengine.com/product/ark",
  );
  await expect(detail.getByRole("link", { name: "获取密钥" })).toHaveAttribute(
    "href",
    "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
  );
  await expect(detail.getByRole("link", { name: "接口文档" })).toHaveAttribute(
    "href",
    "https://www.volcengine.com/docs/82379",
  );
  await detail.getByRole("button", { name: "使用此预设", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "提供商" })).toHaveValue(
    "豆包（火山方舟）",
  );
  await expect(page.getByLabel("接口地址")).toHaveValue(
    "https://ark.cn-beijing.volces.com/api/v3",
  );
});

test("模型接入可以登记多个非敏感连接并切换当前配置", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const save = async (name: string, baseUrl: string, model: string) => {
    await page.getByRole("textbox", { name: "提供商" }).fill(name);
    await page.getByLabel("接口地址").fill(baseUrl);
    await page.getByLabel("模型名称").fill(model);
    await page.getByRole("button", { name: "保存连接", exact: true }).click();
  };
  await save("连接一", "https://one.example.test/v1", "image-one");
  await save("连接二", "https://two.example.test/v1", "image-two");
  const list = page.getByRole("region", { name: "已登记连接" });
  await expect(list).toContainText("2 个");
  await list.getByRole("listitem").first().click();
  await expect(page.getByLabel("接口地址")).toHaveValue(
    "https://one.example.test/v1",
  );
  await expect(page.getByLabel("模型名称")).toHaveValue("image-one");
  const metadata = await page.evaluate(() =>
    localStorage.getItem("kk-studio-next:provider-connections:v1"),
  );
  expect(metadata).toContain("one.example.test");
  expect(metadata).toContain("two.example.test");
  expect(metadata).not.toContain("session-key");
});

test("本地导入成功与错误恢复，不伪造生成和回复", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  await page.getByRole("tab", { name: "资产", exact: true }).click();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.locator(".asset-feedback")).toBeVisible();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({
      name: "pack.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          assets: [
            {
              id: "x",
              name: "导入测试",
              type: "subject",
              tag: "产品",
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    });
  await expect(page.getByText("已导入 1 项 · 本次会话可用")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".image-preview").click();
  await page.getByLabel("图片提示词").fill("一个白色风扇");
  await page.getByRole("button", { name: "生成数量", exact: true }).click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "生成图片", exact: true }),
  ).toBeDisabled();
  await page
    .getByTestId("image-composer")
    .getByRole("button", { name: "前往模型设置", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "模型接入", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("图片提示词")).toHaveValue("一个白色风扇");
  await expect(
    page.locator(".demo-result-node[data-source=demo][data-kind=image]"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByLabel("执行方式").selectOption("direct");
  await page.getByLabel("对话内容").fill("你好");
  await expect(page.getByRole("button", { name: "发送消息" })).toBeDisabled();
  await page
    .locator(".conversation-panel")
    .getByRole("button", { name: "前往模型设置", exact: true })
    .click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(page.getByLabel("API Key", { exact: true })).toBeVisible();
  await expect(page.getByLabel("对话内容")).toHaveValue("你好");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
});

test("无限画布隐藏滚动条，卡片拖动时连接线跟随", async ({ page }) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  await expect(canvas).toBeVisible();
  expect(await canvas.boundingBox()).toEqual({
    x: 291,
    y: 45,
    width: 1619,
    height: 1025,
  });
  expect(await page.locator(".image-preview").boundingBox()).toEqual({
    // Latest Figma card geometry places the 400px image body at x=94 in the
    // node; at this viewport the world transform resolves to x=468.
    x: 468,
    y: 211,
    width: 400,
    height: 400,
  });
  expect(await page.locator(".task-button").boundingBox()).toEqual({
    x: 321,
    y: 72,
    width: 93,
    height: 30,
  });
  expect(await page.locator(".conversation-panel").boundingBox()).toEqual({
    x: 1430,
    y: 61,
    width: 470,
    height: 998,
  });
  expect(await page.getByTestId("canvas-node-video1").boundingBox()).toEqual({
    x: 1001,
    y: 150,
    width: 370,
    height: 224,
  });
  expect(await page.getByTestId("canvas-node-video2").boundingBox()).toEqual({
    x: 1001,
    y: 443,
    width: 370,
    height: 224,
  });
  const videoPreviews = page.locator(".video-placeholder");
  expect(await videoPreviews.nth(0).boundingBox()).toEqual({
    x: 1001,
    y: 166,
    width: 370,
    height: 208,
  });
  expect(await videoPreviews.nth(1).boundingBox()).toEqual({
    x: 1001,
    y: 459,
    width: 370,
    height: 208,
  });
  const toolbarBounds = await page.locator(".canvas-toolbar").boundingBox();
  expect(toolbarBounds).toEqual({ x: 719, y: 998, width: 244, height: 50 });
  await expect(page.locator(".canvas-top-right")).toBeVisible();
  expect(await page.locator(".canvas-top-right").boundingBox()).toEqual({
    x: 1138.015625,
    y: 72,
    width: 280.984375,
    height: 31.09375,
  });
  const navigationPanelGap = await page.evaluate(() => {
    const navigation = document
      .querySelector(".canvas-top-right")!
      .getBoundingClientRect();
    const panel = document
      .querySelector(".conversation-panel")!
      .getBoundingClientRect();
    return panel.left - navigation.right;
  });
  expect(navigationPanelGap).toBeCloseTo(11, 1);
  await expect(page.getByTestId("image-composer")).toHaveCount(0);
  await page.locator(".image-preview").click();
  await expect(page.getByTestId("image-composer")).toBeVisible();
  await expect
    .poll(async () => {
      const box = await page.getByTestId("image-composer").boundingBox();
      return (
        box &&
        Object.fromEntries(
          Object.entries(box).map(([key, value]) => [key, Math.round(value)]),
        )
      );
    })
    .toEqual({
      x: 374,
      y: 621,
      width: 590,
      height: 237,
    });
  await page
    .getByTestId("image-composer")
    .screenshot({ path: "test-results/runtime/image-composer-selected.png" });
  await videoPreviews.nth(0).click();
  await expect(page.getByTestId("image-composer")).toHaveCount(0);
  const imageNode = page.getByTestId("canvas-node-image");
  await imageNode.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("image-composer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("image-composer")).toHaveCount(0);
  const favoriteButton = page.getByRole("button", {
    name: "喜欢与标签",
    exact: true,
  });
  await expect(favoriteButton).toBeEnabled();
  await favoriteButton.click();
  await page.getByRole("menuitem", { name: "画布标签", exact: true }).click();
  await expect(page.getByTestId("canvas-tags-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "选择画布工具", exact: true }).click();
  await page
    .getByRole("menuitemradio", { name: "移动工具", exact: true })
    .click();
  await expect(page.locator(".canvas-toolbar")).toHaveCSS("width", "244px");
  await videoPreviews.nth(0).click();
  await expect(page.getByTestId("image-composer")).toHaveCount(0);
  expect(
    await page
      .locator(".task-button")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    await canvas.evaluate((element) => {
      const style = getComputedStyle(element);
      element.scrollTo({ left: 200, top: 200 });
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        scrollbarWidth: style.scrollbarWidth,
      };
    }),
  ).toEqual({
    scrollLeft: 0,
    scrollTop: 0,
    scrollbarWidth: "none",
  });

  const connector = page.getByTestId("connector-video1");
  const before = await imageNode.boundingBox();
  const connectorBefore = await connector.getAttribute("d");
  // Selecting a video can pan the image node's outer margin behind the sidebar.
  // Start from the visible preview and verify that the pointer reaches it.
  const dragStart = await page.locator(".image-preview").evaluate((element) => {
    const box = element.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const target = document.elementFromPoint(x, y);
    return { x, y, reachable: !!target && element.contains(target) };
  });
  expect(dragStart.reachable).toBe(true);
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + 120, dragStart.y + 60);
  await page.mouse.up();
  const afterDrag = await imageNode.boundingBox();
  expect(afterDrag!.x - before!.x).toBeGreaterThan(110);
  expect(afterDrag!.y - before!.y).toBeGreaterThan(50);
  expect(await connector.getAttribute("d")).not.toBe(connectorBefore);
  await expect(page.getByTestId("image-composer")).toHaveCount(0);

  await imageNode.focus();
  await page.keyboard.press("ArrowRight");
  const afterKeyboard = await imageNode.boundingBox();
  expect(afterKeyboard!.x).toBeGreaterThan(afterDrag!.x);

  await page.locator(".image-preview").click();
  await expect(page.getByTestId("image-composer")).toBeVisible();
  const beforeInputDrag = await imageNode.boundingBox();
  const prompt = page.getByLabel("图片提示词");
  const promptBounds = await prompt.boundingBox();
  await page.mouse.move(
    promptBounds!.x + promptBounds!.width / 2,
    promptBounds!.y + 12,
  );
  await page.mouse.down();
  await page.mouse.move(
    promptBounds!.x + promptBounds!.width / 2 + 60,
    promptBounds!.y + 12,
  );
  await page.mouse.up();
  const afterInputDrag = await imageNode.boundingBox();
  expect(Math.abs(afterInputDrag!.x - beforeInputDrag!.x)).toBeLessThan(1);
  expect(Math.abs(afterInputDrag!.y - beforeInputDrag!.y)).toBeLessThan(1);

  const stage = page.getByTestId("canvas-stage");
  const stageBefore = await stage.getAttribute("style");
  const canvasBounds = await canvas.boundingBox();
  await page.mouse.move(canvasBounds!.x + 18, canvasBounds!.y + 500);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(canvasBounds!.x + 78, canvasBounds!.y + 540);
  await page.mouse.up({ button: "middle" });
  await expect(stage).not.toHaveAttribute("style", stageBefore!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => window.innerWidth),
  );
});

test("画布新增卡片可拖动删除，喜欢内容同步到独立面板", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源" }).click();
  await page.getByRole("menuitem", { name: "图片" }).click();
  const added = page.locator("[data-testid^='canvas-node-added-image-']");
  await expect(added).toHaveCount(1);
  await expect(page.getByTestId("image-composer")).toBeVisible();
  await page.screenshot({ path: "test-results/runtime/canvas-added-card.png" });
  await page
    .getByRole("toolbar", { name: "图片操作：新图片卡片", exact: true })
    .getByRole("button", { name: "喜欢新图片卡片", exact: true })
    .click();
  const library = page.getByRole("button", { name: "喜欢与标签", exact: true });
  await library.click();
  await page.getByRole("menuitem", { name: "我喜欢的", exact: true }).click();
  const likes = page.getByTestId("canvas-likes-panel");
  await expect(
    likes.locator(".saved-like-card").getByText("新图片卡片"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/runtime/collection-from-canvas.png",
  });
  await likes.locator(".saved-like-card .saved-text").click();
  await expect(added).toBeVisible();
  await expect(added).toHaveClass(/is-selected/);
  await likes
    .getByRole("button", { name: "关闭喜欢面板", exact: true })
    .click();
  const before = await added.boundingBox();
  const dragPreview = (await added.locator(".image-preview").boundingBox())!;
  await page.mouse.move(dragPreview.x + 100, dragPreview.y + 100);
  await page.mouse.down();
  await page.mouse.move(dragPreview.x + 180, dragPreview.y + 140, { steps: 8 });
  await page.mouse.up();
  const moved = await added.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 70);
  await added.focus();
  await page.keyboard.press("Delete");
  await expect(added).toHaveCount(0);
  await library.click();
  await page.getByRole("menuitem", { name: "我喜欢的", exact: true }).click();
  await expect(likes.locator(".saved-like-card")).toHaveCount(0);
  await expect(
    likes.getByText("还没有喜欢的内容", { exact: true }),
  ).toBeVisible();
});

test("全局搜索按四类导航、筛选并恢复焦点", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "搜索" });
  const search = dialog.getByLabel("搜索内容", { exact: true });
  await expect(search).toBeFocused();
  for (const name of ["全部", "画布卡片", "项目", "已加载资源"]) {
    const tab = dialog.getByRole("tab", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(
      dialog.getByRole("tabpanel", { name, exact: true }),
    ).toBeVisible();
  }
  await dialog.getByRole("tab", { name: "画布卡片", exact: true }).click();
  await search.fill("找不到");
  await expect(
    dialog.getByText("没有匹配的内容，试试其他关键词、类型或标签。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.locator(".catalog-result")).toHaveCount(0);
  await search.fill("");
  await dialog.getByLabel("搜索类型", { exact: true }).selectOption("video");
  await expect(dialog.locator(".catalog-result")).toHaveCount(2);
  await search.fill("视频卡片 1");
  await expect(dialog.locator(".catalog-result")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "搜索", exact: true }),
  ).toBeFocused();
});

test("项目搜索按项目类型筛选，卡片标签不会清空项目结果", async ({ page }) => {
  await openWorkspace(page);
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kk-studio-next:creation:v1")!),
  );
  const text = snapshot.projects[0];
  text.kind = "text";
  text.name = "文案筛选项目";
  text.items[0].tags = ["场景"];
  snapshot.projects.push({
    ...structuredClone(text),
    id: "project-video",
    kind: "video",
    name: "视频筛选项目",
  });
  snapshot.revision = Date.now() + 1;
  await page.evaluate(
    (value) => localStorage.setItem("kk-studio-next:creation:v1", value),
    JSON.stringify(snapshot),
  );
  await page.reload();
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "搜索", exact: true });
  const kind = dialog.getByLabel("搜索类型", { exact: true });
  const tag = dialog.getByLabel("搜索标签", { exact: true });
  await dialog.getByRole("tab", { name: "画布卡片", exact: true }).click();
  await tag.selectOption("场景");
  await dialog.getByRole("tab", { name: "项目", exact: true }).click();
  await kind.selectOption("text");
  await expect(dialog.locator(".catalog-result")).toHaveCount(1);
  await expect(dialog.locator(".catalog-result")).toContainText("文案筛选项目");
  await expect(tag).toBeDisabled();
  await expect(tag).toHaveValue("all");
  await expect(dialog).toContainText("标签仅用于卡片和已加载资源");
  await kind.selectOption("video");
  await expect(dialog.locator(".catalog-result")).toHaveCount(1);
  await expect(dialog.locator(".catalog-result")).toContainText("视频筛选项目");
  await dialog.getByRole("tab", { name: "画布卡片", exact: true }).click();
  await expect(tag).toBeEnabled();
  await expect(tag).toHaveValue("场景");
});

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [768, 1024],
  [390, 844],
]) {
  test(`布局 ${width}×${height} 无页面溢出，资产与设置可用`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openWorkspace(page);
    await page.screenshot({
      path: `test-results/runtime/workspace-${width}.png`,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole("button", { name: "资源管理", exact: true }).click();
    const box = await page.getByTestId("asset-panel").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.getByRole("textbox", { name: "搜索文件" }).fill("冷风");
    await expect(page.locator(".asset-card").first()).toBeVisible();
    await page.screenshot({ path: `test-results/runtime/assets-${width}.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/runtime/settings-${width}.png`,
    });
  });
}

test("未配置连接时工作台草稿在收起对话及页面切换后保留", async ({ page }) => {
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  await page.getByLabel("图片提示词").fill("保留我的草稿");
  await page.getByLabel("执行方式").selectOption("direct");
  await page.getByLabel("对话内容").fill("保留我的消息");
  await expect(page.getByRole("button", { name: "发送消息" })).toBeDisabled();
  await page
    .locator(".conversation-panel")
    .getByRole("button", { name: "前往模型设置", exact: true })
    .click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(page.getByLabel("API Key", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(page.getByLabel("对话内容")).toHaveValue("保留我的消息");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-link").first().click();
  await expect(page.getByLabel("图片提示词")).toHaveValue("保留我的草稿");
  await expect(page.getByLabel("对话内容")).toHaveValue("保留我的消息");
});

test("窗口缩小后对话可重新展开", async ({ page }) => {
  await openWorkspace(page);
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
    await expect(page.getByLabel("对话内容")).toBeVisible();
    await page.getByRole("button", { name: "收起对话", exact: true }).click();
  }
});

test("创建主体的 Escape 与焦点仅作用于当前弹窗", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  await page.getByRole("tab", { name: "资产", exact: true }).click();
  const createButton = page.getByRole("button", {
    name: "创建主体",
    exact: true,
  });
  await createButton.click();
  await expect(page.getByRole("dialog", { name: "创建主体" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "创建主体" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "资产管理" })).toBeVisible();
  await expect(createButton).toBeFocused();
});
