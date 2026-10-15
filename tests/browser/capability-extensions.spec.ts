import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("创作区协作伙伴入口打开任务角色而不是账号连接", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "开始创作", exact: true })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展", exact: true });
  await menu.getByRole("tab", { name: "协作伙伴", exact: true }).click();
  await menu
    .getByRole("menuitem", { name: "选择协作角色", exact: true })
    .click();
  const catalog = page.getByRole("region", { name: "扩展", exact: true });
  await expect(
    catalog.getByRole("tab", { name: "协作伙伴", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(catalog.getByRole("button", { name: /策划伙伴/ })).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toHaveCount(0);
});

test("从项目选择协作角色会应用到原项目，保留首页的独立草稿", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByLabel("执行方式", { exact: true }).selectOption("direct");
  await page
    .getByRole("textbox", { name: "对话内容", exact: true })
    .fill("项目 API 独立草稿");
  await page.getByLabel("执行方式", { exact: true }).selectOption("codex");
  await page
    .getByRole("textbox", { name: "对话内容", exact: true })
    .fill("项目原有想法");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "开始创作", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "创作提示词", exact: true })
    .fill("独立的首页草稿");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toHaveValue("项目原有想法");
  await page
    .locator(".conversation-panel")
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展", exact: true });
  await menu.getByRole("tab", { name: "协作伙伴", exact: true }).click();
  await menu
    .getByRole("menuitem", { name: "选择协作角色", exact: true })
    .click();
  const catalog = page.getByRole("region", { name: "扩展", exact: true });
  await catalog.getByRole("button", { name: /审查伙伴/ }).click();
  await catalog
    .getByRole("button", { name: "应用到草稿", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "无限画布", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toHaveValue(/项目原有想法[\s\S]*协作角色：审查伙伴/);
  await page.getByLabel("执行方式", { exact: true }).selectOption("direct");
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toHaveValue("项目 API 独立草稿");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "开始创作", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "创作提示词", exact: true }),
  ).toHaveValue("独立的首页草稿");
});

test("扩展分类分开指令、工具与角色，应用角色保留并恢复原草稿", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "创作提示词" })
    .fill("保留原有创作想法");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const catalog = page.getByRole("region", { name: "扩展", exact: true });
  await expect(
    catalog.getByRole("heading", { name: "扩展", exact: true }),
  ).toBeVisible();
  const tabs = catalog.getByRole("tablist", { name: "扩展分类", exact: true });
  await expect(tabs.getByRole("tab")).toHaveCount(3);
  const skills = tabs.getByRole("tab", { name: "Skill", exact: true });
  await skills.focus();
  await skills.press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "MCP", exact: true }),
  ).toBeFocused();
  await expect(
    catalog.getByRole("button", { name: "配置 MCP", exact: true }),
  ).toBeVisible();
  await tabs.getByRole("tab", { name: "协作伙伴", exact: true }).click();
  await expect(
    catalog.getByText("自动分派不同模型尚未接入。", { exact: false }),
  ).toBeVisible();
  await catalog.getByRole("button", { name: /审查伙伴/ }).click();
  await catalog
    .getByRole("button", { name: "应用到草稿", exact: true })
    .click();
  const prompt = page.getByRole("textbox", { name: "创作提示词" });
  await expect(prompt).toHaveValue(/保留原有创作想法[\s\S]*协作角色：审查伙伴/);
  await page.reload();
  await expect(prompt).toHaveValue(/保留原有创作想法[\s\S]*协作角色：审查伙伴/);
});

