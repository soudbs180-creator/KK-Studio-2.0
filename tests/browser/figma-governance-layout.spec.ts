import { expect, test } from "@playwright/test";
import { selectSettingsSection, showSettingsCategories } from "./helpers";

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

test("desktop settings uses the compact frame and phone settings uses layered navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const desktopSettings = await rect(page, ".settings-panel");
  expect(desktopSettings).not.toBeNull();
  expect(Math.round(desktopSettings!.width)).toBe(960);
  expect(Math.round(desktopSettings!.height)).toBe(680);
  const desktopRail = await rect(page, ".settings-sidebar");
  expect(desktopRail).not.toBeNull();
  expect(Math.round(desktopRail!.width)).toBe(208);
  expect(desktopSettings!.x).toBeGreaterThanOrEqual(0);
  expect(desktopSettings!.x + desktopSettings!.width).toBeLessThanOrEqual(1920);

  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".mobile-settings").click();
  await page.locator(".settings-panel").evaluate(async (panel) => {
    const dialog = panel.closest("dialog")!;
    await Promise.all(
      dialog
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  const dialog = page.getByRole("dialog", { name: "设置" });
  const mobileSettings = await rect(page, ".settings-panel");
  expect(mobileSettings).not.toBeNull();
  expect(mobileSettings!.x).toBeGreaterThanOrEqual(0);
  expect(mobileSettings!.x + mobileSettings!.width).toBeLessThanOrEqual(390);
  await expect(dialog.locator(".settings-content h2")).toHaveText("通用");
  await expect(dialog.locator(".settings-sidebar")).toBeHidden();
  const back = dialog.getByRole("button", {
    name: "返回设置分类",
    exact: true,
  });
  await expect(back).toBeVisible();
  expect((await back.boundingBox())!.height).toBe(40);
  const categories = await showSettingsCategories(page);
  await expect(dialog.locator(".settings-content")).toBeHidden();
  const mobileRail = await rect(page, ".settings-sidebar");
  expect(mobileRail).not.toBeNull();
  expect(mobileRail!.x).toBeGreaterThanOrEqual(mobileSettings!.x);
  expect(mobileRail!.x + mobileRail!.width).toBeLessThanOrEqual(
    mobileSettings!.x + mobileSettings!.width,
  );
  await expect(categories).toHaveCSS("flex-direction", "column");
  await selectSettingsSection(page, "通用");
  await expect(dialog.locator(".settings-content h2")).toHaveText("通用");
  await expect(dialog.locator(".settings-sidebar")).toBeHidden();
});
