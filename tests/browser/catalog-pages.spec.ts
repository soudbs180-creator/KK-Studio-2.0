import { expect, test } from "@playwright/test";
import { expandSidebar, openSettingsSection } from "./helpers";

test("开始创作首页、目录页和项目行操作保持真实状态", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "开始创作" })).toBeVisible();
  await expect(page.getByRole("region", { name: "无限画布" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "开始创作", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "项目库", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-library-card")).toHaveCount(0);
  await expect(
    page.getByText("还没有本地项目", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "新建项目", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "查看教程", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "项目库使用教程" }),
  ).toBeVisible();
  await expect(
    page.getByText("当前版本是前端 Prototype。", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "项目库使用教程" }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "本地项目" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "扩展", exact: true }),
  ).toBeVisible();
  await openSettingsSection(page, "模型接入");
  await page.getByRole("button", { name: "本地", exact: true }).click();
  await expect(
    page.getByText("ComfyUI 工作流 · 0 个", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();

  await expandSidebar(page);
  await page.getByRole("button", { name: "创建项目文件夹" }).click();
  const group = page.locator(".project-folder-group").first();
  const toggle = group.locator(".folder-heading-toggle");
  await toggle.click({ button: "right" });
  await group.getByRole("menuitem", { name: "置顶文件夹" }).click();
  await expect(group).toHaveClass(/is-pinned/);
  await toggle.click({ button: "right" });
  await expect(
    group.getByRole("menuitem", { name: "取消置顶文件夹" }),
  ).toBeVisible();
  await expect(group.getByRole("menu", { name: "项目组设置" })).toBeVisible();
  await group.getByRole("menuitem", { name: "改名字" }).click();
  await expect(
    group.getByRole("textbox", { name: "项目文件夹名称" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(page.locator(".canvas-node")).toHaveCount(0);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-card")).toHaveCount(1);
  await expect(page.locator(".project-library-card")).toContainText(
    "0 个画布节点",
  );
});

test("开始创作的 Skill 选项卡与 Skill 目录页保持职责分离", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "技能", exact: true }).click();
  await expect(page.getByRole("region", { name: "开始创作" })).toBeVisible();
  await expect(page.getByText("从精选技能开始", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "扩展", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "浏览技能 ›", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "扩展", exact: true }),
  ).toBeVisible();
});

test("开始创作首次打开即可选择内置 Skill", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展" });
  await menu.getByRole("tab", { name: "Skill", exact: true }).click();
  await expect(
    menu.getByRole("menuitem", { name: "镜头规划助手", exact: true }),
  ).toBeVisible();
});

test("首页扩展菜单的选中态和动作项遵守层级圆角", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展" });
  const skillTab = menu.getByRole("tab", { name: "Skill", exact: true });
  await expect(skillTab).toHaveAttribute("aria-selected", "true");
  expect(
    await skillTab.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await expect(
    menu.getByRole("menuitem", { name: "浏览 Skill 目录", exact: true }),
  ).toHaveCSS("border-radius", "8px");
});

test("首页默认账号生图可提交，不显示无关的 API 缺配置原因", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("创作提示词", { exact: true }).fill("测试首页状态");
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toContainText("Codex 内置生图");
  await expect(
    page.getByRole("button", { name: "开始创建项目", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".start-composer-feedback")).toHaveCount(0);
  await expect(page.locator(".start-status")).toHaveCount(0);
});

