import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test.afterEach(async ({ page }, testInfo) => {
  const runtime = await page.evaluate(() => ({
    url: location.href,
    runtime: document.documentElement.dataset,
    scripts: Array.from(document.scripts).map((s) => s.src),
    styles: Array.from(document.styleSheets).map((s) => s.href),
    width: innerWidth,
    height: innerHeight,
  }));
  await testInfo.attach("runtime", {
    body: JSON.stringify(runtime),
    contentType: "application/json",
  });
  if (testInfo.status !== testInfo.expectedStatus)
    await page.screenshot({ path: testInfo.outputPath("failure.png") });
});

for (const width of [390, 1440]) {
  test(`创作模式弹层对齐实际触发按钮并保持8px间距 ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const trigger = page.locator(".start-mode-picker > button");
    await trigger.click();
    const menu = page.locator(".start-mode-popover");
    await expect(menu).toBeVisible();
    const button = (await trigger.boundingBox())!;
    const popup = (await menu.boundingBox())!;
    const panel = (await page.locator(".start-page").boundingBox())!;
    const expectedLeft = Math.max(
      panel.x + 8,
      Math.min(
        button.x,
        Math.min(width, panel.x + panel.width) - 8 - popup.width,
      ),
    );
    expect(Math.abs(popup.x - expectedLeft)).toBeLessThan(1);
    const gap =
      popup.y > button.y
        ? popup.y - button.y - button.height
        : button.y - popup.y - popup.height;
    expect(Math.abs(gap - 8)).toBeLessThan(1);
    await menu
      .getByRole("menuitemradio", { name: "询问", exact: true })
      .click();
    await expect(trigger).toHaveAccessibleName("当前模式：询问");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("mode-anchor.png") });
  });
}

for (const width of [320, 390, 768, 1920]) {
  test(`首页按当前母版保留触控尺寸、图标比例和内容边界 ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const form = page.locator(".start-composer");
    await expect(form).toBeVisible();
    const data = await form.evaluate((surface) => {
      const frame = surface.getBoundingClientRect();
      return {
        frame: { width: frame.width, height: frame.height },
        children: Array.from(surface.children).map((child) => {
          const style = getComputedStyle(child);
          return {
            className: child.className,
            height: child.getBoundingClientRect().height,
            display: style.display,
            position: style.position,
            marginTop: style.marginTop,
          };
        }),
        buttons: Array.from(
          surface.querySelectorAll(".composer-toolbar button"),
        ).map((button) => {
          const box = button.getBoundingClientRect();
          const icon = button.querySelector("svg,img");
          const glyph = icon?.getBoundingClientRect();
          return {
            name:
              button.getAttribute("aria-label") || button.textContent?.trim(),
            height: box.height,
            width: box.width,
            inside:
              box.left >= frame.left &&
              box.right <= frame.right &&
              box.top >= frame.top &&
              box.bottom <= frame.bottom,
            graphic: glyph && [glyph.width, glyph.height],
            center: glyph && [
              glyph.x + glyph.width / 2 - box.x - box.width / 2,
              glyph.y + glyph.height / 2 - box.y - box.height / 2,
            ],
          };
        }),
      };
    });
    const target = width <= 1200 ? 44 : 32;
    await testInfo.attach("home-geometry", {
      body: JSON.stringify(data),
      contentType: "application/json",
    });
    for (const button of data.buttons) {
      expect(button.inside, button.name ?? "button").toBe(true);
      expect(button.height, button.name ?? "button").toBe(
        button.name === "开始创建项目" ? 44 : target,
      );
      if (
        ["添加参考素材", "开启语音输入", "开始创建项目"].includes(
          button.name ?? "",
        )
      ) {
        const graphic =
          button.name === "开始创建项目" ? 28 : target === 44 ? 28 : 20;
        expect(button.graphic, button.name ?? "button").toEqual([
          graphic,
          graphic,
        ]);
        expect(button.center!.every((value) => Math.abs(value) < 0.6)).toBe(
          true,
        );
      }
    }
    if (width === 1920) expect(data.frame.height).toBe(156);
    if (width === 390) expect(data.frame.height).toBe(132);
    if (width < 768) {
      for (const name of ["搜索", "切换项目", "打开设置", "应用功能菜单"]) {
        const button = page
          .locator(".topbar")
          .getByRole("button", { name, exact: true });
        const box = (await button.boundingBox())!;
        const icon = (await button.locator("svg").boundingBox())!;
        expect([box.width, box.height]).toEqual([44, 44]);
        expect([icon.width, icon.height]).toEqual([28, 28]);
        expect(Math.abs(icon.x + 14 - box.x - 22)).toBeLessThan(0.6);
        expect(Math.abs(icon.y + 14 - box.y - 22)).toBeLessThan(0.6);
      }
    }
    await testInfo.attach("home-geometry", {
      body: JSON.stringify(data),
      contentType: "application/json",
    });
    await page.screenshot({ path: testInfo.outputPath("current-home.png") });
  });
}

