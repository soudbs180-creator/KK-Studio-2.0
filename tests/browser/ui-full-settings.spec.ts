import { expect, test } from "@playwright/test";
import { SETTINGS_SECTIONS } from "../../src/components/settings/SettingsSectionData";
import { openSettingsSection, selectSettingsSection } from "./helpers";
import { inspectPage } from "./uiPageRules";

for (const width of [390, 1099, 1920]) {
  test(`全部设置分类使用当前UI ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto("/");
    await openSettingsSection(page, "通用");
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    for (const section of SETTINGS_SECTIONS) {
      await selectSettingsSection(page, section.label);
      await expect(dialog.locator(".settings-panel")).toHaveAttribute(
        "data-section",
        section.id,
      );
      await inspectPage(page, dialog, `settings-${section.id}-${width}`, info);
      const content = dialog.locator(".settings-content");
      if (
        await content.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        )
      ) {
        await content.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await inspectPage(
          page,
          dialog,
          `settings-${section.id}-bottom-${width}`,
          info,
        );
      }
    }
  });
}