test("首页默认账号模型入口文案不会被截断", async ({ page }) => {
  await page.goto("/");
  const button = page.locator(".start-model-picker .start-tool-button");
  const label = button.locator("span");
  await expect(label).toHaveText("Codex 内置生图");
  expect(
    await label.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("窄屏首页模型入口保留可读的紧凑标签", async ({ page }) => {
  for (const width of [390, 834]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    const label = page.locator(".start-model-picker .start-tool-button span");
    await expect(label).toHaveCSS("font-size", "12px");
    const text = await label.evaluate((element) => ({
      rendered: element.clientWidth,
      full: element.scrollWidth,
    }));
    expect(text.rendered).toBeGreaterThanOrEqual(text.full);
  }
});

test("首页扩展菜单邻近触发器并避开发现区标签", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作", exact: true })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展" });
  const menuBox = await menu.boundingBox();
  const triggerBox = await page
    .getByRole("region", { name: "开始创作", exact: true })
    .getByRole("button", { name: "扩展", exact: true })
    .boundingBox();
  const tabsBox = await page.locator(".start-tabs").boundingBox();
  expect(menuBox).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  const gap = Math.min(
    Math.abs(menuBox!.y - triggerBox!.y - triggerBox!.height),
    Math.abs(triggerBox!.y - menuBox!.y - menuBox!.height),
  );
  expect(gap).toBeGreaterThanOrEqual(4);
  expect(gap).toBeLessThanOrEqual(12);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(tabsBox!.y);
});

test("首页滚动后菜单仍保持可见和可操作", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const home = page.locator(".start-page");
  await home.evaluate((element) => {
    element.scrollTop = 280;
  });
  await expect
    .poll(() => home.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  const composer = page.locator(".start-composer");
  for (const triggerName of ["模型", "扩展", "当前模式：自动"]) {
    await composer
      .getByRole("button", { name: triggerName, exact: true })
      .click();
    const menu = composer.locator('[role="menu"], [role="dialog"]').last();
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(24);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(720);
    await page.keyboard.press("Escape");
  }
});

test("窄屏首页扩展菜单不遮挡发现区", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作", exact: true })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展" });
  const menuBox = await menu.boundingBox();
  const tabsBox = await page.locator(".start-tabs").boundingBox();
  expect(menuBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(tabsBox!.y);
});

test("首页筛选无匹配项时显示真实空态并可返回精选", async ({ page }) => {
  await page.goto("/");
  const discovery = page.locator(".start-discovery");
  for (const category of ["特效包装", "影视片头", "二次元 PV"]) {
    await discovery
      .getByRole("button", { name: category, exact: true })
      .click();
    await expect(discovery.locator(".start-inspiration-card")).toHaveCount(0);
    await expect(
      discovery.getByRole("status").filter({ hasText: "暂时没有精选灵感" }),
    ).toBeVisible();
  }
  await discovery
    .getByRole("button", { name: "返回 H3 精选", exact: true })
    .click();
  await expect(discovery.locator(".start-inspiration-card")).toHaveCount(3);
});

test("窄屏首页分类 chips 溢出时提供横向滚动提示", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto("/");
  const chipRow = page.locator(".start-chip-row");
  await expect(chipRow).toHaveAttribute(
    "aria-label",
    "灵感分类，可横向滚动查看更多",
  );
  await expect(chipRow).toHaveAttribute("data-can-scroll-right", "true");
  await expect(chipRow).toHaveAttribute("data-can-scroll-left", "false");
  await chipRow.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(chipRow).toHaveAttribute("data-can-scroll-right", "false");
  await expect(chipRow).toHaveAttribute("data-can-scroll-left", "true");
  await expect(chipRow).toHaveAttribute(
    "aria-label",
    "灵感分类，可向左横向滚动查看更多",
  );
});

test("窄屏首页发现区滚动后能到达最后一张灵感卡片", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto("/");
  const home = page.locator(".start-page");
  const before = await home.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
  await home.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => home.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const lastCard = page.locator(".start-inspiration-card").last();
  const lastCardBox = await lastCard.boundingBox();
  const homeBox = await home.boundingBox();
  expect(lastCardBox).not.toBeNull();
  expect(homeBox).not.toBeNull();
  expect(lastCardBox!.y + lastCardBox!.height).toBeLessThanOrEqual(
    homeBox!.y + homeBox!.height,
  );
});

