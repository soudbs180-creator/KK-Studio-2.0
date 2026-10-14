import { expect, test } from "@playwright/test";
import { expandSidebar, openWorkspace, showCanvasNavigation } from "./helpers";

test.use({ hasTouch: true });

for (const viewport of [
  { width: 390, height: 400 },
  { width: 844, height: 390 },
]) {
  test(`短屏菜单滚动后完整命中 ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openWorkspace(page);
    await showCanvasNavigation(page);
    const stage = page.getByTestId("canvas-stage");
    const before = await stage.getAttribute("style");
    await page.getByRole("button", { name: "画布缩放", exact: true }).tap();
    const menu = page.getByRole("menu", { name: "画布缩放比例" });
    const canvas = await page.getByTestId("infinite-canvas").boundingBox();
    const box = await menu.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      canvas!.y + canvas!.height,
    );
    await menu.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const last = menu.getByRole("menuitemradio", { name: "400%", exact: true });
    expect(
      await last.evaluate((element) => {
        const r = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    ).toBe(true);
    await expect(stage).toHaveAttribute("style", before!);
    await page.screenshot({
      path: `test-results/evidence/menu-short-${viewport.width}.png`,
      animations: "disabled",
    });
    await last.tap();
    await expect(page.getByRole("button", { name: "画布缩放" })).toHaveText(
      "400%",
    );
    await expect(menu).toHaveCount(0);
  });
}

for (const width of [320, 1920]) {
  test(`背景按钮提供可见颜色入口并保留偏好 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 480 : 1080 });
    await openWorkspace(page);
    await showCanvasNavigation(page);
    const stage = page.getByTestId("canvas-stage");
    const before = await stage.getAttribute("style");
    await page.locator(".canvas-background").tap();
    const color = page.getByLabel("画布背景颜色", { exact: true });
    const box = await color.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(32);
    expect(box!.height).toBeGreaterThanOrEqual(32);
    expect(
      await color.evaluate((element) => {
        const r = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    ).toBe(true);
    await color.focus();
    await expect(color).toBeFocused();
    await color.fill("#253649");
    await expect(page.getByTestId("infinite-canvas")).toHaveCSS(
      "background-color",
      "rgb(37, 54, 73)",
    );
    await expect(stage).toHaveAttribute("style", before!);
    await page.locator(".canvas-background").tap();
    await page.getByRole("button", { name: "网格背景", exact: true }).tap();
    await expect(page.getByTestId("infinite-canvas")).toHaveClass(
      /canvas-pattern-grid/,
    );
    await page.reload();
    if (width >= 768) await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
    await expect(page.getByTestId("infinite-canvas")).toHaveCSS(
      "background-color",
      "rgb(37, 54, 73)",
    );
    await expect(page.getByTestId("infinite-canvas")).toHaveClass(
      /canvas-pattern-grid/,
    );
    await showCanvasNavigation(page);
    await page.locator(".canvas-background").tap();
    await page.screenshot({
      path: `test-results/evidence/background-visible-${width}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(page.locator(".canvas-background")).toBeFocused();
  });
}
