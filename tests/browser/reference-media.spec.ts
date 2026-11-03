import { expect, test, type Page } from "@playwright/test";
import { expandSidebar, openWorkspace } from "./helpers";
import fs from "node:fs/promises";

async function imageFile(
  page: Page,
  name: string,
  width: number,
  height: number,
) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#336699";
      context.fillRect(0, 0, width, height);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    { width, height },
  );
  return { name, mimeType: "image/png", buffer: Buffer.from(data, "base64") };
}

test("混合上传视频与竖图时首尾帧各占一个且缩略图保持72高", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).first();
  const chooser = page.waitForEvent("filechooser");
  await node.getByRole("button", { name: "添加参考图片", exact: true }).click();
  await (
    await chooser
  ).setFiles([
    {
      name: "motion.webm",
      mimeType: "video/webm",
      buffer: await fs.readFile("public/fixtures/demo/blue-hour-motion.webm"),
    },
    await imageFile(page, "portrait.png", 72, 128),
  ]);
  const thumbs = node.locator(".composer-ref-thumb");
  await expect(thumbs).toHaveCount(2);
  await expect(node.locator(".reference-slot-label")).toHaveText([
    "首帧",
    "尾帧",
  ]);
  await expect(thumbs.last()).toHaveAttribute("data-ratio", "1:1");
  for (const thumb of await thumbs.all())
    await expect(thumb).toHaveCSS("height", "72px");
  await expect(thumbs.first().locator("video, img")).toBeVisible();
  await expect
    .poll(() =>
      thumbs
        .first()
        .locator("video, img")
        .evaluate((element) =>
          element instanceof HTMLVideoElement
            ? element.readyState >= 1
            : (element as HTMLImageElement).naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(
    thumbs.last().locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "portrait.png");
});

test("图片首尾帧保持72高、横向交换且预览和移除仍可用", async ({
  page,
}, info) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).first();
  await expect(node.getByTestId("video-composer")).toBeVisible();
  const files = await Promise.all([
    imageFile(page, "square.png", 72, 72),
    imageFile(page, "landscape.png", 160, 90),
  ]);
  const chooser = page.waitForEvent("filechooser");
  await node.getByRole("button", { name: "添加参考图片", exact: true }).click();
  await (await chooser).setFiles(files);
  const thumbs = node.locator(".composer-ref-thumb");
  await expect(thumbs).toHaveCount(2);
  await expect(thumbs.first()).toHaveAttribute("data-ratio", "1:1");
  await expect(thumbs.last()).toHaveAttribute("data-ratio", "16:9");
  expect(
    await thumbs.evaluateAll((elements) =>
      elements.map((element) => ({
        width: (element as HTMLElement).offsetWidth,
        height: (element as HTMLElement).offsetHeight,
        label: element.querySelector(".reference-slot-label")?.textContent,
      })),
    ),
  ).toEqual([
    { width: 72, height: 72, label: "首帧" },
    { width: 128, height: 72, label: "尾帧" },
  ]);
  const swap = node.getByRole("button", { name: "交换视频首尾帧" });
  expect(
    await swap.evaluate((element) => ({
      width: element.offsetWidth,
      height: element.offsetHeight,
      icon: element.querySelector("svg")?.getAttribute("width"),
    })),
  ).toEqual({ width: 32, height: 32, icon: "20" });
  await swap.click();
  await expect(
    thumbs.first().locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "landscape.png");
  await expect(
    thumbs.last().locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "square.png");

  const previewButton = thumbs
    .first()
    .getByRole("button", { name: "预览参考素材：landscape.png" });
  await previewButton.hover();
  const preview = page.getByRole("dialog", {
    name: "参考素材预览：landscape.png",
    exact: true,
  });
  await expect(preview).toBeVisible();
  const [anchorBox, popupBox] = await Promise.all([
    previewButton.boundingBox(),
    preview.boundingBox(),
  ]);
  expect(popupBox!.y + popupBox!.height).toBeLessThanOrEqual(anchorBox!.y - 7);
  expect(popupBox!.x).toBeGreaterThanOrEqual(8);
  await expect(
    preview.getByRole("button", { name: "替换", exact: true }),
  ).toBeDisabled();
  await previewButton.click();
  const full = page.getByRole("dialog", {
    name: "预览参考素材：landscape.png",
    exact: true,
  });
  await expect(full).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(full).toHaveCount(0);
  await expect(previewButton).toBeFocused();
  await thumbs
    .first()
    .getByRole("button", { name: "移除参考图", exact: true })
    .click();
  await expect(thumbs).toHaveCount(1);
  await expect(
    thumbs.locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "square.png");
  await page.screenshot({
    path: info.outputPath("desktop-reference-frames.png"),
    animations: "disabled",
  });
});

test("视频结果卡上传、交换和重开后保留首尾帧", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const source = page.getByTestId(/^canvas-node-added-video-/).last();
  await source.getByLabel("视频提示词").fill("固定本地素材的结果卡参考测试");
  await source.getByRole("button", { name: "生成数量", exact: true }).click();
  await source.getByRole("button", { name: "生成 1 个", exact: true }).click();
  await source.getByRole("button", { name: "生成视频", exact: true }).click();
  const result = page
    .locator('[data-testid^="canvas-node-"]')
    .filter({
      has: page.locator(
        '.demo-result-node[data-kind="video"][data-generation-state="ready"]',
      ),
    })
    .first();
  await expect(result).toBeVisible();
  const resultId = (await result.getAttribute("data-testid"))!;
  await result.focus();
  await result.press("Enter");
  const chooser = page.waitForEvent("filechooser");
  await result
    .getByRole("button", { name: "添加参考图片", exact: true })
    .click();
  await (
    await chooser
  ).setFiles([
    await imageFile(page, "square-result.png", 72, 72),
    await imageFile(page, "landscape-result.png", 160, 90),
  ]);
  await expect(result.locator(".composer-ref-thumb")).toHaveCount(2);
  await expect(result.locator(".reference-frame-row > .is-empty")).toHaveCount(
    0,
  );
  const swap = result.getByRole("button", { name: "交换视频首尾帧" });
  await expect(swap).toBeEnabled();
  await swap.click();
  await expect(
    result
      .locator(".composer-ref-thumb")
      .last()
      .locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "square-result.png");
  await expect(
    result
      .locator(".composer-ref-thumb")
      .first()
      .locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "landscape-result.png");
  await expect(page.locator(".project-task-status")).toContainText("已保存");
  await page.reload();
  await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  const restored = page.getByTestId(resultId);
  await restored.focus();
  await restored.press("Enter");
  await expect(
    restored.locator(".reference-frame-row > .is-empty"),
  ).toHaveCount(0);
  await expect(restored.locator(".composer-ref-thumb")).toHaveCount(2);
  await expect(
    restored
      .locator(".composer-ref-thumb")
      .first()
      .locator(".reference-thumb-preview > img"),
  ).toHaveAttribute("alt", "landscape-result.png");
  await expect(
    restored.getByRole("button", { name: "交换视频首尾帧" }),
  ).toBeEnabled();
});
