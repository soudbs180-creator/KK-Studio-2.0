import { expect, test } from "@playwright/test";
import { openSettingsSection } from "./helpers";

test.use({ hasTouch: true });

for (const width of [1920, 1099, 390, 320]) {
  test(`${width}px 通用控件命中区、完整选项与触屏保存`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await openSettingsSection(page, "通用");
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    const floating = dialog.getByRole("switch", { name: "浮岛布局" });
    const box = await floating.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(32);
    const initial = await floating.getAttribute("aria-checked");
    await floating.tap();
    await expect(floating).toHaveAttribute(
      "aria-checked",
      initial === "true" ? "false" : "true",
    );
    const theme = dialog.getByRole("combobox", { name: "主题", exact: true });
    await theme.selectOption("system");
    for (const name of ["主题", "强调色"]) {
      const select = dialog.getByRole("combobox", { name, exact: true });
      const geometry = await select.evaluate((element) => {
        const input = element as HTMLSelectElement;
        const style = getComputedStyle(input);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = style.font;
        return {
          text: context.measureText(input.selectedOptions[0].textContent!)
            .width,
          available:
            input.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight) -
            16,
          right: input.getBoundingClientRect().right,
        };
      });
      expect(geometry.available).toBeGreaterThanOrEqual(geometry.text);
      expect(geometry.right).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: info.outputPath(`settings-${width}.png`),
      animations: "disabled",
    });
    await page.reload();
    await openSettingsSection(page, "通用");
    await expect(floating).toHaveAttribute(
      "aria-checked",
      initial === "true" ? "false" : "true",
    );
    await expect(theme).toHaveValue("system");
  });
}

test("Google 获取密钥通过实际链接打开独立页面", async ({ page, context }) => {
  await context.route("https://aistudio.google.com/apikey", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Key link fixture</h1>",
    }),
  );
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .tap();
  const link = page.getByRole("link", { name: "获取 API Key", exact: true });
  await expect(link).toHaveAttribute(
    "href",
    "https://aistudio.google.com/apikey",
  );
  const opened = context.waitForEvent("page");
  await link.tap();
  const keyPage = await opened;
  await expect(
    keyPage.getByRole("heading", { name: "Key link fixture" }),
  ).toBeVisible();
  await keyPage.close();
});
