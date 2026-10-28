import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

for (const width of [390, 1920]) {
  test(`任务列表关闭热区不遮挡搜索和工作台入口 ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1080 });
    await openWorkspace(page);
    const trigger = page.getByRole("button", {
      name: "打开任务列表",
      exact: true,
    });
    await trigger.click();
    const panel = page.getByRole("region", { name: "任务列表", exact: true });
    await panel
      .getByRole("searchbox", { name: "搜索任务", exact: true })
      .click();
    await expect(panel.getByRole("searchbox")).toBeFocused();
    const footer = panel.getByRole("button", {
      name: "打开任务工作台",
      exact: true,
    });
    await expect
      .poll(() =>
        footer.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            ),
          );
        }),
      )
      .toBe(true);
    await page.screenshot({ path: info.outputPath(`task-panel-${width}.png`) });
    await footer.click();
    await expect(
      page.getByRole("heading", { name: "任务工作台", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "关闭任务工作台", exact: true })
      .click();
    await trigger.click();
    await panel
      .getByRole("button", { name: "关闭任务列表", exact: true })
      .click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