test("Google 伙伴角色追加到 Google 草稿，超限拒绝也不污染 API 或 Codex", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByLabel("执行方式", { exact: true }).selectOption("direct");
  await page
    .getByRole("textbox", { name: "对话内容", exact: true })
    .fill("Google 角色不应改动的 API 草稿");
  await page.getByLabel("执行方式", { exact: true }).selectOption("google");
  const prompt = page.getByRole("textbox", { name: "对话内容", exact: true });
  await prompt.fill("Google 原有创作想法");
  const catalog = page.getByRole("region", { name: "扩展", exact: true });
  async function openRoles() {
    await page
      .locator(".conversation-panel")
      .getByRole("button", { name: "扩展", exact: true })
      .click();
    const menu = page.getByRole("menu", { name: "扩展", exact: true });
    await menu.getByRole("tab", { name: "协作伙伴", exact: true }).click();
    await menu
      .getByRole("menuitem", { name: "选择协作角色", exact: true })
      .click();
    await catalog.getByRole("button", { name: /审查伙伴/ }).click();
    await catalog
      .getByRole("button", { name: "应用到草稿", exact: true })
      .click();
  }
  await openRoles();
  await expect(page.getByLabel("执行方式", { exact: true })).toHaveValue(
    "google",
  );
  await expect(prompt).toHaveValue(
    /Google 原有创作想法[\s\S]*协作角色：审查伙伴/,
  );
  const original = "g".repeat(3990);
  await prompt.fill(original);
  await openRoles();
  await expect(catalog).toBeVisible();
  await expect(catalog.getByRole("status")).toContainText("超过 4,000 字符");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(prompt).toHaveValue(original);
  await page.getByLabel("执行方式", { exact: true }).selectOption("direct");
  await expect(prompt).toHaveValue("Google 角色不应改动的 API 草稿");
  await page.getByLabel("执行方式", { exact: true }).selectOption("codex");
  await expect(prompt).not.toHaveValue(/协作角色：审查伙伴/);
});

test("Agent 角色追加超限保留原草稿，也不改动 API 草稿", async ({ page }) => {
  await openWorkspace(page);
  await page.getByLabel("执行方式", { exact: true }).selectOption("direct");
  await page
    .getByRole("textbox", { name: "对话内容", exact: true })
    .fill("API 草稿保留");
  await page.getByLabel("执行方式", { exact: true }).selectOption("codex");
  const original = "a".repeat(3990);
  await page
    .getByRole("textbox", { name: "对话内容", exact: true })
    .fill(original);
  await page
    .locator(".conversation-panel")
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "扩展", exact: true });
  await menu.getByRole("tab", { name: "协作伙伴", exact: true }).click();
  await menu
    .getByRole("menuitem", { name: "选择协作角色", exact: true })
    .click();
  const catalog = page.getByRole("region", { name: "扩展", exact: true });
  await catalog
    .getByRole("button", { name: "应用到草稿", exact: true })
    .click();
  await expect(catalog).toBeVisible();
  await expect(catalog.getByRole("status")).toContainText("超过 4,000 字符");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toHaveValue(original);
  await page.getByLabel("执行方式", { exact: true }).selectOption("direct");
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toHaveValue("API 草稿保留");
});

test("协作伙伴不会显示 Codex 连接，复制失败给出真实反馈", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await dialog.getByRole("tab", { name: /协作伙伴/ }).click();
  await expect(dialog.getByRole("button", { name: /策划伙伴/ })).toBeVisible();
  await expect(dialog.getByLabel("Agent 地址", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("Codex 主 Agent", { exact: true })).toHaveCount(
    0,
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async () => {
        throw new Error("Clipboard denied");
      },
    });
  });
  const copy = dialog.getByRole("button", {
    name: "复制任务说明",
    exact: true,
  });
  await copy.click();
  await expect(
    dialog.getByText("无法写入剪贴板，请从扩展页面应用角色说明。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(copy).toBeEnabled();
});

test("手机扩展分类与任务角色没有横向溢出，搜索空态保持可恢复", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const catalog = page.getByRole("region", { name: "扩展", exact: true });
  await catalog.getByRole("tab", { name: "协作伙伴", exact: true }).click();
  const search = catalog.getByRole("textbox", {
    name: "搜索 协作伙伴",
    exact: true,
  });
  await search.fill("没有这个任务角色");
  await expect(
    catalog.getByText("没有匹配的协作角色。", { exact: true }),
  ).toBeVisible();
  await expect(
    catalog.getByRole("button", { name: "应用到草稿", exact: true }),
  ).toHaveCount(0);
  await search.fill("审查");
  await expect(catalog.getByRole("button", { name: /审查伙伴/ })).toBeVisible();
  expect(
    await catalog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});