test("画布共享底栏保持六个44圆形入口和居中图标", async ({ page }, testInfo) => {
  await openWorkspace(page);
  const dock = page.getByRole("toolbar", { name: "画布工具", exact: true });
  await expect(dock).toBeVisible();
  const buttons = dock.locator(":scope > button");
  await expect(buttons).toHaveCount(6);
  const geometry = await dock.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    actions: Array.from(element.querySelectorAll(":scope > button")).map(
      (button) => {
        const hit = button.getBoundingClientRect();
        const icon = button
          .querySelector("img,.toolbar-icon,.tool-hand-current")!
          .getBoundingClientRect();
        return {
          label: button.getAttribute("aria-label"),
          width: hit.width,
          height: hit.height,
          glyphWidth: icon.width,
          glyphHeight: icon.height,
          dx: icon.x + icon.width / 2 - hit.x - hit.width / 2,
          dy: icon.y + icon.height / 2 - hit.y - hit.height / 2,
        };
      },
    ),
  }));
  expect(geometry.width).toBe(304);
  expect(geometry.height).toBe(52);
  for (const action of geometry.actions) {
    expect(action.width).toBe(44);
    expect(action.height).toBe(44);
    expect(action.glyphWidth).toBe(action.label === "展开画布工具" ? 8 : 28);
    expect(action.glyphHeight).toBe(action.label === "展开画布工具" ? 8 : 28);
    expect(Math.abs(action.dx)).toBeLessThan(0.6);
    expect(Math.abs(action.dy)).toBeLessThan(0.6);
  }
  await testInfo.attach("geometry", {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
  await page.screenshot({
    path: testInfo.outputPath("canvas-shared-controls.png"),
  });
});