test("首页灵感卡片媒体保持稳定的 16:9 比例", async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    const ratios = await page
      .locator(".start-inspiration-card img")
      .evaluateAll((images) =>
        images.map((image) => {
          const box = image.getBoundingClientRect();
          return box.width / box.height;
        }),
      );
    expect(ratios).toHaveLength(3);
    for (const ratio of ratios) expect(ratio).toBeCloseTo(16 / 9, 1);
  }
});

test("首页发现 tabs 与 panel 语义关联并支持方向键切换", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "开始创作内容" });
  const inspiration = tabs.getByRole("tab", { name: "创作灵感", exact: true });
  const skill = tabs.getByRole("tab", { name: "技能", exact: true });
  await expect(inspiration).toHaveAttribute(
    "aria-controls",
    "start-panel-inspiration",
  );
  await expect(skill).toHaveAttribute("aria-controls", "start-panel-skill");
  await inspiration.focus();
  await inspiration.press("ArrowRight");
  await expect(skill).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#start-panel-skill")).toBeVisible();
  await skill.press("ArrowLeft");
  await expect(inspiration).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#start-panel-inspiration")).toBeVisible();
});

test("首页灵感卡片悬停和焦点状态保持可见层级", async ({ page }) => {
  await page.goto("/");
  const card = page.locator(".start-inspiration-card").first();
  await card.hover();
  await expect(card).not.toHaveCSS("box-shadow", "none");
  await card.focus();
  await expect(card).not.toHaveCSS("box-shadow", "none");
});

test("首页卡片写入提示词时不重复显示模板状态", async ({ page }) => {
  await page.goto("/");
  await page.locator(".start-inspiration-card").first().click();
  await expect(page.getByLabel("创作提示词", { exact: true })).not.toHaveValue(
    "",
  );
  await expect(page.locator(".start-status")).toHaveCount(0);
  await expect(page.locator(".start-composer-feedback")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toContainText("Codex 内置生图");
  await expect(
    page.getByRole("button", { name: "开始创建项目", exact: true }),
  ).toBeEnabled();
});

test("首页工具栏的操作项保持在各自分组边界内", async ({ page }) => {
  await page.goto("/");
  const bounds = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right };
    };
    return {
      leftGroup: rect(".start-footer-left"),
      leftContent: rect(".start-skill-divider"),
      rightGroup: rect(".start-footer-right"),
      rightContent: rect(".start-submit-button"),
    };
  });
  expect(bounds.leftContent.right).toBeLessThanOrEqual(bounds.leftGroup.right);
  expect(bounds.rightContent.right).toBeLessThanOrEqual(
    bounds.rightGroup.right,
  );
});

test("首页窄屏工具栏保持在 composer 卡片内", async ({ page }) => {
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    const bounds = await page.locator(".start-composer").evaluate((form) => {
      const card = form.getBoundingClientRect();
      const footer = form.querySelector<HTMLElement>(".start-composer-footer")!;
      const actions = Array.from(
        form.querySelectorAll<HTMLElement>(".start-composer-footer button"),
      )
        .filter((button) => button.getClientRects().length > 0)
        .map((button) => {
          const box = button.getBoundingClientRect();
          return { left: box.left, right: box.right };
        });
      const footerBox = footer.getBoundingClientRect();
      return {
        card: { left: card.left, right: card.right },
        footer: { left: footerBox.left, right: footerBox.right },
        actions,
      };
    });
    expect(bounds.footer.left).toBeGreaterThanOrEqual(bounds.card.left);
    expect(bounds.footer.right).toBeLessThanOrEqual(bounds.card.right);
    for (const action of bounds.actions) {
      expect(action.left).toBeGreaterThanOrEqual(bounds.card.left);
      expect(action.right).toBeLessThanOrEqual(bounds.card.right);
    }
  }
});

