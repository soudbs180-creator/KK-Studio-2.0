import { expect, test } from "@playwright/test";

async function rect(page: import("@playwright/test").Page, selector: string) {
  return page.locator(selector).boundingBox();
}

test("approved composer and shell geometry stays stable at phone and desktop sizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const phoneComposer = await rect(page, ".start-composer");
  expect(phoneComposer).not.toBeNull();
  expect(Math.round(phoneComposer!.width)).toBe(299);
  expect(Math.round(phoneComposer!.height)).toBe(170);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  const desktopComposer = await rect(page, ".start-composer");
  expect(desktopComposer).not.toBeNull();
  expect(Math.round(desktopComposer!.width)).toBe(652);
  expect(Math.round(desktopComposer!.height)).toBe(170);

  const sidebar = page.locator(".sidebar");
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await expect(sidebar).not.toHaveClass(/is-collapsed/);
  await page.waitForTimeout(350);
  expect(Math.round((await sidebar.boundingBox())!.width)).toBe(291);
  const toggle = page.getByRole("button", { name: "收起侧边栏", exact: true });
  await toggle.click();
  await expect(sidebar).toHaveClass(/is-collapsed/);
  await page.waitForTimeout(350);
  expect(Math.round((await sidebar.boundingBox())!.width)).toBe(70);
  await expect(sidebar.locator(".sidebar-icon-expand img")).toHaveAttribute(
    "src",
    /sidebar-expand\.svg$/,
  );
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await expect(sidebar).not.toHaveClass(/is-collapsed/);
  await page.waitForTimeout(350);
  expect(Math.round((await sidebar.boundingBox())!.width)).toBe(291);
  await expect(sidebar.locator(".sidebar-icon-toggle img")).toHaveAttribute(
    "src",
    /sidebar-collapse\.svg$/,
  );
});

test("desktop settings keeps the approved frame and mobile settings uses a bottom rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const desktopSettings = await rect(page, ".settings-panel");
  expect(desktopSettings).not.toBeNull();
  expect(Math.round(desktopSettings!.width)).toBe(920);
  expect(Math.round(desktopSettings!.height)).toBe(700);

  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".mobile-settings").click();
  await page.locator(".settings-panel").evaluate(async (panel) => {
    const dialog = panel.closest("dialog")!;
    await Promise.all(dialog.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });
  const mobileSettings = await rect(page, ".settings-panel");
  const mobileRail = await rect(page, ".settings-sidebar");
  expect(mobileSettings).not.toBeNull();
  expect(mobileRail).not.toBeNull();
  expect(Math.round(mobileRail!.y + mobileRail!.height)).toBe(
    Math.round(mobileSettings!.y + mobileSettings!.height),
  );
});
