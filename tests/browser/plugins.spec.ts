import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("插件分组：添加菜单列出内置插件，创建后按 plugin 变体渲染", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  const menu = page.locator(".add-node-menu");
  await expect(menu).toBeVisible();
  // 内置插件随应用启动发现并默认启用，出现在「插件」分组。
  await expect(
    menu.getByRole("menuitem", { name: "HTML", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Markdown", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "便利贴", exact: true }),
  ).toBeVisible();
  await menu.getByRole("menuitem", { name: "SVG", exact: true }).click();
  const node = page.locator('[data-plugin-type="svg:vector"]');
  await expect(node).toBeVisible();
  await expect(node).toHaveClass(/plugin-node/);
  // 框架使用 plugin 变体与插件默认尺寸（svg 默认 320×320）。
  await expect(page.locator(".canvas-node-plugin")).toHaveCount(1);
  await expect(page.locator(".canvas-node-plugin")).toHaveAttribute(
    "style",
    /width: 320px/,
  );
});
