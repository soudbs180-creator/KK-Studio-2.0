import { expect, test, type Page } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

async function uploadImage(page: Page, node: ReturnType<Page["getByTestId"]>) {
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(node.locator(".uploaded-image")).toBeVisible();
}

async function addSecondImage(page: Page) {
  await page.getByRole("button", { name: "添加资源" }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-image-/).first();
  await uploadImage(page, node);
  return node;
}

async function imageActions(page: Page, node: ReturnType<Page["getByTestId"]>) {
  await node.focus();
  await node.press("Enter");
  const actions = page.getByRole("toolbar", { name: /^图片操作：/ });
  await expect(actions).toBeVisible();
  return actions;
}

test("two canvas images open a comparison and the slider supports keyboard steps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkspace(page);
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  expect(new URL(page.url()).port).toBe("1423");
  const styles = await page.evaluate(() =>
    [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
  );
  expect(styles).toHaveLength(1);
  expect(styles[0]).toContain("/assets/index-");
  const first = page.getByTestId("canvas-node-image");
  await uploadImage(page, first);
  await (
    await imageActions(page, first)
  )
    .getByRole("button", { name: /加入对比/ })
    .click();
  const selection = page.getByRole("region", { name: "图片对比选择" });
  await expect(selection).toContainText("1/4");
  await expect(
    selection.getByRole("button", { name: "打开对比" }),
  ).toBeDisabled();

  const second = await addSecondImage(page);
  await (
    await imageActions(page, second)
  )
    .getByRole("button", { name: /加入对比/ })
    .click();
  await expect(selection).toContainText("2/4");
  const open = selection.getByRole("button", { name: "打开对比" });
  const trayBox = (await selection.boundingBox())!;
  const chatBox = (await page.locator(".conversation-panel").boundingBox())!;
  expect(trayBox.x + trayBox.width).toBeLessThan(chatBox.x);
  await open.click();

  const dialog = page.getByRole("dialog", { name: "图片对比" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(22, 22, 22)");
  await expect
    .poll(async () => (await dialog.boundingBox())?.width ?? 0)
    .toBeGreaterThan(1000);
  await expect(dialog.locator(".compare-pane")).toHaveCount(2);
  await expect(dialog.locator(".compare-pane-heading").first()).toContainText(
    "版本 1",
  );
  await expect(dialog.locator(".compare-pane-heading").nth(1)).toContainText(
    "版本 2",
  );
  await expect(dialog.getByText("本地图片")).toHaveCount(2);
  await expect(dialog).not.toContainText("kk-image-2");
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  await page.screenshot({
    path: "test-results/changes/2026-09-27-canvas-image-compare/evidence/compare-1440.png",
  });
  await dialog.getByRole("button", { name: "放大" }).click();
  await expect(dialog.getByText("125%")).toBeVisible();
  const stages = dialog.locator(".compare-stage");
  await stages.first().click({ button: "right" });
  await expect(page.getByRole("menu", { name: "画布菜单" })).toHaveCount(0);
  await stages.first().dblclick();
  await expect(page.getByRole("menu", { name: "添加节点" })).toHaveCount(0);
  await stages.first().evaluate((stage) => {
    stage.scrollLeft = stage.scrollWidth - stage.clientWidth;
  });
  await expect
    .poll(() => stages.nth(1).evaluate((stage) => stage.scrollLeft))
    .toBeGreaterThan(0);

  for (let step = 125; step < 300; step += 25)
    await dialog.getByRole("button", { name: "放大" }).click();
  await expect(dialog.getByText("300%")).toBeVisible();
  await stages.first().evaluate((stage) => {
    stage.scrollLeft = stage.scrollWidth - stage.clientWidth;
  });

  await stages
    .first()
    .locator("img")
    .evaluate((image) => {
      (image as HTMLImageElement).src = "/missing-comparison-image.png";
    });
  await expect(dialog.getByRole("alert")).toContainText("图片无法加载");
  const errorBox = (await dialog.getByRole("alert").boundingBox())!;
  const stageBox = (await stages.first().boundingBox())!;
  expect(errorBox.x).toBeGreaterThanOrEqual(stageBox.x);
  expect(errorBox.x + errorBox.width).toBeLessThanOrEqual(
    stageBox.x + stageBox.width,
  );
  await dialog
    .getByRole("button", { name: "重新加载" })
    .click({ timeout: 2000 });
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  await dialog.getByRole("button", { name: "滑块" }).click();
  const slider = dialog.getByRole("slider", { name: "对比位置" });
  await expect(slider).toHaveValue("50");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("51");
  await slider.press("Shift+ArrowRight");
  await expect(slider).toHaveValue("61");
  await slider.press("Home");
  await dialog
    .locator(".compare-slider-image.is-overlay img")
    .evaluate((image) => {
      (image as HTMLImageElement).src = "/missing-slider-image.png";
    });
  await dialog.getByRole("button", { name: "重新加载" }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(selection).toContainText("2/4");
  await page.setViewportSize({ width: 1220, height: 850 });
  await expect
    .poll(async () => {
      const tray = (await selection.boundingBox())!;
      const chat = (await page.locator(".conversation-panel").boundingBox())!;
      return tray.x + tray.width <= chat.x;
    })
    .toBe(true);
  await open.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await second.focus();
  await page.keyboard.press("Delete");
  await expect(selection).toContainText("1/4");
});

test("narrow canvas keeps the comparison controls reachable and slider draggable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:1423",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await openWorkspace(page);
    await showCanvasNavigation(page);
    const first = page.getByTestId("canvas-node-image");
    await uploadImage(page, first);
    await page.getByRole("button", { name: "小地图" }).click();
    await page.getByRole("button", { name: "定位 blue-hour.png" }).click();
    const firstCompare = (await imageActions(page, first)).getByRole("button", {
      name: /加入对比/,
    });
    expect((await firstCompare.boundingBox())!.height).toBeCloseTo(32, 0);
    await firstCompare.click();
    const second = await addSecondImage(page);
    await (
      await imageActions(page, second)
    )
      .getByRole("button", { name: /加入对比/ })
      .click();
    const selection = page.getByRole("region", { name: "图片对比选择" });
    await expect(
      selection.getByRole("button", { name: "打开对比" }),
    ).toBeVisible();
    expect(
      (await selection.locator(".image-compare-chip").first().boundingBox())!
        .height,
    ).toBeGreaterThanOrEqual(44);
    expect(
      (await selection.getByRole("button", { name: "打开对比" }).boundingBox())!
        .height,
    ).toBeGreaterThanOrEqual(44);
    await selection.getByRole("button", { name: "打开对比" }).click();
    const dialog = page.getByRole("dialog", { name: "图片对比" });
    await expect(dialog).toBeVisible();
    for (const label of ["关闭图片对比", "并排", "滑块", "缩小", "放大"]) {
      expect(
        (await dialog.getByRole("button", { name: label }).boundingBox())!
          .height,
      ).toBeGreaterThanOrEqual(44);
    }
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await dialog.getByRole("button", { name: "滑块" }).click();
    const slider = dialog.getByRole("slider", { name: "对比位置" });
    const track = (await slider.boundingBox())!;
    const y = track.y + track.height / 2;
    const startX = track.x + track.width * 0.25;
    const endX = track.x + track.width * 0.75;
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(
      0,
    );
    await page.touchscreen.tap(startX, y);
    await expect
      .poll(async () => Number(await slider.inputValue()))
      .toBeLessThan(40);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: endX, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => Number(await slider.inputValue()))
      .toBeGreaterThan(60);
    await page.screenshot({
      path: "test-results/changes/2026-09-27-canvas-image-compare/evidence/compare-390.png",
    });
  } finally {
    await context.close();
  }
});
