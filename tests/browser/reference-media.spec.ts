import { expect, test, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

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
  await expect(thumbs.first().locator("img")).toHaveAttribute(
    "alt",
    "landscape.png",
  );
  await expect(thumbs.last().locator("img")).toHaveAttribute(
    "alt",
    "square.png",
  );

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
  await expect(thumbs.locator("img")).toHaveAttribute("alt", "square.png");
  await page.screenshot({
    path: info.outputPath("desktop-reference-frames.png"),
    animations: "disabled",
  });
});
