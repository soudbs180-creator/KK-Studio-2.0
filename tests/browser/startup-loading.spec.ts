import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("首页首屏不初始化隐藏工作区或下载设置页面", async ({ page }) => {
  const settingsRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/assets\/SettingsPanel-[^/]+\.js/.test(request.url()))
      settingsRequests.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "开始创作", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("infinite-canvas")).toHaveCount(0);
  await expect(page.locator(".conversation-panel")).toHaveCount(0);
  expect(settingsRequests).toHaveLength(0);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }),
  ).toBeVisible();
  expect(settingsRequests).toHaveLength(1);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
});

test("进入工作区后返回首页保留画布实例和撤销历史", async ({ page }) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  const before = (await node.getAttribute("style"))!;
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await expect(node).not.toHaveAttribute("style", before);
  const after = (await node.getAttribute("style"))!;
  await page.getByRole("button", { name: "开始创作", exact: true }).click();
  await expect(page.getByTestId("infinite-canvas")).toHaveCount(1);
  await expect(page.getByTestId("infinite-canvas")).toBeHidden();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(node).toHaveAttribute("style", after);
  await page.getByTestId("infinite-canvas").focus();
  await page.keyboard.press("Control+Z");
  await expect(node).toHaveAttribute("style", before);
});

test("按需页面下载等待时可以关闭且迟到内容不会重新弹出", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/assets/SettingsPanel-*.js", async (route) => {
    requested = true;
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "正在加载" }),
  ).toBeVisible();
  expect(requested).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toHaveCount(0);
  const loaded = page.waitForResponse(/\/assets\/SettingsPanel-[^/]+\.js/);
  release();
  await loaded;
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "设置分类" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "通用", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
});

test("按需页面等待完成后保持弹窗内焦点并可返回触发按钮", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/SettingsPanel-*.js", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "打开设置", exact: true });
  await trigger.click();
  await expect(
    page.getByRole("status").filter({ hasText: "正在加载" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "关闭", exact: true }),
  ).toBeFocused();
  release();
  await expect(
    page
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button", { name: "通用", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("按需页面网络失败有恢复入口且不清空首页草稿", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/SettingsPanel-*.js", async (route) => {
    await gate;
    await route.abort("internetdisconnected");
  });
  await page.goto("/");
  const prompt = page.locator(".start-page textarea");
  await prompt.fill("保留这段首页创作草稿");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "正在加载" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "关闭", exact: true }),
  ).toBeFocused();
  release();
  await expect(
    page.getByRole("alert").filter({ hasText: "加载失败" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "重新加载", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "关闭", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(prompt).toHaveValue("保留这段首页创作草稿");
});
