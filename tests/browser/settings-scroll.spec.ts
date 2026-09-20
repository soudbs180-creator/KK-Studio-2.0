import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

for (const viewport of [
  { width: 779, height: 643 },
  { width: 390, height: 844 },
]) {
  test(`隐藏滚动条后设置仍可滚轮、键盘滚动并访问全部分类 ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "设置" });
    const content = dialog.locator(".settings-content");
    await expect(content).toHaveCSS("scrollbar-width", "none");
    await content.hover();
    await page.mouse.wheel(0, 450);
    await expect
      .poll(() => content.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await content.focus();
    await page.keyboard.press("Home");
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(0);
    await page.keyboard.press("End");
    await expect
      .poll(() => content.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await expect(
      dialog.getByRole("switch", { name: "防止系统休眠" }),
    ).toBeInViewport();
    const updates = dialog.getByRole("button", {
      name: "软件更新",
      exact: true,
    });
    await updates.focus();
    await expect(updates).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(dialog.locator(".settings-version")).toBeVisible();
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "打开设置", exact: true }),
    ).toBeFocused();
  });
}

test("资产列表隐藏滚动条后仍可滚动，浮岛设置作用于整个工作区", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  await page.getByRole("button", { name: "收起资产管理" }).click();
  const assets = page.locator(".asset-content");
  await expect(assets).toHaveCSS("scrollbar-width", "none");
  await assets.hover();
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => assets.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("switch", { name: "浮岛布局" }).click();
  await expect(page.locator(".workspace-content")).toHaveCSS(
    "border-radius",
    "0px",
  );
  await page.getByRole("switch", { name: "浮岛布局" }).click();
  await expect(page.locator(".workspace-content")).toHaveCSS(
    "border-radius",
    "20px",
  );
});
