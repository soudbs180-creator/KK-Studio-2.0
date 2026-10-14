// Actual production DOM at the user's world zoom, with normal touch interaction.
import { expect, test, type Locator } from "@playwright/test";
import { openWorkspace } from "./helpers";

test.use({ hasTouch: true });

async function screenSize(control: Locator, height: number): Promise<void> {
  await control.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return {
          height: Math.round(box.height * 10) / 10,
          hit: element === hit || element.contains(hit),
        };
      }),
    )
    .toEqual({ height, hit: true });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`手机${viewport.width}真实画布缩放后模型、参数和编辑仍可触摸`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openWorkspace(page);
    await page.getByTestId("canvas-node-image").locator(".image-preview").tap();
    const editor = page.getByTestId("image-composer");
    const model = editor.getByRole("button", { name: "画布模型", exact: true });
    const params = editor.getByRole("button", {
      name: "自适应尺寸",
      exact: true,
    });
    const expand = editor.getByRole("button", {
      name: "展开提示词",
      exact: true,
    });
    // The baseline defect fails here because CSS32 becomes screen18.55/9.09.
    await screenSize(model, 32);
    await screenSize(params, 32);
    await screenSize(expand, 32);
    await screenSize(
      editor.getByRole("button", { name: "生成图片", exact: true }),
      40,
    );
    const scale = () =>
      page
        .locator(".canvas-stage")
        .evaluate(
          (element) =>
            new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
        );
    const before = await scale();
    expect(before).toBeLessThan(1);
    await model.tap();
    await expect(editor.locator(".kk-model-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(model).toBeFocused();
    await params.tap();
    await expect(editor.locator(".parameter-menu")).toBeVisible();
    await editor.getByRole("button", { name: "自适应", exact: true }).tap();
    await params.tap();
    await expand.tap();
    const collapse = editor.getByRole("button", {
      name: "收起提示词",
      exact: true,
    });
    await screenSize(collapse, 32);
    const prompt = editor.getByRole("textbox", {
      name: "图片提示词",
      exact: true,
    });
    await prompt.fill("同一节点的手机编辑草稿");
    await collapse.tap();
    await page.getByTestId("infinite-canvas").focus();
    for (let index = 0; index < 8; index++)
      await page.keyboard.press("Control+-");
    expect(await scale()).toBeLessThan(before);
    await screenSize(model, 32);
    await screenSize(params, 32);
    await model.tap();
    await expect(editor.locator(".kk-model-menu")).toBeVisible();
    await model.tap();
    await expect(prompt).toHaveValue("同一节点的手机编辑草稿");
    await expect(editor).toHaveClass(/canvas-composer-screen/);
    const box = (await editor.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.1);
    await page.screenshot({
      path: testInfo.outputPath("phone-editor-real-world-zoom.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1099, height: 900 });
    await expect(editor).not.toHaveClass(/canvas-composer-screen/);
    await expect(prompt).toHaveValue("同一节点的手机编辑草稿");
    await page.setViewportSize(viewport);
    await expect(editor).toHaveClass(/canvas-composer-screen/);
    await expect(prompt).toHaveValue("同一节点的手机编辑草稿");
  });
}
