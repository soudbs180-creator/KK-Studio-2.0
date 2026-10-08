import { expect, test, type Locator, type Page } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

const toolbar = (page: Page) =>
  page.getByRole("toolbar", { name: /^图片操作：/ });

async function uploadImage(node: Locator): Promise<void> {
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(node.locator(".uploaded-image")).toBeVisible();
}

async function selectImage(page: Page, node: Locator): Promise<void> {
  await node.locator(".uploaded-image").click();
  await expect(node).toHaveClass(/is-selected/);
  try {
    await expect(toolbar(page)).toBeVisible();
  } catch (cause) {
    console.log(
      "Selected image geometry",
      await page.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          const box = element?.getBoundingClientRect();
          return element && box
            ? {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                style: element.getAttribute("style"),
              }
            : null;
        };
        return {
          canvas: rect(".canvas"),
          toolbar: rect(".image-selection-toolbar"),
          caption: rect(".is-selected .image-caption"),
          image: rect(".is-selected .image-preview"),
          hud: rect(".canvas-hud-actions"),
          navigation: rect(".canvas-top-right"),
        };
      }),
    );
    throw cause;
  }
}

async function expectAboveImage(page: Page, node: Locator): Promise<void> {
  await expect
    .poll(async () => {
      const actions = await toolbar(page).boundingBox();
      const card = await node.locator(".image-preview").boundingBox();
      const caption = await node.locator(".image-caption").boundingBox();
      return Boolean(
        actions &&
        card &&
        actions.y + actions.height < Math.min(card.y, caption?.y ?? card.y),
      );
    })
    .toBe(true);
  const canvas = await page.getByTestId("infinite-canvas").boundingBox();
  const actions = (await toolbar(page).boundingBox())!;
  expect(actions.x).toBeGreaterThanOrEqual(canvas!.x);
  const chat = await page.locator(".conversation-panel").boundingBox();
  expect(actions.x + actions.width).toBeLessThanOrEqual(
    chat && chat.width > 0 ? chat.x : canvas!.x + canvas!.width,
  );
  for (const button of await toolbar(page).getByRole("button").all()) {
    expect((await button.boundingBox())!.height).toBeCloseTo(32, 0);
    await expect(button).toHaveCSS("font-size", "14px");
  }
}

