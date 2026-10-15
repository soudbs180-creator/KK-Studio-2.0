import { expect, test, type Locator, type Page } from "@playwright/test";
import { openWorkspace, waitForConversationPanelSettled } from "./helpers";

const longModel = `image-${"long-model-name-".repeat(6)}production`;

test.use({ reducedMotion: "reduce" });
test.beforeEach(async ({ page }) => {
  await page.route("https://**", (route) => route.abort());
  await page.addInitScript((model) => {
    localStorage.setItem(
      "kk-studio-next:model-provider:v1",
      JSON.stringify({
        version: 1,
        name: "布局供应商",
        baseUrl: "https://layout.example.test/v1",
        model,
      }),
    );
    localStorage.setItem(
      "kk-studio-next:provider-connections:v1",
      JSON.stringify(
        Array.from({ length: 16 }, (_, i) => ({
          id: `layout-${i}`,
          provider: `布局供应商 ${i}`,
          displayName: `布局供应商 ${i}`,
          kind: "user_byok",
          baseUrl: "https://layout.example.test/v1",
          model,
          state: "active",
          concurrencyLimit: 1,
          capabilities: {
            modalities: ["image"],
            operations: ["generate"],
            async: false,
          },
        })),
      ),
    );
  }, longModel);
});

async function chat(page: Page): Promise<Locator> {
  await openWorkspace(page);
  const reopen = page.getByRole("button", { name: "打开对话", exact: true });
  if (await reopen.isVisible()) await reopen.click();
  await waitForConversationPanelSettled(page);
  return page.locator(".chat-composer");
}

async function selectLongHomeModel(page: Page): Promise<void> {
  const form = page.locator(".start-composer");
  const trigger = form.getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = form.getByRole("menu", { name: "选择模型", exact: true });
  const api = menu.getByRole("menuitem", { name: /^API 自定义模型/ });
  if (await api.count()) await api.click();
  await menu.getByRole("menuitem", { name: /^布局供应商 0/ }).click();
  await menu
    .getByRole("menuitemradio", { name: new RegExp(longModel) })
    .click();
  await expect(trigger).toHaveAttribute("title", longModel);
}

