import { expect, test } from "@playwright/test";
import { openWorkspace, waitForConversationPanelSettled } from "./helpers";

test("默认绿色、方形圆角上传与输入聚焦保持轻量", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "default");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--kk-accent")
        .trim(),
    ),
  ).toBe("#21a673");
  const upload = page.getByRole("button", {
    name: "添加参考素材",
    exact: true,
  });
  await expect(upload).toHaveCSS("border-radius", "8px");
  const input = page.getByRole("textbox", { name: "创作提示词", exact: true });
  await input.click();
  await input.fill("中文输入保持自然");
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(page.locator(".start-composer")).toHaveCSS(
    "border-color",
    "rgba(0, 0, 0, 0)",
  );
});

for (const width of [390, 1099, 1920]) {
  test(`模型胶囊按内容居中、上传保留方角 ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    await openWorkspace(page);
    if (
      await page
        .getByRole("button", { name: "打开对话", exact: true })
        .isVisible()
    )
      await page.getByRole("button", { name: "打开对话", exact: true }).click();
    await waitForConversationPanelSettled(page);
    const model = page.locator(".chat-model-picker");
    await expect(model).toBeVisible();
    await expect(model).toHaveCSS("justify-content", "center");
    await expect(page.locator(".chat-attachment-trigger")).toHaveCSS(
      "border-radius",
      "8px",
    );
    const layout = await model.evaluate((button) => {
      const label = button.querySelector<HTMLElement>(".chat-model-name")!;
      const rect = button.getBoundingClientRect();
      return {
        width: rect.width,
        labelWidth: label.clientWidth,
        fullLabelWidth: label.scrollWidth,
        right: rect.right,
        viewport: innerWidth,
      };
    });
    expect(layout.width).toBeGreaterThan(58);
    expect(layout.labelWidth).toBeGreaterThanOrEqual(layout.fullLabelWidth);
    expect(layout.right).toBeLessThanOrEqual(layout.viewport);
    await page.screenshot({
      path: testInfo.outputPath(`unified-${width}.png`),
      animations: "disabled",
    });
  });
}

test("首页生成数量和数据模式有独立可用入口并保存草稿", async ({ page }) => {
  await page.goto("/");
  await page.getByText("生成参数", { exact: true }).click();
  await page.getByLabel("生成数量", { exact: true }).selectOption("4");
  await page.getByLabel("隐私模式", { exact: true }).selectOption("local_only");
  await page.reload();
  await page.getByText("生成参数", { exact: true }).click();
  await expect(page.getByLabel("生成数量", { exact: true })).toHaveValue("4");
  await expect(page.getByLabel("隐私模式", { exact: true })).toHaveValue(
    "local_only",
  );
});
