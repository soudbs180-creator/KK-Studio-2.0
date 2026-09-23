import { expect, test, type Locator, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

test.use({ reducedMotion: "reduce" });

type ControlRect = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

async function controlRects(container: Locator): Promise<ControlRect[]> {
  return container.locator("button, select").evaluateAll((controls) =>
    controls
      .filter((control) => !control.closest('[role="menu"]'))
      .map((control) => {
        const { x, y, width, height } = control.getBoundingClientRect();
        return {
          name:
            control.getAttribute("aria-label") ??
            control.textContent?.trim() ??
            control.tagName,
          x,
          y,
          width,
          height,
        };
      }),
  );
}

async function expectStableControls(
  container: Locator,
  baseline: ControlRect[],
): Promise<void> {
  const current = await controlRects(container);
  expect(current.map((control) => control.name)).toEqual(
    baseline.map((control) => control.name),
  );
  current.forEach((control, index) => {
    for (const property of ["x", "y", "width", "height"] as const) {
      expect(
        Math.abs(control[property] - baseline[index][property]),
        `${control.name}: ${property} changed when a menu opened`,
      ).toBeLessThanOrEqual(0.5);
    }
  });
}

async function expectInViewport(page: Page, locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-0.5);
  expect(box!.y).toBeGreaterThanOrEqual(-0.5);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 0.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 0.5);
}

async function expectMenuUsable(page: Page, menu: Locator): Promise<void> {
  await expectInViewport(page, menu);
  await expect(menu).toHaveCount(1);
  // CSS overflow clipping may hide a menu even when Playwright considers it visible.
  expect(
    await menu.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return hit === element || (hit !== null && element.contains(hit));
    }),
  ).toBe(true);
  await expectInViewport(page, menu.locator("button").first());
  await expectInViewport(page, menu.locator("button").last());
}

function workspaceTriggers(panel: Locator): Locator[] {
  return [
    panel.getByRole("button", { name: "模型", exact: true }),
    panel.getByRole("button", { name: "Skill", exact: true }),
    panel.getByRole("button", { name: "插件", exact: true }),
    panel.getByRole("button", { name: "AI权限模式", exact: true }),
  ];
}

test("工作台四种菜单互斥且打开、切换、关闭都不移动动作控件", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.evaluate(() => document.fonts.ready);
  const panel = page.locator(".conversation-panel");
  const actions = panel.locator('[data-node-id="407:29315"]');
  const baseline = await controlRects(actions);
  const triggers = workspaceTriggers(panel);

  for (const trigger of triggers) {
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(actions.locator('[aria-expanded="true"]')).toHaveCount(1);
    await expectMenuUsable(page, panel.getByRole("menu"));
    await expectStableControls(actions, baseline);
  }
  await triggers.at(-1)!.click();
  await expect(panel.getByRole("menu")).toHaveCount(0);
  await expectStableControls(actions, baseline);
});

test("工作台菜单在 HUD 和工具栏指针事件被截断时仍关闭", async ({ page }) => {
  await openWorkspace(page);
  const panel = page.locator(".conversation-panel");
  const model = panel.getByRole("button", { name: "模型", exact: true });

  for (const target of [
    page.getByRole("button", { name: "打开任务列表", exact: true }),
    page.getByRole("button", { name: "添加资源", exact: true }),
  ]) {
    await model.click();
    await expect(panel.getByRole("menu")).toHaveCount(1);
    await target.click();
    await expect(panel.getByRole("menu")).toHaveCount(0);
    await expect(model).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Escape");
  }
});

test("工作台菜单内部获得焦点后 Escape 关闭并回到对应触发器", async ({
  page,
}) => {
  await openWorkspace(page);
  const panel = page.locator(".conversation-panel");
  for (const trigger of workspaceTriggers(panel)) {
    await trigger.click();
    const option = panel.getByRole("menu").locator("button:enabled").first();
    await option.focus();
    await expect(option).toBeFocused();
    await option.press("Escape");
    await expect(panel.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
});

const longModel = `image-${"long-provider-model-name-".repeat(4)}production`;

async function useLongModel(page: Page): Promise<void> {
  await page.addInitScript((model) => {
    localStorage.setItem(
      "kk-studio-next:model-provider:v1",
      JSON.stringify({
        version: 1,
        name: "布局回归测试服务",
        baseUrl: "https://models.example.test/v1",
        model,
      }),
    );
  }, longModel);
}

test("长模型名不会挤出工作台动作区，模型菜单仍完整可操作", async ({ page }) => {
  await useLongModel(page);
  await openWorkspace(page);
  await page.getByLabel("执行方式").selectOption("direct");
  await page.evaluate(() => document.fonts.ready);
  const panel = page.locator(".conversation-panel");
  const actions = panel.locator('[data-node-id="407:29315"]');
  const model = panel.getByRole("button", { name: "模型", exact: true });
  await expect(model.locator(".chat-model-name")).toHaveText(longModel);
  const area = await actions.boundingBox();
  const controls = await controlRects(actions);
  expect(area).not.toBeNull();
  for (const control of controls) {
    expect(control.width, control.name).toBeGreaterThan(0);
    expect(control.x, control.name).toBeGreaterThanOrEqual(area!.x - 0.5);
    expect(control.x + control.width, control.name).toBeLessThanOrEqual(
      area!.x + area!.width + 0.5,
    );
  }
  const ordered = [...controls].sort((left, right) => left.x - right.x);
  ordered.slice(1).forEach((control, index) => {
    expect(
      control.x,
      `${ordered[index].name} overlaps ${control.name}`,
    ).toBeGreaterThanOrEqual(ordered[index].x + ordered[index].width - 0.5);
  });
  await model.click();
  await expectStableControls(actions, controls);
  await expectMenuUsable(page, panel.getByRole("menu"));
});

for (const width of [390, 768, 900]) {
  test(`首页 ${width}px 所有控件和四种弹层可见、可命中且关闭回焦`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
    await useLongModel(page);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const footer = page.locator(".start-composer-footer");
    const controls = footer.locator("button, select");
    for (const control of await controls.all()) {
      await expectInViewport(page, control);
    }
    const baseline = await controlRects(footer);
    const triggers = [
      footer.getByRole("button", { name: "模型", exact: true }),
      footer.getByRole("button", { name: "Skill", exact: true }),
      footer.getByRole("button", { name: "插件", exact: true }),
      footer.getByRole("button", { name: /^当前模式：/ }),
    ];
    for (const trigger of triggers) {
      await trigger.click();
      const menu = footer.getByRole("menu");
      await expectMenuUsable(page, menu);
      await expectStableControls(footer, baseline);
      const option = menu.locator("button").first();
      await option.focus();
      await option.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    await triggers[0].click();
    await triggers[1].click();
    await expect(footer.getByRole("menu")).toHaveCount(1);
    await expect(triggers[0]).toHaveAttribute("aria-expanded", "false");
    await page.getByLabel("创作提示词").click();
    await expect(footer.getByRole("menu")).toHaveCount(0);
  });
}
