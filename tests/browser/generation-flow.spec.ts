import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openWorkspace(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
}

test("图片上传预览和重绘未配置时保留草稿并打开供应商设置", async ({ page }) => {
  await openWorkspace(page);
  await expect(
    page.getByRole("button", { name: "示范素材", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const source = page.getByTestId(/^canvas-node-added-image-/).nth(0);
  await source
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(source.locator(".uploaded-image")).toBeVisible();
  await source.getByRole("button", { name: "放大查看参考图片" }).click();
  await expect(
    page.getByRole("dialog", { name: "预览参考图片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  await source.getByRole("button", { name: "重绘参考图片" }).click();
  await expect(
    page.getByRole("dialog", { name: "重绘参考图片" }),
  ).toBeVisible();
  const redrawPrompt = "保留主体，替换为蓝调夜景";
  await page.getByLabel("重绘指令").fill(redrawPrompt);
  await page.getByRole("button", { name: "开始重绘", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "模型接入", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("重绘指令")).toHaveValue(redrawPrompt);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  // An uploaded reference card intentionally has no composer. Create a
  // separate image module for the generation path under test.
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const generator = page.getByTestId(/^canvas-node-added-image-/).nth(1);
  await generator.getByLabel("图片提示词").fill("海边的蓝调时刻");
  await generator
    .getByRole("button", { name: "生成数量", exact: true })
    .click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await expect(generator.locator(".local-generation-status")).toHaveCount(0);
  await generator
    .getByRole("button", { name: "生成图片", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(generator.getByLabel("图片提示词")).toHaveValue(
    "海边的蓝调时刻",
  );
  await expect(
    page.locator(".demo-result-node[data-source=demo][data-kind=image]"),
  ).toHaveCount(0);
  await expect(page.getByTestId(/^connector-added-image-/)).toHaveCount(0);
});

test("音频草稿选中后在卡片下方输入，生成后可以播放本地结果", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "音频", exact: true }).click();
  const source = page.getByTestId(/^canvas-node-added-audio-/).nth(0);
  const body = (await source.locator(".demo-result-node").boundingBox())!;
  const composer = source.getByTestId("audio-composer");
  await expect(composer).toBeVisible();
  expect((await composer.boundingBox())!.y).toBeGreaterThan(
    body.y + body.height,
  );
  await source.getByLabel("音频提示词").fill("温和的合成和弦");
  await source.getByRole("button", { name: "生成音频", exact: true }).click();
  await expect(
    page.locator(".demo-result-node[data-source=demo][data-kind=audio]"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "预览蓝调氛围", exact: true }).click();
  const media = page.locator("audio");
  await expect
    .poll(() => media.evaluate((el) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  await media.evaluate((el) => el.play());
  await expect
    .poll(() => media.evaluate((el) => el.currentTime))
    .toBeGreaterThan(0);
});
