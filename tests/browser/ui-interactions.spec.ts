import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test("project status and task entry do not cover each other", async ({
  page,
}, info) => {
  await openWorkspace(page);
  const status = page.locator(".project-task-status");
  const tasks = page.locator(".task-button");
  await expect(status).toBeVisible();
  await expect(tasks).toBeVisible();
  const a = (await status.boundingBox())!;
  const b = (await tasks.boundingBox())!;
  const overlap =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  await page.screenshot({
    path: info.outputPath("workspace-status.png"),
    animations: "disabled",
  });
  expect(overlap, JSON.stringify({ status: a, tasks: b })).toBe(0);
});

test("minimum zoom keeps background dots separated and grid visible", async ({
  page,
}, info) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const canvas = page.getByRole("region", { name: "无限画布" });
  await canvas.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("Control+-");
  await expect(
    page.getByRole("button", { name: "画布缩放", exact: true }),
  ).toHaveText("20%");
  const pitch = await canvas.evaluate((el) =>
    parseFloat(getComputedStyle(el).backgroundSize),
  );
  await page.screenshot({
    path: info.outputPath("dots-20.png"),
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "切换为网格背景", exact: true })
    .click();
  const opacity = await canvas.evaluate((el) =>
    Number(getComputedStyle(el).getPropertyValue("--canvas-pattern-opacity")),
  );
  await page.screenshot({
    path: info.outputPath("grid-20.png"),
    animations: "disabled",
  });
  expect(
    pitch,
    "small dots must not merge into a nearly solid field",
  ).toBeGreaterThanOrEqual(12);
  expect(opacity, "grid must not become fully transparent").toBeGreaterThan(
    0.1,
  );
});

test("collapsing a project group preserves edited row state", async ({
  page,
}) => {
  await page.goto("/");
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const row = sidebar.locator(".project-entry").first();
  await row.locator(".project-link").click({ button: "right" });
  await sidebar.getByRole("menuitem", { name: "改名字", exact: true }).click();
  await sidebar
    .getByLabel("项目名称", { exact: true })
    .fill("折叠后仍保留的名称");
  await page.keyboard.press("Enter");
  const toggle = sidebar.locator(".project-groups-title");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    sidebar.getByRole("button", { name: "折叠后仍保留的名称", exact: true }),
  ).toBeHidden();
  await toggle.click();
  await expect(
    sidebar.getByRole("button", { name: "折叠后仍保留的名称", exact: true }),
  ).toBeVisible();
});

test("new project folder heading actually toggles its contents", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  const toggle = page.getByRole("button", { name: "新建文件夹", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".project-folder-empty")).toBeHidden();
  await toggle.click();
  await expect(page.locator(".project-folder-empty")).toBeVisible();
});

test("pressing the canvas add trigger again closes its menu", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const trigger = page.getByRole("button", { name: "添加资源", exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".add-node-menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("dragging from inside a modal to its backdrop does not dismiss it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "设置", exact: true });
  const box = (await modal.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(3, 3, { steps: 10 });
  await page.mouse.up();
  await expect(modal).toBeVisible();
  await page.mouse.click(3, 3);
  await expect(modal).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
});

test("task details close before their parent and restore the task card focus", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开任务列表", exact: true }).click();
  const card = page.getByRole("button", {
    name: "查看演示任务 2026/9/5",
    exact: true,
  });
  await card.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "任务详情", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "任务列表", exact: true }),
  ).toBeVisible();
  await expect(card).toBeFocused();
  await card.click();
  await page.getByRole("button", { name: "关闭任务详情", exact: true }).click();
  await expect(card).toBeFocused();
  await expect(
    page.getByRole("dialog", { name: "任务详情", exact: true }),
  ).toHaveCount(0);
});

test("a canvas-positioned add menu closes on another blank canvas click", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.mouse.dblclick(580, 850);
  await expect(page.locator(".add-node-menu")).toBeVisible();
  await page.mouse.click(1000, 850);
  await expect(page.locator(".add-node-menu")).toHaveCount(0);
});

test("responsive sidebar collapse clears hidden project menus without losing row state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "更多项目设置", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("menu", { name: "项目设置", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(
    page.getByRole("menu", { name: "项目设置", exact: true }),
  ).toHaveCount(0);
});

test("canvas prompt expansion and conversation folding retain the draft and selected node", async ({
  page,
}) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  await node.focus();
  await page.keyboard.press("Enter");
  const prompt = page.getByLabel("图片提示词", { exact: true });
  await prompt.fill("展开收起后仍保留的画布草稿");
  const position = await node.getAttribute("style");
  await page.getByRole("button", { name: "展开提示词", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "收起提示词", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "收起提示词", exact: true }).click();
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(prompt).toHaveValue("展开收起后仍保留的画布草稿");
  await expect(node).toHaveAttribute("style", position!);
});
