import { expect, test } from "@playwright/test";
import { openWorkspace, expandSidebar, openSettingsSection } from "./helpers";
import { inspectPage } from "./uiPageRules";

for (const width of [390, 1099, 1920]) {
  test.use({ reducedMotion: "reduce" });
  for (const surface of [
    "home",
    "account",
    "extensions",
    "comfy",
    "search",
    "help",
    "shortcuts",
    "plugin-settings",
    "subject",
    "asset-detail",
  ]) {
    test(`全部页面新UI ${surface} ${width}`, async ({ page }, info) => {
      const entryWidth = width;
      await page.setViewportSize({
        width: entryWidth,
        height: width === 390 ? 844 : 1080,
      });
      await page.goto("/");
      let root = page.locator(".start-page");
      if (surface === "account") {
        await page
          .getByRole("button", { name: "个人信息", exact: true })
          .click();
        root = page.locator(".account-popup");
      } else if (surface === "comfy") {
        await openSettingsSection(page, "模型接入");
        await page.getByRole("button", { name: "本地", exact: true }).click();
        root = page.getByRole("dialog", { name: "设置", exact: true });
      } else if (surface === "extensions") {
        if (entryWidth >= 768) await expandSidebar(page);
        await page
          .getByRole("complementary", { name: "工作台侧栏" })
          .getByRole("button", {
            name: "扩展",
            exact: true,
          })
          .click();
        root = page.locator(".catalog-page-skills");
      } else if (surface === "search") {
        await openWorkspace(page);
        await page.getByRole("button", { name: "搜索", exact: true }).click();
        await page.getByLabel("搜索内容", { exact: true }).fill("Agent");
        root = page.locator(".catalog-panel");
      } else if (surface === "help") {
        if (width < 768) {
          await page
            .getByRole("button", { name: "应用功能菜单", exact: true })
            .click();
          await page
            .getByRole("menuitem", { name: "使用说明", exact: true })
            .click();
        } else {
          await page.getByRole("button", { name: "帮助", exact: true }).click();
          await page
            .locator(".menu-popover")
            .getByRole("button", { name: "使用说明", exact: true })
            .click();
        }
        root = page.locator(".info-panel");
      } else if (surface === "shortcuts") {
        await openWorkspace(page);
        const close = page.getByRole("button", {
          name: "收起对话",
          exact: true,
        });
        if (await close.isVisible()) await close.click();
        await page
          .getByRole("button", { name: "帮助与快捷键", exact: true })
          .click();
        await page
          .getByRole("menuitem", { name: "快捷按键", exact: true })
          .click();
        root = page.locator(".shortcuts-panel");
      } else if (surface === "plugin-settings") {
        await openSettingsSection(page, "扩展与 MCP");
        await page.getByRole("tab", { name: /^MCP/ }).click();
        root = page.getByRole("dialog", { name: "设置", exact: true });
      } else if (surface === "subject" || surface === "asset-detail") {
        await openWorkspace(page);
        if (width < 768) {
          await page
            .getByRole("button", { name: "应用功能菜单", exact: true })
            .click();
          await page
            .getByRole("menuitem", { name: "资产管理", exact: true })
            .click();
        } else {
          await page.getByRole("button", { name: "文件", exact: true }).click();
          await page
            .locator(".menu-popover")
            .getByRole("button", { name: "资产管理", exact: true })
            .click();
        }
        root = page.getByTestId("asset-panel");
        if (surface === "subject") {
          await page.getByRole("tab", { name: "资产", exact: true }).click();
          await page
            .getByRole("button", { name: "创建主体", exact: true })
            .click();
          root = page.getByRole("dialog", { name: "创建主体", exact: true });
          await expect(root.locator(".asset-create form")).toHaveCSS(
            "border-radius",
            "20px",
          );
          await expect(root.getByPlaceholder("例如：品牌代言人")).toHaveCSS(
            "height",
            "32px",
          );
          await expect(
            root.getByRole("button", { name: "取消", exact: true }),
          ).toHaveCSS("border-radius", "999px");
        } else {
          await root.locator(".asset-card").first().press("Enter");
          await expect(root.locator(".asset-large-preview")).toHaveCSS(
            "border-radius",
            "16px",
          );
          await expect(
            root.getByRole("button", { name: "加入本地集合", exact: true }),
          ).toHaveCSS("height", "32px");
          await expect(
            root.getByRole("button", { name: "加入本地集合", exact: true }),
          ).toHaveCSS("border-radius", "999px");
        }
      }
      await inspectPage(page, root, `${surface}-${width}`, info);
      if (surface === "home") {
        await expect(page.locator(".start-inspiration-card").first()).toHaveCSS(
          "border-radius",
          "20px",
        );
      } else if (surface === "search") {
        await expect(root.locator(".catalog-search")).toHaveCSS(
          "height",
          "40px",
        );
      } else if (surface === "help") {
        await expect(
          root.getByRole("button", { name: "关闭", exact: true }),
        ).toHaveCSS("width", "32px");
      } else if (surface === "shortcuts") {
        await expect(root).toHaveCSS("border-radius", "20px");
      }
    });
  }
}
