import { expect } from "@playwright/test";

export const bundledPlugins = [
  {
    title: "HTML",
    type: "html:render",
    file: "html.js",
    content: "<p>HTML 内容恢复 001</p>",
  },
  {
    title: "Markdown",
    type: "markdown:doc",
    file: "markdown.js",
    content: "# Markdown 内容恢复 001\n\n**完整正文**",
  },
  {
    title: "便利贴",
    type: "sticky-note:note",
    file: "sticky-note.js",
    content: "便利贴内容恢复 001\n第二行完整保留",
  },
  {
    title: "SVG",
    type: "svg:vector",
    file: "svg.js",
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text x="5" y="30">SVG 恢复 001</text></svg>',
  },
];

export async function addAndEditBundledPlugins(page) {
  for (const plugin of bundledPlugins) {
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page
      .locator(".add-node-menu")
      .getByRole("menuitem", { name: plugin.title, exact: true })
      .click();
    const node = page.locator(`[data-plugin-type="${plugin.type}"]`);
    await expect(node).toBeVisible();
    if (plugin.title === "HTML" || plugin.title === "Markdown") {
      await node
        .getByTitle(`编辑 ${plugin.title} 源码`, { exact: true })
        .click();
    } else if (plugin.title === "SVG") {
      await node.getByTitle("编辑源码", { exact: true }).click();
    } else {
      await node.dblclick();
    }
    await node.locator("textarea").fill(plugin.content);
    if (plugin.title === "HTML" || plugin.title === "Markdown") {
      await node.getByTitle("预览渲染结果", { exact: true }).click();
    } else {
      await node.locator("textarea").press("Escape");
    }
  }
  await expectBundledPluginContents(page);
}

export async function expectBundledPluginContents(page) {
  for (const plugin of bundledPlugins) {
    const node = page.locator(`[data-plugin-type="${plugin.type}"]`);
    await expect(node).toBeVisible();
    if (plugin.title === "HTML") {
      await expect(node.locator("iframe")).toHaveAttribute(
        "srcdoc",
        plugin.content,
      );
    } else if (plugin.title === "Markdown") {
      await expect(node.getByRole("heading", { level: 1 })).toHaveText(
        "Markdown 内容恢复 001",
      );
      await expect(node.locator("strong")).toHaveText("完整正文");
    } else if (plugin.title === "SVG") {
      await expect(node.locator("svg text")).toHaveText("SVG 恢复 001");
    } else {
      await expect(node).toContainText(plugin.content);
    }
  }
}
