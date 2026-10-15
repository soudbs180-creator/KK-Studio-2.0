import { expect, test } from "@playwright/test";
import {
  openWorkspace,
  openSettingsSection,
  showSettingsCategories,
} from "./helpers";

test("窄屏设置分类逐行展示，并保留触屏命中区", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const nav = await showSettingsCategories(page);
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole("button", { name: "通用", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("button", { name: "账号管理", exact: true }),
  ).toBeVisible();
  // The opening animation moves all three together; compare one frame.
  const { general, account, bar } = await nav.evaluate((el) => {
    const box = (label: string) => {
      const button = [...el.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === label,
      );
      if (!button) throw new Error(`Missing settings category: ${label}`);
      return button.getBoundingClientRect().toJSON();
    };
    return {
      general: box("通用"),
      account: box("账号管理"),
      bar: el.getBoundingClientRect().toJSON(),
    };
  });
  expect(account.y).toBeGreaterThanOrEqual(general.y + general.height);
  expect(Math.abs(general.x - account.x)).toBeLessThanOrEqual(2);
  expect(general.height).toBe(40);
  expect(account.height).toBe(40);
  expect(account.y).toBeGreaterThanOrEqual(bar.y);
  expect(account.y + account.height).toBeLessThanOrEqual(
    bar.y + bar.height + 1,
  );
});

test("Skill、MCP、协作伙伴标签可用方向键切换并显示对应内容", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const tabs = page.getByRole("tablist", { name: "Skill、MCP 与协作伙伴" });
  const skills = tabs.getByRole("tab", { name: /Skill/ });
  const partners = tabs.getByRole("tab", { name: /伙伴/ });
  await skills.click();
  await skills.press("ArrowRight");
  const mcp = tabs.getByRole("tab", { name: /MCP/ });
  await expect(mcp).toBeFocused();
  await mcp.press("ArrowRight");
  await expect(partners).toBeFocused();
  await expect(partners).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("dialog", { name: "设置" }).getByRole("tabpanel"),
  ).toContainText("策划伙伴");
});

test("手机扩展标签保持单行和触屏命中区", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openSettingsSection(page, "扩展");
  const tabs = page.getByRole("tablist", { name: "Skill、MCP 与协作伙伴" });
  const bounds = (await tabs.boundingBox())!;
  for (const tab of await tabs.getByRole("tab").all()) {
    const box = (await tab.boundingBox())!;
    expect(box.height).toBe(40);
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    await expect(tab).toHaveCSS("white-space", "nowrap");
  }
});

test("Skill 与 MCP 入口归一到扩展，Agent 连接属于模型接入", async ({
  page,
}) => {
  async function expectExtensionTab(tab: RegExp) {
    const dialog = page.getByRole("dialog", { name: "设置" });
    const nav = dialog.getByRole("navigation", { name: "设置分类" });
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(
      nav.getByRole("button", { name: "扩展", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(dialog.getByRole("tab", { name: tab })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }

  // Skill catalog connector management keeps the legacy settings/mcp route.
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await page.getByRole("tab", { name: "MCP", exact: true }).click();
  await page.getByRole("button", { name: "配置 MCP", exact: true }).click();
  await expectExtensionTab(/MCP/);
  await page
    .getByRole("tablist", { name: "Skill、MCP 与协作伙伴" })
    .getByRole("tab", { name: /Skill/ })
    .click();
  await expectExtensionTab(/Skill/);

  // Canvas plugin management keeps the legacy settings/plugins route.
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
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
    .getByRole("menuitem", { name: "管理画布插件" })
    .click();
  await expectExtensionTab(/MCP/);

  // The Agent panel opens model access rather than specialist task roles.
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "连接设置", exact: true }).click();
  const models = page
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "模型接入", exact: true });
  await expect(models).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("region", { name: "Codex 主 Agent 接入" }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 779, height: 643 },
  { width: 390, height: 844 },
]) {
  test(`隐藏滚动条后设置仍可滚轮、键盘滚动并访问全部分类 ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "设置" });
    const content = dialog.locator(".settings-content");
    await expect(content).toHaveCSS("scrollbar-width", "none");
    await content.hover();
    await page.mouse.wheel(0, 450);
    await expect
      .poll(() => content.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await content.focus();
    await page.keyboard.press("Home");
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(0);
    await page.keyboard.press("End");
    await expect
      .poll(() => content.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await expect(
      dialog.getByRole("switch", { name: "防止系统休眠" }),
    ).toBeInViewport();
    // Categories are a separate phone level; return before keyboard navigation.
    await showSettingsCategories(page);
    const updates = dialog.getByRole("button", {
      name: "软件更新",
      exact: true,
    });
    await updates.focus();
    await expect(updates).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(dialog.locator(".settings-version")).toBeVisible();
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "打开设置", exact: true }),
    ).toBeFocused();
  });
}

test("手机设置分类可纵向滚动，详情返回当前分类", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  const nav = await showSettingsCategories(page);
  const sidebar = dialog.locator(".settings-sidebar");
  await expect(dialog.locator(".settings-panel")).toBeVisible();
  await expect(sidebar).toBeVisible();
  await expect(dialog.locator(".settings-content")).toBeHidden();
  expect(await sidebar.evaluate((el) => el.scrollHeight)).toBeGreaterThan(
    await sidebar.evaluate((el) => el.clientHeight),
  );
  expect(
    await sidebar.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
  await sidebar.hover();
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => sidebar.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const updates = nav.getByRole("button", { name: "软件更新", exact: true });
  await updates.click();
  await expect(dialog.locator(".settings-content h2")).toHaveText("软件更新");
  await expect(sidebar).toBeHidden();
  await showSettingsCategories(page);
  await expect(updates).toHaveAttribute("aria-current", "page");
  await expect(updates).toBeFocused();
  await expect(updates).toBeInViewport();
});

test("资产列表隐藏滚动条后仍可滚动，浮岛设置作用于整个工作区", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  await page.getByRole("button", { name: "收起资产管理" }).click();
  const assets = page.locator(".asset-content");
  await expect(assets).toHaveCSS("scrollbar-width", "none");
  await assets.hover();
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => assets.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("switch", { name: "浮岛布局" }).click();
  await expect(page.locator(".workspace-content")).toHaveCSS(
    "border-radius",
    "0px",
  );
  await page.getByRole("switch", { name: "浮岛布局" }).click();
  await expect(page.locator(".workspace-content")).toHaveCSS(
    "border-radius",
    "20px",
  );
});
