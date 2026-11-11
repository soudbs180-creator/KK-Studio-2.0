import { expect, test } from "@playwright/test";
import { openSettingsSection, selectSettingsSection } from "./helpers";

test("设置页长说明通过标题后的 info 提示展示，短说明仍在内容轴内", async ({
  page,
}) => {
  await page.goto("/");
  await openSettingsSection(page, "模型接入");

  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  const channelHint = dialog.locator(
    ".channel-panel-intro .settings-info-hint",
  );
  await expect(channelHint).toBeVisible();
  await channelHint.locator("button").focus();
  await expect(channelHint.getByRole("tooltip")).toBeVisible();
  await expect(channelHint.getByRole("tooltip")).toContainText(
    "官方开发者 API",
  );

  await selectSettingsSection(page, "网络与代理");
  const networkHint = dialog.locator(
    '.settings-network-section[data-figma-node="655:143029"] .settings-info-hint',
  );
  await networkHint.hover();
  await expect(networkHint.getByRole("tooltip")).toBeVisible();
  await expect(networkHint.getByRole("tooltip")).toContainText("本地物理网络");
  const content = dialog.locator(".settings-content");
  expect(
    await content.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("移动端 info 提示支持 Escape、CLI 入口和视口内定位", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openSettingsSection(page, "模型接入");

  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  const channelHint = dialog.locator(
    ".channel-panel-intro .settings-info-hint",
  );
  const trigger = channelHint.locator("button");
  await trigger.focus();
  await expect(channelHint.getByRole("tooltip")).toBeVisible();
  await trigger.press("Escape");
  await expect(channelHint.getByRole("tooltip")).toBeHidden();

  await dialog.getByRole("tab", { name: "CLI 直连 CLI", exact: true }).click();
  await dialog
    .getByRole("button", { name: "CodeBuddy CLI", exact: true })
    .click();
  const codeBuddyHint = dialog.locator(
    ".settings-codebuddy-card .settings-info-hint",
  );
  await codeBuddyHint.locator("button").focus();
  await expect(codeBuddyHint.getByRole("tooltip")).toBeVisible();
  const bounds = await codeBuddyHint
    .getByRole("tooltip")
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewport: innerWidth };
    });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
});
