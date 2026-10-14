import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

const productionOrigin = "http://127.0.0.1:1423";

export async function inspectPage(
  page: Page,
  root: Locator,
  name: string,
  info: TestInfo,
) {
  await expect(root).toBeVisible();
  const metrics = await root.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const visible = (item: Element): boolean => {
      const box = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      return Boolean(
        item.getClientRects().length &&
        style.visibility !== "hidden" &&
        box.bottom > Math.max(0, bounds.top) &&
        box.top < Math.min(innerHeight, bounds.bottom) &&
        box.right > bounds.left &&
        box.left < bounds.right,
      );
    };
    const label = (item: Element) =>
      item.getAttribute("aria-label") || item.textContent?.trim().slice(0, 65);
    const text = [...element.querySelectorAll("*")]
      .filter(
        (item) =>
          visible(item) &&
          [...item.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          ),
      )
      .map((item) => ({
        label: label(item),
        font: parseFloat(getComputedStyle(item).fontSize),
        className: item.className,
      }));
    const controls = [
      ...element.querySelectorAll(
        ".ui-button,.primary-button,.kk-button,.settings-action,.task-workbench-actions button,.batch-cell button,.comment-region-presets button,.comment-entry button",
      ),
    ]
      .filter(visible)
      .map((item) => ({
        label: label(item),
        height: parseFloat(getComputedStyle(item).height),
        radius: getComputedStyle(item).borderRadius,
      }));
    const primary = [
      ...element.querySelectorAll(".primary-button,.kk-button--primary"),
    ]
      .filter(visible)
      .map(label);
    return {
      text,
      controls,
      primary,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      url: location.href,
      scripts: [...document.scripts]
        .map((script) => script.src)
        .filter(Boolean),
      styles: [...document.styleSheets]
        .map((sheet) => sheet.href)
        .filter(Boolean),
    };
  });
  await info.attach(name, {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath(`${name}.png`) });
  expect(
    metrics.text.filter((item) => item.font < 12),
    "所有可见文字至少 12px",
  ).toEqual([]);
  expect(
    metrics.controls.filter(
      (item) =>
        ![24, 32, 40].some((height) => Math.abs(item.height - height) < 1),
    ),
    "标准动作遵循 24/32/40 高度",
  ).toEqual([]);
  expect(metrics.primary.length, "页面只有一个 Primary").toBeLessThanOrEqual(1);
  expect(metrics.bounds.x).toBeGreaterThanOrEqual(0);
  expect(metrics.bounds.x + metrics.bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  expect(new URL(page.url()).origin).toBe(productionOrigin);
}
