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

test("插件管理拒绝明文地址并说明远程代码权限", async ({ page }, info) => {
  let requests = 0;
  await page.route("http://example.invalid/unsafe-plugin.js", (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto("/");
  await page
    .locator(".start-composer")
    .getByRole("button", { name: "插件", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "管理画布插件" }).click();
  await expect(
    page.getByText(
      "远程插件会以应用权限运行。请仅安装你信任的 HTTPS 插件地址。",
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "插件地址" })
    .fill("http://example.invalid/unsafe-plugin.js");
  await page.getByRole("button", { name: "安装", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("仅支持 HTTPS 插件地址");
  expect(requests).toBe(0);
  await page.screenshot({
    path: info.outputPath("plugin-http-rejected.png"),
    animations: "disabled",
  });
});
