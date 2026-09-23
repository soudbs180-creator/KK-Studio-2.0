import { expect, test, type Locator } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";
import { ACCENTS, contrast } from "../helpers/designSystem.ts";

async function toggleCycle(trigger: Locator, popup: Locator) {
  await trigger.click();
  await expect(popup).toBeVisible();
  await trigger.click();
  await expect(popup).toBeHidden();
  await trigger.click();
  await expect(popup).toBeVisible();
  await trigger.press("Escape");
  await expect(popup).toBeHidden();
  await expect(trigger).toBeFocused();
}

for (const width of [390, 768, 1280, 1920]) {
  test(`canvas popovers toggle, dismiss and return focus at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1080 });
    await openWorkspace(page);
    await showCanvasNavigation(page);
    for (const [label, selector] of [
      ["打开任务列表", ".task-panel"],
      ["添加资源", ".add-node-menu"],
      ["选择画布工具", ".canvas-tool-menu"],
      ["帮助与快捷键", ".canvas-help-menu"],
      ["画布缩放", ".canvas-zoom-menu"],
      ["小地图", ".canvas-minimap"],
    ]) {
      await toggleCycle(
        page.getByRole("button", { name: label, exact: true }),
        page.locator(selector),
      );
    }
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page
      .getByRole("button", { name: "选择画布工具", exact: true })
      .click();
    await expect(page.locator(".add-node-menu")).toHaveCount(0);
    await expect(page.locator(".canvas-tool-menu")).toBeVisible();
    await page.getByRole("button", { name: "画布缩放", exact: true }).click();
    await expect(page.locator(".canvas-tool-menu")).toHaveCount(0);
    await page.keyboard.press("Escape");
    const tasks = page.getByRole("button", {
      name: "打开任务列表",
      exact: true,
    });
    await tasks.click();
    await page
      .getByRole("button", { name: "关闭任务列表", exact: true })
      .click();
    await expect(tasks).toBeFocused();
    const closeChat = page.getByRole("button", {
      name: "收起对话",
      exact: true,
    });
    if (await closeChat.isVisible()) await closeChat.click();
    const openChat = page.getByRole("button", {
      name: "打开对话",
      exact: true,
    });
    const triggerBox = (await openChat.boundingBox())!;
    const canvasBox = (await page
      .getByTestId("infinite-canvas")
      .boundingBox())!;
    expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(
      canvasBox.x + canvasBox.width,
    );
    await openChat.click();
    await expect(page.locator(".conversation-panel")).toBeVisible();
    await closeChat.click();
    await expect(openChat).toBeFocused();
  });

  test(`HUD stays separate through sidebar and chat folding at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1080 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWorkspace(page);
    await showCanvasNavigation(page);
    for (const folded of [false, true]) {
      const sidebar = page.locator(".sidebar");
      if (width > 800 && folded)
        await page
          .getByRole("button", { name: "收起侧边栏", exact: true })
          .click();
      for (const theme of ["dark", "light"]) {
        await page
          .getByRole("button", { name: "打开设置", exact: true })
          .click();
        const settings = page.getByRole("dialog", {
          name: "设置",
          exact: true,
        });
        await settings.getByLabel("主题", { exact: true }).selectOption(theme);
        await settings
          .getByLabel("强调色", { exact: true })
          .selectOption(folded ? "orange" : "default");
        await page.keyboard.press("Escape");
        if (
          width <= 800 &&
          !(await sidebar.getAttribute("class"))?.includes("is-collapsed")
        )
          await page.keyboard.press("Escape");
        // Synthetic long copy stresses layout only; it does not claim a real provider response.
        await page.locator(".project-task-status strong").evaluate((el) => {
          el.textContent = "包含很长名称的项目与生成进度状态".repeat(5);
        });
        const selectors = [
          ".task-button",
          ".project-task-status",
          ".canvas-top-right",
          ".canvas-toolbar",
        ];
        const boxes = await Promise.all(
          selectors.map((selector) => page.locator(selector).boundingBox()),
        );
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i]!;
          expect(a, selectors[i]).toBeTruthy();
          expect(a.x, selectors[i]).toBeGreaterThanOrEqual(0);
          expect(a.x + a.width, selectors[i]).toBeLessThanOrEqual(width + 1);
          for (let j = i + 1; j < boxes.length; j++) {
            const b = boxes[j]!;
            const area =
              Math.max(
                0,
                Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
              ) *
              Math.max(
                0,
                Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
              );
            expect(area, `${selectors[i]} overlaps ${selectors[j]}`).toBe(0);
          }
        }
        const paint = await page
          .locator(".project-task-status")
          .evaluate((el) => ({
            color: getComputedStyle(el).color,
            bg: getComputedStyle(el).backgroundColor,
          }));
        expect(contrast(paint.color, paint.bg)).toBeGreaterThanOrEqual(4.5);
        await page.screenshot({
          path: info.outputPath(`${theme}-${folded ? "folded" : "open"}.png`),
          animations: "disabled",
        });
      }
    }
  });
}

test("sidebar menus, app menus and prompt dialog keep closure and focus contracts", async ({
  page,
}) => {
  await page.goto("/");
  await toggleCycle(
    page.getByRole("button", { name: "项目显示与排序", exact: true }),
    page.getByRole("menu", { name: "项目显示与排序" }),
  );
  await toggleCycle(
    page.getByRole("button", { name: "个人信息", exact: true }),
    page.getByLabel("个人信息（本地 Prototype）"),
  );
  const menus = page.getByRole("navigation", { name: "应用菜单" });
  for (const name of ["文件", "编辑", "窗口", "帮助"])
    await toggleCycle(
      menus.getByRole("button", { name, exact: true }),
      menus.locator(".menu-popover"),
    );
  const trigger = menus.getByRole("button", { name: "文件", exact: true });
  await trigger.click();
  await menus.getByRole("button", { name: "提示词库", exact: true }).click();
  await expect(menus.locator(".menu-popover")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "提示词库", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("minimum-zoom patterns remain visible for both themes and all accents", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const canvas = page.getByTestId("infinite-canvas");
  await canvas.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("Control+-");
  for (const theme of ["dark", "light"]) {
    for (const accent of ACCENTS) {
      await page.getByRole("button", { name: "打开设置", exact: true }).click();
      const settings = page.getByRole("dialog", { name: "设置", exact: true });
      await settings.getByLabel("主题", { exact: true }).selectOption(theme);
      await settings.getByLabel("强调色", { exact: true }).selectOption(accent);
      await page.keyboard.press("Escape");
      for (const pattern of ["dots", "grid"]) {
        if (
          !(await canvas.getAttribute("class"))?.includes(
            `canvas-pattern-${pattern}`,
          )
        )
          await page
            .getByRole("button", {
              name: pattern === "dots" ? "切换为点状背景" : "切换为网格背景",
              exact: true,
            })
            .click();
        const paint = await canvas.evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            pitch: parseFloat(style.backgroundSize),
            image: style.backgroundImage,
            opacity: Number(style.getPropertyValue("--canvas-pattern-opacity")),
          };
        });
        expect(paint.pitch).toBeGreaterThanOrEqual(12);
        expect(paint.image).not.toBe("none");
        expect(paint.opacity).toBeGreaterThan(0.1);
      }
    }
  }
});
