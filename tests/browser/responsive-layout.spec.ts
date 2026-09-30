import { expect, test, type Page } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const evidence = "docs/changes/2026-09-22-responsive-ui/evidence/verified";
async function expectInside(page: Page, selector: string) {
  const boxes = await page.locator(selector).evaluateAll((elements) =>
    elements
      .filter(
        (el) =>
          el.getClientRects().length &&
          getComputedStyle(el).visibility !== "hidden",
      )
      .map((el) => {
        const box = el.getBoundingClientRect();
        return {
          name: el.getAttribute("aria-label") ?? el.textContent,
          x: box.x,
          right: box.right,
          y: box.y,
          bottom: box.bottom,
        };
      }),
  );
  for (const box of boxes) {
    expect(box.x, String(box.name)).toBeGreaterThanOrEqual(-1);
    expect(box.right, String(box.name)).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
  }
}

test("phone uses the full content width and centers every navigation icon", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const pageBox = (await page.locator(".start-page").boundingBox())!;
  expect(pageBox.x).toBeLessThanOrEqual(16);
  expect(pageBox.width).toBeGreaterThanOrEqual(358);
  const nav = page.getByRole("navigation", { name: "主导航" });
  const navBox = (await nav.boundingBox())!;
  expect(navBox.y).toBeGreaterThan(740);
  for (const button of await nav.getByRole("button").all()) {
    const b = (await button.boundingBox())!;
    const icon = (await button.locator(".sidebar-icon").boundingBox())!;
    expect(Math.abs(icon.x + icon.width / 2 - b.x - b.width / 2)).toBeLessThan(
      1,
    );
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
});

