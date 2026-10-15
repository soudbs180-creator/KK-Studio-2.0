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
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  await page.getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true }).click();
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

test("手机延迟插件启用可停止等待并恢复导航，迟到模块不改变停用状态", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const source = `await new Promise(resolve => { window.__releaseCancelledPlugin = resolve; });
      window.__cancelledModuleCompleted = true;
      export default () => {
        window.__cancelledPluginFactories = (window.__cancelledPluginFactories || 0) + 1;
        return { id: "cancel-fixture", name: "Cancel fixture", version: "2", nodes: [{ type: "cancel-fixture:card", title: "Fixture", icon: "", defaultSize: { width: 100, height: 100 }, Content: () => null }] };
      };`;
    localStorage.setItem(
      "canvas-plugins",
      JSON.stringify([
        {
          id: "cancel-fixture",
          name: "Cancel fixture",
          version: "0",
          url: "https://example.test/cancel-fixture.js",
          source,
          enabled: false,
        },
      ]),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog
    .getByRole("button", { name: "返回设置分类", exact: true })
    .click();
  await dialog.getByRole("button", { name: "扩展", exact: true }).click();
  await dialog
    .getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true })
    .click();
  const toggle = dialog.getByRole("switch", {
    name: "启用 Cancel fixture",
    exact: true,
  });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as Window & { __releaseCancelledPlugin?: () => void })
            .__releaseCancelledPlugin,
      ),
    )
    .toBe("function");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(toggle).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "返回设置分类", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "停止等待插件操作", exact: true })
    .click();
  await expect(
    dialog.locator(".plugin-manager").getByRole("alert"),
  ).toContainText("模块可能已执行");
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(
    dialog.getByRole("button", { name: "返回设置分类", exact: true }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() =>
    (
      window as Window & { __releaseCancelledPlugin?: () => void }
    ).__releaseCancelledPlugin?.(),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { __cancelledModuleCompleted?: boolean })
            .__cancelledModuleCompleted,
        ),
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __cancelledPluginFactories?: number })
          .__cancelledPluginFactories ?? 0,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(() => {
      const records = JSON.parse(
        localStorage.getItem("canvas-plugins") ?? "[]",
      ) as Array<{ id: string; enabled: boolean; version: string }>;
      return records.find((record) => record.id === "cancel-fixture");
    }),
  ).toMatchObject({ enabled: false, version: "0" });
});
