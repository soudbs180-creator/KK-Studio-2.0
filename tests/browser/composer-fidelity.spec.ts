import { expect, test } from "@playwright/test";
import { openWorkspace, waitForConversationPanelSettled } from "./helpers";

test("图片编辑器展开后仍在卡片下方，输入区不覆盖底部控件", async ({ page }) => {
  await openWorkspace(page);
  await expect(page.getByTestId("image-composer")).toHaveCount(0);
  await page.locator(".image-preview").click();
  await page.getByRole("button", { name: "展开提示词", exact: true }).click();
  const preview = await page.locator(".image-preview").boundingBox();
  const composer = await page.getByTestId("image-composer").boundingBox();
  const input = await page.getByLabel("图片提示词").boundingBox();
  const controls = await page.locator(".creation-controls").boundingBox();
  expect(composer!.y).toBeGreaterThanOrEqual(preview!.y + preview!.height + 9);
  expect(input!.y + input!.height).toBeLessThanOrEqual(controls!.y - 8);
});

test("菜单 Escape 先收起菜单，再次 Escape 收起编辑器并保留草稿", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.locator(".image-preview").click();
  await page.getByLabel("图片提示词").fill("切换时保留内容");
  await page.getByRole("button", { name: "kk-image-2", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".node-popover")).toHaveCount(0);
  await expect(page.getByTestId("image-composer")).toBeVisible();
  await page.getByLabel("图片提示词").focus();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("image-composer")).toHaveCount(0);
  await page.locator(".image-preview").click();
  await expect(page.getByLabel("图片提示词")).toHaveValue("切换时保留内容");
  await page
    .getByTestId("image-composer")
    .screenshot({ path: test.info().outputPath("image-composer-refined.png") });
});