test("开始创作页的扩展入口打开插件设置分类而不是 Skill 页面", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展" });
  await menu.getByRole("tab", { name: "MCP", exact: true }).click();
  await menu.getByRole("menuitem", { name: "管理画布插件" }).click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }).getByRole("button", {
      name: "扩展",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .locator('[aria-current="page"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /MCP/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "扩展", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page
    .getByRole("button", { name: "项目库", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page
    .locator(".conversation-panel")
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await page
    .getByRole("menu", { name: "扩展" })
    .getByRole("tab", { name: "MCP", exact: true })
    .click();
  await page
    .getByRole("menu", { name: "扩展" })
    .getByRole("menuitem", {
      name: "管理画布插件",
    })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }).getByRole("button", {
      name: "扩展",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .locator('[aria-current="page"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /MCP/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("开始创作与工作台的模型入口都定位到模型接入设置", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /模型接入/ })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "模型接入", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page
    .getByRole("button", { name: "项目库", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await expect(page.getByRole("menu")).toContainText("Codex");
  await page
    .getByRole("menu")
    .getByRole("button", { name: /模型接入/ })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "模型接入", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("扩展页面状态说明不覆盖副标题", async ({ page }) => {
  await page.goto("/");
  for (const name of ["扩展"]) {
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("button", { name, exact: true })
      .click();
    if (name === "扩展") await page.locator(".catalog-card").first().click();
    const header = page.locator(".catalog-page-header");
    const subtitle = header.locator("p");
    const status = page.locator(".catalog-page-status").first();
    const subtitleBox = await subtitle.boundingBox();
    const statusBox = await status.boundingBox();
    expect(subtitleBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    expect(statusBox!.y).toBeGreaterThanOrEqual(
      subtitleBox!.y + subtitleBox!.height,
    );
  }
});

test("Skill 与工作流卡片保持当前页面并反馈本地预览状态", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "扩展", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("镜头规划助手", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "应用到草稿", exact: true })
    .first()
    .click();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "开始创作", exact: true })
    .click();
  await expect(page.getByLabel("创作提示词")).toHaveValue(
    /\[Skill: 镜头规划助手\]/,
  );
  await expect(
    page.getByRole("heading", { name: "KK Studio", exact: true }),
  ).toBeVisible();

  await openSettingsSection(page, "模型接入");
  await page.getByRole("button", { name: "本地", exact: true }).click();
  await page.getByText("ComfyUI 工作流 · 0 个", { exact: true }).click();
  await page.locator('.settings-disclosure input[type="file"]').setInputFiles({
    name: "我的 ComfyUI 工作流.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ "1": { class_type: "SaveImage", inputs: {} } }),
    ),
  });
  await expect(
    page.getByText("我的 ComfyUI 工作流", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "运行未接通", exact: true }),
  ).toBeDisabled();
});

test("项目区支持筛选、排序和创建文件夹入口", async ({ page }) => {
  await page.goto("/");
  await expandSidebar(page);
  const sidebar = page.locator(".sidebar");
  await sidebar.getByRole("button", { name: "创建未分组项目" }).click();
  await sidebar.getByRole("textbox", { name: "项目名称" }).fill("过滤项目");
  await sidebar.getByRole("textbox", { name: "项目名称" }).press("Enter");
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  const menu = sidebar.getByRole("menu", { name: "项目显示与排序" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemradio", { name: "仅显示未分组" }).click();
  await expect(menu).toHaveCount(0);
  await expect(sidebar.locator(".project-entry:visible")).toHaveCount(1);
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await sidebar
    .getByRole("menu", { name: "项目显示与排序" })
    .getByRole("menuitemradio", { name: "任务状态优先" })
    .click();
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await expect(
    sidebar
      .getByRole("menu", { name: "项目显示与排序" })
      .getByRole("menuitemradio", { name: "任务状态优先" }),
  ).toHaveAttribute("aria-checked", "true");
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  await expect(sidebar.getByText("新建文件夹", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-action").first()).toBeVisible();
  await expect(page.locator(".project-library-action").nth(1)).toBeDisabled();
});
