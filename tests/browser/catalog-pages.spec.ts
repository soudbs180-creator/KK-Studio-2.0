import { expect, test } from "@playwright/test";

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
    .getByRole("button", { name: "Skill", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Skill", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ComfyUI 工作流", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ComfyUI 工作流", exact: true }),
  ).toBeVisible();

  const grouped = page.locator(".project-entry").first();
  await grouped.locator(".project-link").click({ button: "right" });
  await grouped.getByRole("menuitem", { name: "置顶项目" }).click();
  await expect(grouped).toHaveClass(/is-pinned/);
  await grouped.locator(".project-link").click({ button: "right" });
  await expect(
    grouped.getByRole("menuitem", { name: "取消置顶项目" }),
  ).toBeVisible();
  await expect(grouped.getByRole("menu", { name: "项目组设置" })).toBeVisible();
  await grouped.getByRole("menuitem", { name: "改名字" }).click();
  await expect(
    grouped.getByRole("textbox", { name: "项目名称" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
});

test("开始创作的 Skill 选项卡与 Skill 目录页保持职责分离", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Skill", exact: true }).click();
  await expect(page.getByRole("region", { name: "开始创作" })).toBeVisible();
  await expect(
    page.getByText("从精选 Skill 开始", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Skill", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "浏览 Skill ›", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Skill", exact: true }),
  ).toBeVisible();
});

test("开始创作页的插件入口打开设置分类而不是 Skill 页面", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作" })
    .getByRole("button", { name: "插件", exact: true })
    .click();
  await page
    .getByRole("menu", { name: "选择插件" })
    .getByRole("menuitem", {
      name: "管理插件连接",
    })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }).getByRole("button", {
      name: "MCP",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Skill", exact: true }),
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
    .getByRole("button", { name: "插件", exact: true })
    .click();
  await page
    .getByRole("menu", { name: "选择插件" })
    .getByRole("menuitem", {
      name: "管理插件连接",
    })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }).getByRole("button", {
      name: "MCP",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
});

test("开始创作与工作台的模型入口都定位到模型供应商设置", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "模型供应商", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page
    .getByRole("button", { name: "项目库", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await expect(page.getByRole("menu")).toContainText("kk-image-2");
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "模型供应商", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("Skill 与 ComfyUI 页面状态说明不覆盖副标题", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Skill", "ComfyUI 工作流"]) {
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("button", { name, exact: true })
      .click();
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
    .getByRole("button", { name: "Skill", exact: true })
    .click();
  await page.getByRole("button", { name: /3D 动画短片/ }).click();
  await expect(
    page.getByText("已选择Skill：3D 动画短片。", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Skill", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "通过 KK Studio 创建", exact: true }),
  ).toBeDisabled();

  await page
    .getByRole("button", { name: "ComfyUI 工作流", exact: true })
    .click();
  await page
    .locator(".workflow-card")
    .filter({ hasText: "H3 轻量版 · 文生视频" })
    .first()
    .click();
  await expect(
    page.getByText("已选择工作流：H3 轻量版 · 文生视频。", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "导入/新建工作流", exact: true })
    .click();
  await page.getByRole("tab", { name: "我的工作流", exact: true }).click();
  await expect(
    page.getByText("我的 ComfyUI 工作流", { exact: true }),
  ).toBeVisible();
});

test("项目区支持筛选、排序和创建文件夹入口", async ({ page }) => {
  await page.goto("/");
  const sidebar = page.locator(".sidebar");
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  const menu = sidebar.getByRole("menu", { name: "项目显示与排序" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemradio", { name: "仅显示未分组" }).click();
  await expect(menu).toHaveCount(0);
  await expect(sidebar.locator(".project-entry")).toHaveCount(1);
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await sidebar
    .getByRole("menu", { name: "项目显示与排序" })
    .getByRole("menuitemradio", { name: "优先级" })
    .click();
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await expect(
    sidebar
      .getByRole("menu", { name: "项目显示与排序" })
      .getByRole("menuitemradio", { name: "优先级" }),
  ).toHaveAttribute("aria-checked", "true");
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  await expect(sidebar.getByText("新建文件夹", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-action").first()).toBeVisible();
  await expect(page.locator(".project-library-action").nth(1)).toBeDisabled();
});