test("窄屏会话面板为画布工具栏留出空间，顶部和输入控件尺寸稳定", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.setViewportSize({ width: 1071, height: 698 });
  await page.getByRole("button", { name: "窗口", exact: true }).click();
  await page
    .getByRole("button", { name: "展开 / 收起对话", exact: true })
    .click();
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await waitForConversationPanelSettled(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>(
          ".conversation-panel",
        )!;
        const toolbar = document.querySelector<HTMLElement>(".canvas-toolbar")!;
        return (
          toolbar.getBoundingClientRect().right -
          panel.getBoundingClientRect().left
        );
      }),
    )
    .toBeLessThan(-16);
  const headerButtons = await page
    .locator(".conversation-panel > header > button")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  expect(headerButtons).toEqual([
    { width: 30, height: 30 },
    { width: 30, height: 30 },
  ]);
  const panelBox = await page.locator(".conversation-panel").boundingBox();
  const closeBox = await page
    .getByRole("button", { name: "收起对话", exact: true })
    .boundingBox();
  expect(closeBox!.x + closeBox!.width).toBeCloseTo(
    panelBox!.x + panelBox!.width - 17,
    1,
  );
  const composer = page.locator(".chat-composer > div");
  const composerBox = await composer.boundingBox();
  const controls = await composer.locator(":scope > *").evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { right: rect.right, bottom: rect.bottom };
    }),
  );
  expect(Math.max(...controls.map((item) => item.right))).toBeLessThanOrEqual(
    composerBox!.x + composerBox!.width,
  );
  expect(Math.max(...controls.map((item) => item.bottom))).toBeLessThanOrEqual(
    composerBox!.y + composerBox!.height,
  );
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toHaveCSS("height", "30px");
  const headerIcons = await page
    .locator(
      ".conversation-panel > header > button img, .conversation-panel > header > button svg",
    )
    .evaluateAll((icons) =>
      icons.map((icon) => {
        const rect = icon.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  expect(headerIcons).toEqual([
    { width: 20, height: 20 },
    { width: 20, height: 20 },
  ]);
  const composerIcons = await page
    .locator(
      ".chat-composer > div > button img:not(.composer-plus-arm), .chat-composer > div > button svg",
    )
    .evaluateAll((icons) =>
      icons.map((icon) => {
        const rect = icon.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  expect(composerIcons).toEqual([
    { width: 20, height: 20 },
    { width: 16, height: 16 },
    { width: 16, height: 16 },
    { width: 16, height: 16 },
    { width: 16, height: 16 },
    { width: 20, height: 20 },
  ]);
});

test("桌面会话入口使用关闭态图标并从右侧滑入，不挤动地图导航", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await expect(page.getByRole("group", { name: "画布导航" })).toBeVisible();

  const before = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      const box = element?.getBoundingClientRect();
      return box
        ? { x: box.x, y: box.y, width: box.width, height: box.height }
        : null;
    };
    const image = document.querySelector<HTMLImageElement>(".chat-reopen img");
    const imageBox = image?.getBoundingClientRect();
    return {
      navigation: rect(".canvas-top-right"),
      map: rect(".canvas-map-trigger"),
      toolbar: rect(".canvas-toolbar"),
      reopen: rect(".chat-reopen"),
      icon: imageBox
        ? {
            x: imageBox.x,
            y: imageBox.y,
            width: imageBox.width,
            height: imageBox.height,
          }
        : null,
      source: image?.getAttribute("src"),
      scrollLeft:
        document.querySelector<HTMLElement>(".workspace-content")?.scrollLeft,
    };
  });
  expect(before.navigation!.x).toBeCloseTo(1562, 1);
  expect(before.navigation!.y).toBe(72);
  expect(before.map).not.toBeNull();
  expect(before.map!.x - before.navigation!.x).toBeCloseTo(206.61, 1);
  expect(before.toolbar).toMatchObject({ x: 719, y: 998 });
  expect(before.reopen).toEqual({ x: 1859, y: 79, width: 18, height: 18 });
  expect(before.icon).toEqual({
    x: 1857.25,
    y: 77.25,
    width: 21.5,
    height: 21.5,
  });
  expect(before.source).toBe("/design/figma/chat-close.svg");
  expect(before.scrollLeft).toBe(0);

  // Freeze the actual CSS animation when React reveals the panel. Sampling
  // after a cross-process click can miss most of a 220ms animation on a busy
  // worker; checking fixed timeline positions retains the geometry contract.
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const panel = document.querySelector(".conversation-panel");
      const animation = panel
        ?.getAnimations()
        .find(
          (animation) =>
            "animationName" in animation &&
            (animation as CSSAnimation).animationName ===
              "conversation-panel-enter",
        );
      if (!animation) return;
      animation.pause();
      animation.currentTime = 0;
      observer.disconnect();
    });
    observer.observe(document.querySelector(".workspace-content")!, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  const samples = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(".conversation-panel")!;
    const toolbar = document.querySelector<HTMLElement>(".canvas-toolbar")!;
    const animation = panel
      .getAnimations()
      .find(
        (animation) =>
          "animationName" in animation &&
          (animation as CSSAnimation).animationName ===
            "conversation-panel-enter",
      );
    if (!animation || animation.playState !== "paused")
      throw new Error("Expected the real panel entry animation");
    const duration = animation.effect?.getComputedTiming().duration;
    if (typeof duration !== "number" || duration <= 0)
      throw new Error("Expected a nonzero animation duration");
    const result = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      animation.currentTime = duration * fraction;
      const panelBox = panel.getBoundingClientRect();
      return {
        x: panelBox.x,
        y: panelBox.y,
        toolbarX: toolbar.getBoundingClientRect().x,
      };
    });
    animation.finish();
    return result;
  });
  expect(samples.length).toBe(5);
  expect(Math.max(...samples.map((sample) => sample.x))).toBeGreaterThan(
    Math.min(...samples.map((sample) => sample.x)) + 100,
  );
  expect(samples.at(-1)!.x).toBeCloseTo(1430, 0);
  expect(samples.every((sample) => Math.abs(sample.y - 61) < 1)).toBe(true);
  expect(samples.every((sample) => Math.abs(sample.toolbarX - 719) < 1)).toBe(
    true,
  );
  await expect(page.locator(".canvas-top-right")).toBeVisible();
  const openNavigation = await page.locator(".canvas-top-right").boundingBox();
  const openMap = await page.locator(".canvas-map-trigger").boundingBox();
  const openPanel = await page.locator(".conversation-panel").boundingBox();
  expect(openNavigation).toMatchObject({
    x: 1138.015625,
    y: 72,
    width: 280.984375,
    height: 31.09375,
  });
  expect(openNavigation!.x + openNavigation!.width).toBeLessThanOrEqual(
    openPanel!.x - 10,
  );
  expect(openMap!.x).toBeCloseTo(1344.625, 0);
  await expect(page.locator(".conversation-panel")).toHaveCSS(
    "animation-name",
    "conversation-panel-enter",
  );
});
