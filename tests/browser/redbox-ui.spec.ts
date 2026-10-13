import { expect, test, type Locator, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

const imageFixture = "public/fixtures/demo/blue-hour.png";

async function addImageNode(page: Page): Promise<Locator> {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-image-/).first();
  await expect(node).toBeVisible();
  return node;
}

test("空态图片卡片的标题在左上角且上传按钮居中", async ({ page }) => {
  const node = await addImageNode(page);
  const card = node.locator(".image-creation");
  const preview = node.locator(".image-preview");
  const caption = node.locator(".image-caption");
  const upload = node.getByRole("button", { name: "上传图片", exact: true });
  const [cardBox, previewBox, captionBox, uploadBox] = await Promise.all([
    card.boundingBox(),
    preview.boundingBox(),
    caption.boundingBox(),
    upload.boundingBox(),
  ]);
  expect(cardBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(captionBox).not.toBeNull();
  expect(uploadBox).not.toBeNull();
  expect(captionBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
  expect(captionBox!.x).toBeLessThanOrEqual(previewBox!.x + 24);
  expect(captionBox!.y).toBeLessThan(previewBox!.y);
  await expect(preview).toHaveCSS("border-radius", "20px");
  expect(
    Math.abs(
      uploadBox!.x +
        uploadBox!.width / 2 -
        (previewBox!.x + previewBox!.width / 2),
    ),
  ).toBeLessThanOrEqual(1);
});

async function uploadMainImage(node: Locator): Promise<void> {
  await node.locator('input[type="file"]').first().setInputFiles(imageFixture);
  await expect(node.locator(".uploaded-image")).toBeVisible();
  await node.locator(".uploaded-image").click();
  await expect(node.getByTestId("image-composer")).toBeVisible();
}

function intersects(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

test("主图上传保留同节点编辑器，主体槽预览且操作区不遮挡末槽", async ({
  page,
}, testInfo) => {
  const node = await addImageNode(page);
  await uploadMainImage(node);
  await expect(node.getByLabel("图片提示词")).toBeVisible();

  await node.getByRole("button", { name: "展开提示词", exact: true }).click();
  const subject = node.locator('.reference-slot[data-slot="主体"]');
  const lastSlot = node.locator('.reference-slot[data-slot="Mask"]');
  await expect(subject.locator("img.reference-thumbnail")).toBeVisible();
  await expect(lastSlot).toBeVisible();

  const toolbar = page.getByRole("toolbar", {
    name: "图片操作：blue-hour.png",
    exact: true,
  });
  const like = toolbar.getByRole("button", {
    name: "喜欢blue-hour.png",
    exact: true,
  });
  const expand = node.getByRole("button", { name: "收起提示词", exact: true });
  const [slotBox, likeBox, expandBox] = await Promise.all([
    lastSlot.boundingBox(),
    like.boundingBox(),
    expand.boundingBox(),
  ]);
  expect(slotBox).not.toBeNull();
  expect(likeBox).not.toBeNull();
  expect(expandBox).not.toBeNull();
  expect(likeBox!.width).toBeGreaterThanOrEqual(32);
  await expect(like).toHaveCSS("justify-content", "center");
  expect(
    await like.evaluate((button) => button.scrollWidth <= button.clientWidth),
  ).toBe(true);
  expect(likeBox!.height).toBe(32);
  expect(expandBox!.width).toBe(32);
  expect(expandBox!.height).toBe(32);
  expect(intersects(slotBox!, likeBox!)).toBe(false);
  expect(intersects(slotBox!, expandBox!)).toBe(false);
  expect(intersects(likeBox!, expandBox!)).toBe(false);
  await node.locator(".creation-composer").screenshot({
    path: testInfo.outputPath("main-upload-expanded.png"),
    animations: "disabled",
  });
});

test("喜欢状态在取消选择并重新选择后保持", async ({ page }, testInfo) => {
  const node = await addImageNode(page);
  await uploadMainImage(node);
  const toolbar = page.getByRole("toolbar", {
    name: "图片操作：blue-hour.png",
    exact: true,
  });
  const like = toolbar.getByRole("button", {
    name: "喜欢blue-hour.png",
    exact: true,
  });
  await like.click();
  await expect(
    toolbar.getByRole("button", { name: "取消喜欢blue-hour.png", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(node).not.toHaveClass(/is-selected/);
  await node.focus();
  await page.keyboard.press("Enter");
  await expect(node).toHaveClass(/is-selected/);
  await expect(
    toolbar.getByRole("button", { name: "取消喜欢blue-hour.png", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: testInfo.outputPath("liked-after-reselect.png"),
    animations: "disabled",
  });
});

test("紧凑参考图的移除按钮可见、可命中且移除后不残留", async ({
  page,
}, testInfo) => {
  const node = await addImageNode(page);
  const chooser = page.waitForEvent("filechooser");
  await node.getByRole("button", { name: "添加参考图片", exact: true }).click();
  await (await chooser).setFiles(imageFixture);
  await expect(node.locator(".composer-ref-thumb")).toHaveCount(1);

  const remove = node.getByRole("button", { name: "移除参考图", exact: true });
  await expect(remove).toBeVisible();
  const hit = await remove.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const parent = button.parentElement;
    const center = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      width: rect.width,
      height: rect.height,
      overflow: parent ? getComputedStyle(parent).overflow : "",
      centerIsButton: center === button || button.contains(center),
    };
  });
  expect(hit.width).toBeGreaterThan(0);
  expect(hit.height).toBeGreaterThan(0);
  expect(hit.overflow).toBe("visible");
  expect(hit.centerIsButton).toBe(true);

  await remove.click();
  await expect(node.locator(".composer-ref-thumb")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("compact-reference-removed.png"),
    animations: "disabled",
  });
});

test("风格参考在收起和展开提示词后保持语义槽位", async ({ page }, testInfo) => {
  const node = await addImageNode(page);
  const chooser = page.waitForEvent("filechooser");
  await node.getByRole("button", { name: "添加参考图片", exact: true }).click();
  await (await chooser).setFiles([imageFixture, imageFixture]);
  await expect(node.locator(".composer-ref-thumb")).toHaveCount(2);

  await node.getByRole("button", { name: "展开提示词", exact: true }).click();
  await expect(
    node.locator('.reference-slot[data-slot="主体"] img.reference-thumbnail'),
  ).toBeVisible();
  await expect(
    node.locator('.reference-slot[data-slot="风格"] img.reference-thumbnail'),
  ).toBeVisible();
  await node.getByRole("button", { name: "收起提示词", exact: true }).click();
  await expect(node.locator(".composer-ref-thumb")).toHaveCount(2);
  await node.getByRole("button", { name: "展开提示词", exact: true }).click();
  await expect(
    node.locator('.reference-slot[data-slot="主体"] img.reference-thumbnail'),
  ).toBeVisible();
  await expect(
    node.locator('.reference-slot[data-slot="风格"] img.reference-thumbnail'),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("style-slot-after-toggle.png"),
    animations: "disabled",
  });
});

test("底部工具栏各图标使用统一的 40px 视觉槽位", async ({ page }) => {
  await openWorkspace(page);
  const toolbar = page.locator(".canvas-toolbar");
  await expect(toolbar).toBeVisible();

  const slots = await Promise.all(
    [
      ".toolbar-icon-select",
      ".toolbar-icon-assets",
      ".toolbar-icon-favorite",
    ].map((selector) => toolbar.locator(selector).boundingBox()),
  );
  for (const box of slots) {
    expect(box).not.toBeNull();
    expect(box!.width).toBe(40);
    expect(box!.height).toBe(40);
  }

  const buttons = await Promise.all(
    [".toolbar-current-tool", ".toolbar-assets", ".toolbar-save"].map(
      (selector) => toolbar.locator(selector).boundingBox(),
    ),
  );
  for (const box of buttons) {
    expect(box).not.toBeNull();
    expect(box!.width).toBe(40);
    expect(box!.height).toBe(40);
  }
});