async function sameRow(form: Locator, label: string): Promise<void> {
  const geometry = await form
    .locator(".composer-toolbar")
    .evaluate((toolbar) => {
      const area = toolbar.getBoundingClientRect();
      const controls = [...toolbar.querySelectorAll("button")]
        .filter(
          (button) =>
            button.getClientRects().length &&
            !button.closest('[role="menu"], [role="dialog"]'),
        )
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            name: button.getAttribute("aria-label") ?? button.textContent,
            x: rect.x,
            right: rect.right,
            center: rect.y + rect.height / 2,
            height: rect.height,
          };
        });
      return { left: area.left, right: area.right, controls };
    });
  await test.info().attach(label, {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
  const centers = geometry.controls.map((control) => control.center);
  expect
    .soft(
      Math.max(...centers) - Math.min(...centers),
      `${label}: all actions share one row`,
    )
    .toBeLessThanOrEqual(1);
  for (const control of geometry.controls) {
    expect.soft(control.height, control.name ?? label).toBe(32);
    expect.soft(control.x).toBeGreaterThanOrEqual(geometry.left - 0.5);
    expect.soft(control.right).toBeLessThanOrEqual(geometry.right + 0.5);
  }
}

for (const width of [390, 1099, 1920]) {
  test(`首页与会话整排动作在长名称下保持同线 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await selectLongHomeModel(page);
    await sameRow(page.locator(".start-composer"), "home");
    await page.screenshot({
      path: test.info().outputPath(`home-${width}.png`),
    });
    const composer = await chat(page);
    await sameRow(composer, "codex");
    await page.getByLabel("执行方式").selectOption("direct");
    await expect(composer.locator(".chat-model-name")).toHaveText(longModel);
    await sameRow(composer, "direct-long-name");
    await page.screenshot({
      path: test.info().outputPath(`toolbar-${width}.png`),
    });
  });
}

for (const kind of ["start", "chat"]) {
  test(`${kind} 输入时没有 textarea 底线且保留键盘焦点`, async ({ page }) => {
    await page.goto("/");
    const composer =
      kind === "start" ? page.locator(".start-composer") : await chat(page);
    const input = composer.locator("textarea");
    await input.click();
    await input.pressSequentially("typed content");
    await expect(input).toHaveCSS("box-shadow", "none");
    await expect(input).toHaveCSS("border-bottom-width", "0px");
    await expect(input).toHaveValue("typed content");
    const model = composer.getByRole("button", { name: "模型", exact: true });
    await input.press("Tab");
    await expect(composer.getByRole("button").first()).toBeFocused();
    await expect(composer.getByRole("button").first()).toHaveCSS(
      "outline-style",
      "solid",
    );
    await model.focus();
    await model.press("Enter");
    await expect(
      composer.getByRole("menu", { name: "选择模型" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(model).toBeFocused();
    await expect(input).toHaveValue("typed content");
  });
}

test("画布生成提示词输入时没有底线", async ({ page }) => {
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  const input = page.getByRole("textbox", { name: "图片提示词", exact: true });
  await input.click();
  await input.pressSequentially("canvas typed content");
  await expect(input).toHaveCSS("box-shadow", "none");
  await expect(input).toHaveCSS("border-bottom-width", "0px");
  await expect(input).toHaveValue("canvas typed content");
});

async function anchored(
  page: Page,
  trigger: Locator,
  menu: Locator,
): Promise<void> {
  const read = () =>
    trigger.evaluate((button) => {
      const anchor = button.getBoundingClientRect();
      const popup = button
        .parentElement!.querySelector('[role="menu"]')!
        .getBoundingClientRect();
      return {
        gap: Math.min(
          Math.abs(popup.top - anchor.bottom),
          Math.abs(anchor.top - popup.bottom),
        ),
        x: popup.x,
        y: popup.y,
        width: popup.width,
        height: popup.height,
      };
    });
  const popup = await read();
  const gap = popup.gap;
  await test.info().attach("menu-anchor", {
    body: JSON.stringify(popup),
    contentType: "application/json",
  });
  expect(gap, "menu stays beside its real trigger").toBeGreaterThanOrEqual(4);
  expect(gap, "menu stays beside its real trigger").toBeLessThanOrEqual(12);
  expect(popup.y).toBeGreaterThanOrEqual(0);
  expect(popup.y + popup.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  expect(popup.x).toBeGreaterThanOrEqual(0);
  expect(popup.x + popup.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(
    await menu.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

for (const width of [1280, 1920]) {
  test(`首页模型弹层跟随触发器、滚动和宽度变化 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    const form = page.locator(".start-composer");
    const trigger = form.getByRole("button", { name: "模型", exact: true });
    await trigger.click();
    const menu = form.getByRole("menu", { name: "选择模型", exact: true });
    await anchored(page, trigger, menu);
    await menu
      .getByRole("button", { name: "切换全部模型", exact: true })
      .click();
    await anchored(page, trigger, menu);
    await menu
      .getByRole("button", { name: "切换分级模型", exact: true })
      .click();
    await anchored(page, trigger, menu);
    const api = menu.getByRole("menuitem", { name: /^API 自定义模型/ });
    if (await api.count()) await api.click();
    await menu.getByRole("menuitem", { name: /^布局供应商 0/ }).click();
    await anchored(page, trigger, menu);
    await menu.getByRole("button", { name: "返回上一级", exact: true }).click();
    await anchored(page, trigger, menu);
    await page.evaluate(() => {
      (
        window as Window & { nextComposerResize: Promise<void> }
      ).nextComposerResize = new Promise((resolve) => {
        window.addEventListener("resize", () => resolve(), { once: true });
      });
    });
    await page.setViewportSize({ width: 1099, height: 900 });
    await page.evaluate(
      () =>
        (window as Window & { nextComposerResize: Promise<void> })
          .nextComposerResize,
    );
    await anchored(page, trigger, menu);
    await page.locator(".start-page").evaluate((element) => {
      return new Promise<void>((resolve) => {
        if (element.scrollTop === 80) return resolve();
        element.addEventListener("scroll", () => resolve(), { once: true });
        element.scrollTop = 80;
      });
    });
    await anchored(page, trigger, menu);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("模型菜单在 visual viewport 缩小而 layout viewport 不变时仍可达", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page
    .locator(".start-composer")
    .getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型", exact: true });
  const before = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    visualHeight: visualViewport!.height,
  }));
  await page.evaluate(() => {
    (
      window as Window & { nextComposerVisualResize: Promise<void> }
    ).nextComposerVisualResize = new Promise((resolve) => {
      visualViewport!.addEventListener("resize", () => resolve(), {
        once: true,
      });
    });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  await page.evaluate(
    () =>
      (window as Window & { nextComposerVisualResize: Promise<void> })
        .nextComposerVisualResize,
  );
  const geometry = await menu.evaluate((element) => {
    const visual = visualViewport!;
    const popup = element.getBoundingClientRect();
    const trigger = element
      .parentElement!.querySelector('button[aria-expanded="true"]')!
      .getBoundingClientRect();
    return {
      layout: { width: innerWidth, height: innerHeight },
      visual: {
        left: visual.offsetLeft,
        top: visual.offsetTop,
        width: visual.width,
        height: visual.height,
        scale: visual.scale,
      },
      popup: {
        left: popup.left,
        right: popup.right,
        top: popup.top,
        bottom: popup.bottom,
      },
      trigger: {
        left: trigger.left,
        right: trigger.right,
        top: trigger.top,
        bottom: trigger.bottom,
      },
    };
  });
  await test.info().attach("visual-viewport", {
    body: JSON.stringify({ before, ...geometry }),
    contentType: "application/json",
  });
  await page.screenshot({
    path: test.info().outputPath("visual-viewport.png"),
  });
  expect(geometry.layout).toEqual({
    width: before.width,
    height: before.height,
  });
  expect(geometry.visual.height).toBeLessThan(before.visualHeight);
  expect(geometry.trigger.bottom).toBeLessThanOrEqual(
    geometry.visual.top + geometry.visual.height,
  );
  expect.soft(geometry.popup.top).toBeGreaterThanOrEqual(geometry.visual.top);
  expect
    .soft(geometry.popup.bottom)
    .toBeLessThanOrEqual(geometry.visual.top + geometry.visual.height);
  expect.soft(geometry.popup.left).toBeGreaterThanOrEqual(geometry.visual.left);
  expect
    .soft(geometry.popup.right)
    .toBeLessThanOrEqual(geometry.visual.left + geometry.visual.width);
});