for (const [width, height] of [
  [360, 740],
  [390, 844],
  [768, 1024],
  [834, 1112],
  [1024, 768],
  [1201, 800],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
]) {
  test(`screen controls and new pages keep their hierarchy at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".app")).toHaveAttribute(
      "data-responsive-surface",
      width < 768 ? "phone" : width <= 1200 ? "tablet" : "desktop",
    );
    const app = (await page.locator(".app").boundingBox())!;
    expect(app).toEqual({ x: 0, y: 0, width, height });
    await expectInside(
      page,
      ".topbar button, .primary-nav button, .start-composer button, .start-composer select",
    );
    const model = page.locator(".start-model-picker > button");
    const icon = (await model.locator("img").boundingBox())!;
    const label = (await model.locator("span").boundingBox())!;
    expect(label.x - icon.x - icon.width).toBeLessThanOrEqual(12);
    await page.screenshot({ path: `${evidence}/${width}-landing.png` });
    for (const [name, heading] of [
      ["项目库", "项目库"],
      ["Skill", "Skill"],
      ["ComfyUI 工作流", "ComfyUI 工作流"],
    ]) {
      await page
        .getByRole("navigation", { name: "主导航" })
        .getByRole("button", { name, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      await expectInside(
        page,
        ".catalog-page-header button, .catalog-page-toolbar button, .catalog-page-search",
      );
    }
    await openWorkspace(page);
    await showCanvasNavigation(page);
    await page.locator(".project-task-status strong").evaluate((el) => {
      el.textContent = "很长的项目名称用来核对截断与换行".repeat(8);
    });
    await expectInside(
      page,
      ".canvas-hud button, .project-task-status, .canvas-toolbar",
    );
    if (width < 768)
      expect(
        (await page.locator(".project-task-status").boundingBox())!.height,
      ).toBeLessThan(80);
    await page.screenshot({ path: `${evidence}/${width}-canvas.png` });
    if (
      await page
        .getByRole("button", { name: "收起对话", exact: true })
        .isVisible()
    )
      await page.getByRole("button", { name: "收起对话", exact: true }).click();
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
    await page.getByLabel("执行方式").selectOption("direct");
    await page
      .getByLabel("对话内容", { exact: true })
      .fill("跨尺寸仍保留的编辑草稿");
    await expectInside(
      page,
      ".conversation-panel button, .conversation-panel select, .conversation-panel textarea",
    );
    await page.screenshot({ path: `${evidence}/${width}-chat.png` });
    if (width <= 1200) {
      await expect(page.getByTestId("infinite-canvas")).toHaveAttribute(
        "inert",
        "",
      );
      await page.keyboard.press("Escape");
      await expect(page.locator(".conversation-panel")).toBeVisible();
      await page.getByRole("button", { name: "收起对话", exact: true }).click();
      await expect(page.locator(".conversation-panel")).toBeHidden();
      await expect(
        page.getByRole("button", { name: "打开对话", exact: true }),
      ).toBeFocused();
    }
  });
}

test("crossing phone, tablet and desktop preserves drafts and clears invisible menus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const draft = page.locator(".start-composer textarea");
  await draft.fill("横竖屏和断点切换不丢失");
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  for (const width of [1201, 1200, 834, 768, 767, 390, 844, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    await expect(draft).toHaveValue("横竖屏和断点切换不丢失");
    await expect(page.locator(".sidebar")).toHaveClass(/is-collapsed/);
    if (width < 768) {
      const menu = page.getByRole("button", {
        name: "应用功能菜单",
        exact: true,
      });
      await menu.click();
      await expect(
        page.getByRole("menu", { name: "应用功能", exact: true }),
      ).toBeVisible();
      await menu.click();
      await expect(
        page.getByRole("menu", { name: "应用功能", exact: true }),
      ).toHaveCount(0);
      await menu.click();
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
    }
  }
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".topbar .menu-popover")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "应用功能菜单", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("button", { name: "文件", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "搜索与收藏", exact: true }).focus();
  await page.setViewportSize({ width: 834, height: 1112 });
  await expect(page.locator(".sidebar-search")).toBeFocused();
  await draft.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(draft).toBeFocused();
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-collapsed/);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "展开侧边栏", exact: true }),
  ).toBeFocused();
});

for (const [width, height] of [
  [390, 480],
  [844, 390],
]) {
  test(`short viewport ${width}x${height} retains reachable chat and settings controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    if (width >= 768) {
      const navBox = (await page.locator(".primary-nav").boundingBox())!;
      const searchBox = (await page.locator(".sidebar-search").boundingBox())!;
      expect(navBox.y + navBox.height).toBeLessThanOrEqual(searchBox.y);
      for (const control of await page
        .locator(
          ".sidebar .primary-nav button, .sidebar-search, .sidebar-settings, .sidebar-account",
        )
        .all()) {
        await control.scrollIntoViewIfNeeded();
        expect(
          await control.evaluate((el) => {
            const b = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
            );
          }),
        ).toBe(true);
      }
    }
    await openWorkspace(page);
    await showCanvasNavigation(page);
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
    const panel = page.locator(".conversation-panel");
    const field = page.getByLabel("执行方式");
    await field.selectOption("direct");
    const draft = page.getByLabel("对话内容", { exact: true });
    await draft.fill("短屏仍可编辑，不发送真实请求");
    const send = (await panel
      .getByRole("button", { name: "发送消息", exact: true })
      .boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    expect(send.y + send.height).toBeLessThanOrEqual(
      panelBox.y + panelBox.height,
    );
    for (const selector of [
      "textarea",
      '[aria-label="发送消息"]',
      '[aria-label="收起对话"]',
    ]) {
      const control = panel.locator(selector);
      await control.scrollIntoViewIfNeeded();
      const hit = await control.evaluate((el) => {
        const b = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
        );
      });
      expect(hit, selector).toBe(true);
    }
    await expect(draft).toHaveValue("短屏仍可编辑，不发送真实请求");
    expect((await page.locator(".topbar").boundingBox())!.y).toBe(0);
    await page.screenshot({ path: `${evidence}/${width}x${height}-chat.png` });
    await page.keyboard.press("Escape");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "收起对话" }).click();
    await expect(panel).toBeHidden();
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await dialog.getByLabel("主题", { exact: true }).selectOption("light");
    await page.screenshot({
      path: `${evidence}/${width}x${height}-settings-light.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "打开设置", exact: true }),
    ).toBeFocused();
  });
}

test("tablet conversation has readable width and keeps its controls inside", async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await openWorkspace(page);
  await showCanvasNavigation(page);
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  const panel = page.locator(".conversation-panel");
  const box = (await panel.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(380);
  for (const button of await panel.getByRole("button").all()) {
    if (!(await button.isVisible())) continue;
    const b = (await button.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(box.x);
    expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1);
  }
});

test("resizing conversation keeps its visible editor focused and hands hidden focus to its opener", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkspace(page);
  await page.getByLabel("执行方式").selectOption("direct");
  const draft = page.getByLabel("对话内容", { exact: true });
  await draft.fill("会话跨档继续编辑");
  await page.setViewportSize({ width: 390, height: 844 });
  const opener = page.getByRole("button", { name: "打开对话", exact: true });
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(draft).toHaveValue("会话跨档继续编辑");
  await draft.focus();
  for (const width of [1440, 390, 834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(draft).toBeFocused();
    await expect(draft).toHaveValue("会话跨档继续编辑");
  }
  const model = page
    .locator(".conversation-panel")
    .getByRole("button", { name: "模型", exact: true });
  await model.click();
  await expect(model).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await expect(model).toHaveAttribute("aria-expanded", "false");
  await expect(model).toBeFocused();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await page.getByRole("button", { name: "收起对话" }).click();
  await expect(page.locator(".conversation-panel")).toBeHidden();
  await expect(opener).toBeFocused();
  // A desktop-only panel that becomes hidden must not keep an invisible menu.
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkspace(page);
  await page.getByLabel("执行方式").selectOption("direct");
  await page.locator(".chat-model-picker").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".chat-model-picker")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(opener).toBeFocused();
});

test("rapid Escape after a breakpoint closes menus while conversation remains open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  const opener = page.getByRole("button", { name: "打开对话", exact: true });
  const panel = page.locator(".conversation-panel");
  for (const name of ["模型", "Skill", "插件", "AI权限模式"]) {
    await opener.click();
    await page.getByLabel("执行方式").selectOption("direct");
    const menu = panel.getByRole("button", { name, exact: true });
    await menu.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(panel).toHaveAttribute("data-overlay", "false");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toHaveAttribute("data-overlay", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Escape");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "收起对话" }).click();
    await expect(panel).toBeHidden();
    await expect(opener).toBeFocused();
  }
});
