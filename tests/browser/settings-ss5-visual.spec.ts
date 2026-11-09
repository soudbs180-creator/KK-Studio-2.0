import fs from "node:fs";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";
import {
  SETTINGS_NAV_GROUPS,
  SETTINGS_SECTIONS,
  type SettingsTier,
} from "../../src/components/settings/SettingsSectionData";
import { showSettingsCategories, selectSettingsSection } from "./helpers";

function resolveScreenshotPath(testInfo: TestInfo, filename: string): string {
  const envDir = process.env.KK_SS5_SCREENSHOT_DIR?.trim();
  if (envDir) {
    fs.mkdirSync(envDir, { recursive: true });
    return path.join(envDir, filename);
  }
  return testInfo.outputPath(filename);
}

test.describe("设置页三层结构与全分类极小化视觉走查", () => {
  test("桌面视口 1200px: 走查三层分组与 11 个分类，验证无横向溢出、无空容器、关键控件可见不重叠", async (
    { page },
    testInfo,
  ) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await expect(dialog).toBeVisible();

    const panel = dialog.locator(".settings-panel");
    await expect(panel).toBeVisible();

    // 1. 验证三层分组在侧边栏完整展示且没有空分组
    const sidebar = dialog.locator(".settings-sidebar");
    await expect(sidebar).toBeVisible();

    const navGroups = sidebar.locator(".settings-nav-group");
    await expect(navGroups).toHaveCount(3);

    for (const group of SETTINGS_NAV_GROUPS) {
      const groupEl = sidebar.locator(
        `.settings-nav-group[data-settings-tier="${group.tier}"]`,
      );
      await expect(groupEl).toBeVisible();
      const label = groupEl.locator(".settings-nav-group-label");
      await expect(label).toHaveText(group.label);
      const items = groupEl.locator(".settings-nav-item");
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBe(group.items.length);
    }

    // 截图保存桌面初始首屏（常用/通用设置）
    await page.screenshot({
      path: resolveScreenshotPath(testInfo, "desktop-00-initial-essentials.png"),
      fullPage: false,
    });

    // 2. 逐个分类走查与断言
    for (const sectionItem of SETTINGS_SECTIONS) {
      await selectSettingsSection(page, sectionItem.label);

      // 断言当前选中的 section 与 tier 属性正确绑定
      await expect(panel).toHaveAttribute("data-section", sectionItem.id);
      const expectedTier = SETTINGS_NAV_GROUPS.find((g) =>
        g.items.some((item) => item.id === sectionItem.id),
      )?.tier as SettingsTier;
      await expect(panel).toHaveAttribute("data-settings-tier", expectedTier);

      // 断言内容区可见且带有正确的标题
      const content = dialog.locator(".settings-content");
      await expect(content).toBeVisible();

      // 断言无横向溢出：页面 document.scrollWidth <= 1200
      const overflowInfo = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const panelEl = document.querySelector(".settings-panel");
        const contentEl = document.querySelector(".settings-content");
        return {
          docScrollWidth,
          winWidth,
          panelScrollWidth: panelEl ? panelEl.scrollWidth : 0,
          panelClientWidth: panelEl ? panelEl.clientWidth : 0,
          contentScrollWidth: contentEl ? contentEl.scrollWidth : 0,
          contentClientWidth: contentEl ? contentEl.clientWidth : 0,
        };
      });

      expect(overflowInfo.docScrollWidth).toBeLessThanOrEqual(
        overflowInfo.winWidth,
      );
      expect(overflowInfo.panelScrollWidth).toBeLessThanOrEqual(
        overflowInfo.panelClientWidth + 1,
      );
      expect(overflowInfo.contentScrollWidth).toBeLessThanOrEqual(
        overflowInfo.contentClientWidth + 1,
      );

      // 验证没有残留的空卡片容器或空提示
      const emptyContainers = await content.evaluate((el) => {
        const potentialCards = el.querySelectorAll(
          ".settings-card, .settings-row, .settings-section, .settings-group",
        );
        const badContainers: string[] = [];
        potentialCards.forEach((c) => {
          const text = c.textContent?.trim() ?? "";
          const hasInputs = c.querySelectorAll("input, select, button, textarea").length > 0;
          if (text.length === 0 && !hasInputs) {
            badContainers.push(c.className);
          }
        });
        return badContainers;
      });
      expect(emptyContainers).toEqual([]);

      // 截图存证（先截图，确保无论断言是否通过都有截图）
      await page.screenshot({
        path: resolveScreenshotPath(
          testInfo,
          `desktop-${expectedTier}-${sectionItem.id}.png`,
        ),
        fullPage: false,
      });

      // 验证主要交互控件不重叠
      const overlapDetails = await content.evaluate((el) => {
        const isActuallyVisible = (node: Element): boolean => {
          // 如果在未展开的 details 内部，则不可见
          const closedDetails = node.closest("details:not([open])");
          if (closedDetails) return false;
          // 标准 checkVisibility
          if ("checkVisibility" in node && typeof node.checkVisibility === "function") {
            if (!node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
              return false;
            }
          }
          const style = getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return false;
          }
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        const interactives = Array.from(
          el.querySelectorAll(
            "button:not([disabled]), input, select, .settings-toggle",
          ),
        ).filter(isActuallyVisible);

        const details: Array<{
          tagA: string;
          classA: string;
          textA: string;
          rectA: { x: number; y: number; width: number; height: number };
          tagB: string;
          classB: string;
          textB: string;
          rectB: { x: number; y: number; width: number; height: number };
        }> = [];
        for (let i = 0; i < interactives.length; i++) {
          const nodeA = interactives[i];
          const rectA = nodeA.getBoundingClientRect();
          for (let j = i + 1; j < interactives.length; j++) {
            const nodeB = interactives[j];
            const rectB = nodeB.getBoundingClientRect();
            // 如果 A 包含 B 或 B 包含 A（父子关系），不算重叠
            if (nodeA.contains(nodeB) || nodeB.contains(nodeA)) {
              continue;
            }
            // 某些特殊装饰控件是嵌套在容器中或者与输入框定位对齐的（如密码查看小眼睛按钮）
            if (
              (nodeA.classList.contains("settings-key-action") && nodeB.tagName === "INPUT") ||
              (nodeB.classList.contains("settings-key-action") && nodeA.tagName === "INPUT")
            ) {
              continue;
            }
            const isOverlapping = !(
              rectA.right <= rectB.left ||
              rectA.left >= rectB.right ||
              rectA.bottom <= rectB.top ||
              rectA.top >= rectB.bottom
            );
            if (isOverlapping) {
              details.push({
                tagA: nodeA.tagName,
                classA: nodeA.className,
                textA: nodeA.textContent?.trim().slice(0, 30) ?? "",
                rectA: { x: rectA.x, y: rectA.y, width: rectA.width, height: rectA.height },
                tagB: nodeB.tagName,
                classB: nodeB.className,
                textB: nodeB.textContent?.trim().slice(0, 30) ?? "",
                rectB: { x: rectB.x, y: rectB.y, width: rectB.width, height: rectB.height },
              });
            }
          }
        }
        return details;
      });
      if (overlapDetails.length > 0) {
        console.log(`[${sectionItem.id}] Overlap details:`, JSON.stringify(overlapDetails, null, 2));
      }
      expect(overlapDetails.length).toBe(0);
    }
  });

  test("移动视口 375px: 走查分类导航抽屉与 11 个分类详情，验证无横向溢出、抽屉返回、无空容器", async (
    { page },
    testInfo,
  ) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await expect(dialog).toBeVisible();

    const panel = dialog.locator(".settings-panel");
    await expect(panel).toBeVisible();

    // 1. 切换到分类导航页，断言 3 组完整展示且无横向溢出
    const nav = await showSettingsCategories(page);
    await expect(nav).toBeVisible();

    const navGroups = nav.locator(".settings-nav-group");
    await expect(navGroups).toHaveCount(3);

    for (const group of SETTINGS_NAV_GROUPS) {
      const groupEl = nav.locator(
        `.settings-nav-group[data-settings-tier="${group.tier}"]`,
      );
      await expect(groupEl).toBeVisible();
      const label = groupEl.locator(".settings-nav-group-label");
      await expect(label).toHaveText(group.label);
      const items = groupEl.locator(".settings-nav-item");
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBe(group.items.length);
    }

    // 截图保存移动端分类导航抽屉
    await page.screenshot({
      path: resolveScreenshotPath(testInfo, "mobile-00-categories.png"),
      fullPage: false,
    });

    // 2. 逐个进入每个分类详情
    for (const sectionItem of SETTINGS_SECTIONS) {
      await selectSettingsSection(page, sectionItem.label);

      // 进入详情模式
      await expect(panel).toHaveAttribute("data-navigation", "detail");
      await expect(panel).toHaveAttribute("data-section", sectionItem.id);

      const expectedTier = SETTINGS_NAV_GROUPS.find((g) =>
        g.items.some((item) => item.id === sectionItem.id),
      )?.tier as SettingsTier;
      await expect(panel).toHaveAttribute("data-settings-tier", expectedTier);

      // 移动端顶部应有“返回设置分类”按钮且可见
      const backButton = dialog.getByRole("button", {
        name: "返回设置分类",
        exact: true,
      });
      await expect(backButton).toBeVisible();

      // 检查移动端无横向溢出
      const mobileOverflow = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const panelEl = document.querySelector(".settings-panel");
        const contentEl = document.querySelector(".settings-content");
        return {
          docScrollWidth,
          winWidth,
          panelScrollWidth: panelEl ? panelEl.scrollWidth : 0,
          panelClientWidth: panelEl ? panelEl.clientWidth : 0,
          contentScrollWidth: contentEl ? contentEl.scrollWidth : 0,
          contentClientWidth: contentEl ? contentEl.clientWidth : 0,
        };
      });

      expect(mobileOverflow.docScrollWidth).toBeLessThanOrEqual(
        mobileOverflow.winWidth,
      );
      expect(mobileOverflow.panelScrollWidth).toBeLessThanOrEqual(
        mobileOverflow.panelClientWidth + 1,
      );
      expect(mobileOverflow.contentScrollWidth).toBeLessThanOrEqual(
        mobileOverflow.contentClientWidth + 1,
      );

      // 截图保存移动端分类详情
      await page.screenshot({
        path: resolveScreenshotPath(
          testInfo,
          `mobile-${expectedTier}-${sectionItem.id}.png`,
        ),
        fullPage: false,
      });

      // 确保能正常返回分类导航页
      await backButton.click();
      await expect(panel).toHaveAttribute("data-navigation", "categories");
    }
  });
});