test("独立箭头展开工具菜单并与按钮左边及上方8px对齐", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "选择画布工具", exact: true }).click();
  await expect(page.getByRole("menu", { name: "画布工具选择" })).toHaveCount(0);
  const trigger = page.getByRole("button", {
    name: "展开画布工具",
    exact: true,
  });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "画布工具选择" });
  await expect(menu).toBeVisible();
  const anchor = (await trigger.boundingBox())!;
  const box = (await menu.boundingBox())!;
  expect(Math.abs(box.x - anchor.x)).toBeLessThan(1);
  expect(Math.abs(anchor.y - box.y - box.height - 8)).toBeLessThan(1);
  await menu
    .getByRole("menuitemradio", { name: "小手工具", exact: true })
    .click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator(".tool-hand-current")).toBeVisible();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("桌面顶部操作同排44高且在可用画布内", async ({ page }, testInfo) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const geometry = await page.locator(".canvas-hud").evaluate((hud) => {
    const bounds = hud.getBoundingClientRect();
    return Array.from(
      hud.querySelectorAll(
        ".canvas-view-mode-btn,.task-button,.canvas-zoom-trigger,.canvas-navigation-tools button",
      ),
    )
      .filter((e) => e.getBoundingClientRect().width)
      .map((e) => {
        const b = e.getBoundingClientRect();
        return {
          label: e.getAttribute("aria-label") ?? e.textContent,
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
          inside: b.x >= bounds.x && b.right <= bounds.right + 1,
        };
      });
  });
  await testInfo.attach("geometry", {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
  for (const entry of geometry) {
    expect(entry.h, entry.label ?? "").toBe(44);
    expect(entry.inside, entry.label ?? "").toBe(true);
  }
  expect(
    Math.max(...geometry.map((e) => e.y)) -
      Math.min(...geometry.map((e) => e.y)),
  ).toBeLessThan(1);
  await testInfo.attach("geometry", {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
});

test("素材库标题可拖动、取消且矮屏操作不被遮挡", async ({ page }, testInfo) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  const handle = page.getByRole("button", { name: "移动素材库", exact: true });
  await expect(handle).toHaveCSS("width", "44px");
  const dialog = page.getByRole("dialog").filter({ has: panel });
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  const before = (await dialog.boundingBox())!;
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    grip.x + grip.width / 2 + 40,
    grip.y + grip.height / 2 + 24,
  );
  expect((await dialog.boundingBox())!.x).toBeGreaterThan(before.x + 30);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(Math.abs((await dialog.boundingBox())!.x - before.x)).toBeLessThan(1);
  await expect(panel).toBeVisible();
  await page.setViewportSize({ width: 390, height: 560 });
  await page.getByRole("tab", { name: "资产", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "创建主体", exact: true }),
  ).toBeInViewport();
  const body = panel.locator(".asset-panel-body");
  expect((await body.boundingBox())!.height).toBeGreaterThan(0);
  await expect(
    panel.getByRole("button", { name: "关闭资产管理", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("asset-short-screen.png"),
  });
});

test("素材库拖至边缘后展开和窗口缩小仍可关闭", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  const dialog = page.getByRole("dialog").filter({ has: panel });
  await dialog.evaluate(async (e) => {
    await Promise.all(e.getAnimations().map((a) => a.finished));
  });
  const handle = panel.getByRole("button", { name: "移动素材库", exact: true });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(1900, box.y + 20);
  await page.mouse.up();
  await panel
    .getByRole("button", { name: "展开资产管理", exact: true })
    .click();
  await expect
    .poll(async () => {
      const b = (await dialog.boundingBox())!;
      return b.x + b.width;
    })
    .toBeLessThanOrEqual(1912);
  await page.setViewportSize({ width: 390, height: 560 });
  await expect
    .poll(async () => {
      const b = (await dialog.boundingBox())!;
      return b.x + b.width;
    })
    .toBeLessThanOrEqual(382);
  await expect(
    panel.getByRole("button", { name: "关闭资产管理", exact: true }),
  ).toBeInViewport();
  await panel
    .getByRole("button", { name: "关闭资产管理", exact: true })
    .click();
  await expect(panel).toHaveCount(0);
});
for (const width of [390, 1099, 1440, 1920]) {
  test(`任务列表跟随44px入口并完整处于视口 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openWorkspace(page);
    await showCanvasNavigation(page);
    const trigger = page.getByRole("button", {
      name: "打开任务列表",
      exact: true,
    });
    await trigger.click();
    const panel = page.getByRole("region", { name: "任务列表", exact: true });
    await expect(panel).toBeVisible();
    await panel.evaluate(async (e) => {
      await Promise.all(e.getAnimations().map((a) => a.finished));
    });
    const anchor = (await trigger.boundingBox())!;
    const box = (await panel.boundingBox())!;
    expect(Math.abs(box.y - anchor.y - anchor.height - 8)).toBeLessThan(1);
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 8);
    await panel
      .getByRole("button", { name: "关闭任务列表", exact: true })
      .click();
    await expect(trigger).toBeFocused();
  });
}
test("素材库列表与网格图标只高亮当前项", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  const list = panel.getByRole("button", { name: "列表视图", exact: true });
  const grid = panel.getByRole("button", { name: "网格视图", exact: true });
  const before = await list.evaluate((e) => getComputedStyle(e).color);
  const active = await grid.evaluate((e) => getComputedStyle(e).color);
  expect(before).not.toBe(active);
  await list.click();
  await expect(list).toHaveCSS("color", active);
  await expect(grid).toHaveCSS("color", before);
});
