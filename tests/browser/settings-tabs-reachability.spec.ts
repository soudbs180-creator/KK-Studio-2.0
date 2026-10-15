import { expect, test } from "@playwright/test";
import { openSettingsSection } from "./helpers";

for (const width of [320, 390, 1920]) {
  test(`扩展分类文字与命中区完整 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 480 });
    await page.goto("/");
    await openSettingsSection(page, "扩展");
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    const tabs = dialog.getByRole("tablist", { name: "Skill、MCP 与协作伙伴" });
    const bounds = await tabs.boundingBox();
    for (const tab of await tabs.getByRole("tab").all()) {
      const geometry = await tab.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const text = element.querySelector("span")!.getBoundingClientRect();
        const parent = element.parentElement!.getBoundingClientRect();
        return {
          right: box.right,
          parentRight: parent.right,
          textLeft: text.left,
          textRight: text.right,
          left: box.left,
          width: box.width,
          hit: element.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            ),
          ),
        };
      });
      expect(geometry.right).toBeLessThanOrEqual(geometry.parentRight);
      expect(geometry.textLeft).toBeGreaterThanOrEqual(geometry.left);
      expect(geometry.textRight).toBeLessThanOrEqual(geometry.right);
      expect(geometry.hit).toBe(true);
    }
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await tabs.getByRole("tab", { name: /协作伙伴/ }).click();
    await expect(tabs.getByRole("tab", { name: /协作伙伴/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await tabs.getByRole("tab", { name: /^MCP/ }).click();
    await expect(dialog.getByLabel("MCP服务器名称")).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`evidence/settings-extensions-${width}.png`),
      animations: "disabled",
    });
  });
}