test("单击参考图片只选中，上方工具栏复用预览重绘对比并可关闭", async ({
  page,
}, testInfo) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  await uploadImage(node);
  await page.keyboard.press("Escape");
  await expect(toolbar(page)).toHaveCount(0);
  await expect(node.getByRole("button", { name: "重绘参考图片" })).toHaveCount(
    0,
  );
  await selectImage(page, node);
  await expect(page.getByRole("dialog", { name: "预览参考图片" })).toHaveCount(
    0,
  );
  await expectAboveImage(page, node);
  await toolbar(page)
    .getByRole("button", { name: "加入对比：blue-hour.png" })
    .click();
  await expect(
    page.getByRole("region", { name: "图片对比选择" }),
  ).toContainText("1/4");
  await expect(node).toHaveClass(/is-selected/);
  await toolbar(page).getByRole("button", { name: "放大查看参考图片" }).click();
  await expect(
    page.getByRole("dialog", { name: "预览参考图片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  await toolbar(page).getByRole("button", { name: "重绘参考图片" }).click();
  await expect(
    page.getByRole("dialog", { name: "重绘参考图片" }),
  ).toBeVisible();
  await page.getByLabel("重绘指令").fill("保留主体，替换背景");
  await expect(
    page.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("dialog", { name: "重绘参考图片" })
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect(node.locator(".uploaded-image")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("selected-reference.png"),
  });
  await page.keyboard.press("Escape");
  await expect(toolbar(page)).toHaveCount(0);
  await selectImage(page, node);
  const canvas = (await page.getByTestId("infinite-canvas").boundingBox())!;
  await page.mouse.click(canvas.x + 12, canvas.y + canvas.height - 140);
  await expect(toolbar(page)).toHaveCount(0);
});

test("键盘工具栏、双击预览与切换卡片保留唯一选择和焦点", async ({ page }) => {
  await openWorkspace(page);
  const first = page.getByTestId("canvas-node-image");
  await uploadImage(first);
  await selectImage(page, first);
  const position = await first.getAttribute("style");
  await toolbar(page).getByRole("button").first().focus();
  await page.keyboard.press("End");
  await expect(
    toolbar(page).getByRole("button", { name: /加入对比/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(
    toolbar(page).getByRole("button", { name: "重绘参考图片" }),
  ).toBeFocused();
  await expect(first).toHaveAttribute("style", position!);
  await page.keyboard.press("Escape");
  await expect(toolbar(page)).toHaveCount(0);
  await expect(first).toBeFocused();
  await first.locator(".uploaded-image").dblclick();
  await expect(
    page.getByRole("dialog", { name: "预览参考图片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const second = page.getByTestId(/^canvas-node-added-image-/).first();
  await uploadImage(second);
  await second.focus();
  await second.press("Enter");
  await expect(toolbar(page)).toHaveCount(1);
  await expect(first).not.toHaveClass(/is-selected/);
  await first.focus();
  await first.press("Enter");
  await expect(toolbar(page)).toHaveCount(1);
  await expect(second).not.toHaveClass(/is-selected/);
});

test("工具栏随图片拖动和平移移动，缩放不缩小操作命中区", async ({ page }) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const node = page.getByTestId("canvas-node-image");
  await uploadImage(node);
  await selectImage(page, node);
  const beforeNode = await node.getAttribute("style");
  const image = (await node.locator(".uploaded-image").boundingBox())!;
  await page.mouse.move(image.x + 50, image.y + 50);
  await page.mouse.down();
  await page.mouse.move(image.x + 110, image.y + 90, { steps: 8 });
  await page.mouse.up();
  await expect(node).not.toHaveAttribute("style", beforeNode!);
  await expectAboveImage(page, node);
  const before = (await toolbar(page).boundingBox())!;
  const canvas = (await page.getByTestId("infinite-canvas").boundingBox())!;
  await page.mouse.move(canvas.x + 24, canvas.y + 500);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(canvas.x + 84, canvas.y + 530, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await expect
    .poll(async () => (await toolbar(page).boundingBox())?.x)
    .toBeGreaterThan(before.x);
  await expectAboveImage(page, node);
  for (const percent of ["50%", "100%"]) {
    await page.getByRole("button", { name: "画布缩放" }).click();
    await page
      .getByRole("menuitemradio", { name: percent, exact: true })
      .click();
    await expectAboveImage(page, node);
  }
});

for (const width of [390, 1099, 1920]) {
  test(`图片移到顶部或取消后重新选择时，上方工具栏仍可恢复操作 ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await openWorkspace(page);
    const node = page.getByTestId("canvas-node-image");
    await uploadImage(node);
    await selectImage(page, node);
    const canvas = (await page.getByTestId("infinite-canvas").boundingBox())!;
    const card = (await node.locator(".image-preview").boundingBox())!;
    await page.mouse.move(card.x + 100, card.y + 100);
    await page.mouse.down();
    await page.mouse.move(card.x + 100, canvas.y + 120, { steps: 8 });
    await page.mouse.up();
    await expect(toolbar(page)).toBeVisible();
    await expectAboveImage(page, node);

    await page.keyboard.press("Escape");
    await expect(toolbar(page)).toHaveCount(0);
    const current = (await node.locator(".image-preview").boundingBox())!;
    const delta = canvas.y + 20 - current.y;
    await page.mouse.move(canvas.x + 24, canvas.y + 500);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(canvas.x + 24, canvas.y + 500 + delta, { steps: 8 });
    await page.mouse.up({ button: "middle" });
    await selectImage(page, node);
    await expectAboveImage(page, node);
  });
}

for (const width of [390, 1099, 1920]) {
  test(`图片选择工具栏在 ${width} 屏幕内可触达且保持标准尺寸`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await openWorkspace(page);
    await showCanvasNavigation(page);
    const node = page.getByTestId("canvas-node-image");
    await uploadImage(node);
    await page.getByRole("button", { name: "小地图", exact: true }).click();
    await page
      .getByRole("button", { name: "定位 blue-hour.png", exact: true })
      .click();
    await expect(toolbar(page)).toBeVisible();
    await expectAboveImage(page, node);
    await expect(
      toolbar(page).getByRole("button", { name: "重绘参考图片" }),
    ).toBeInViewport();
    await node.focus();
    await page.keyboard.press("Escape");
    await expect(toolbar(page)).toHaveCount(0);
    await node.press("Enter");
    await expect(toolbar(page)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`reference-${width}.png`),
    });
    await expect(
      page.locator('[data-runtime-entry="src/main.tsx"]'),
    ).toHaveAttribute("data-runtime-mode", "production");
    expect(new URL(page.url()).port).toBe("1423");
    await testInfo.attach("runtime", {
      body: JSON.stringify(
        await page.evaluate(() => ({
          url: location.href,
          scripts: [...document.scripts]
            .map((script) => script.src)
            .filter(Boolean),
          styles: [...document.styleSheets]
            .map((sheet) => sheet.href)
            .filter(Boolean),
        })),
      ),
      contentType: "application/json",
    });
  });
}
