import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("current Figma modal shells keep dimensions and settings content origin", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const panel = page.locator(".settings-panel");
  await expect(panel).toHaveCSS("width", "920px");
  await expect(panel).toHaveCSS("height", "700px");
  const panelBox = (await panel.boundingBox())!;
  const title = (await page.locator(".settings-page-title").boundingBox())!;
  expect(title.x - panelBox.x).toBe(364);
  expect(title.y - panelBox.y).toBe(38);
  expect(await panel.locator(".settings-row h3").allTextContents()).toEqual([
    "语言",
    "主题",
    "强调色",
    "浮岛布局",
    "去除水印",
    "系统托盘",
    "防止系统休眠",
    "开机自启动",
  ]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".catalog-panel")).toHaveCSS("height", "696px");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  await expect(page.locator(".asset-panel")).toHaveCSS("height", "696px");
  await page.getByRole("button", { name: "收起资产管理", exact: true }).click();
  await expect(page.locator(".asset-panel")).toHaveCSS("width", "305px");
  const filters = page.locator(".asset-filters");
  const content = page.locator(".asset-content");
  expect(
    (await filters.boundingBox())!.y + (await filters.boundingBox())!.height,
  ).toBeLessThan((await content.boundingBox())!.y);
  await page.getByLabel("来源筛选").selectOption("provider");
  await expect(page.locator(".asset-empty")).toBeVisible();
});

test("unconnected account and memory controls do not advertise working services", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "账号管理", exact: true }).click();
  await expect(page.locator(".settings-content")).toContainText(
    "未登录 · Prototype",
  );
  await expect(
    page.getByRole("button", { name: "删除账号", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "网络", exact: true }).click();
  await expect(page.locator(".settings-content")).toContainText("本地转发代理");
  await expect(page.locator(".settings-content")).toContainText(
    "npm run proxy",
  );
  await expect(page.locator(".settings-content")).toContainText(
    "npm run dev:agent",
  );
  await page.getByRole("button", { name: "记忆", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "＋ 新建", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("搜索描述或正文")).toBeDisabled();
});

test("task workbench action does not overlap the tabs and demo status is visible", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开任务列表", exact: true }).click();
  await expect(page.locator(".task-panel-heading")).toContainText("本地演示");
  const action = page.getByRole("button", {
    name: "打开任务工作台",
    exact: true,
  });
  const tabs = (await page.locator(".task-panel-tabs").boundingBox())!;
  expect((await action.boundingBox())!.y).toBeGreaterThan(tabs.y + tabs.height);
  await action.click();
  await expect(page.locator(".task-panel")).toHaveCount(0);
  await expect(page.locator(".task-workbench")).toBeVisible();
});

test("landing discovery content remains reachable below the desktop fold", async ({
  page,
}) => {
  await page.goto("/");
  const landing = page.locator(".start-page");
  await landing.hover();
  await page.mouse.wheel(0, 700);
  await expect
    .poll(() => landing.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await expect(
    page.locator(".start-inspiration-card strong").last(),
  ).toBeInViewport();
  expect(
    await landing.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
});
