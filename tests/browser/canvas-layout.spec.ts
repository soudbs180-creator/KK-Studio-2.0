import { expect, test } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

test("桌面底栏保持最新Frame锚点，窄屏适配且控件不互相覆盖", async ({
  page,
}) => {
  await openWorkspace(page);
  const checkLayout = async (state: string): Promise<void> => {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const canvas = document.querySelector<HTMLElement>(".canvas")!;
          const c = canvas.getBoundingClientRect();
          const surface = c.width / canvas.offsetWidth;
          const chat = document
            .querySelector(".conversation-panel")
            ?.getBoundingClientRect();
          const usable =
            chat && chat.width > 0 && window.innerWidth > 1200
              ? Math.min(
                  canvas.clientWidth,
                  (chat.left - c.left) / surface - canvas.clientLeft - 16,
                )
              : canvas.clientWidth;
          const toolbar =
            document.querySelector<HTMLElement>(".canvas-toolbar")!;
          const t = toolbar.getBoundingClientRect();
          const app = document.querySelector(".app")!.getBoundingClientRect();
          // DS1.2 retains x866 at 1920 and adapts its anchor to the real viewport.
          // Compact overlays do not reserve horizontal canvas space.
          const expected =
            window.innerWidth > 1200
              ? app.x + app.width / 2 - 94
              : c.x + (canvas.clientLeft + usable / 2) * surface;
          return Math.abs(t.x + t.width / 2 - expected);
        }),
      )
      .toBeLessThan(1);
    const collisions = await page.evaluate(() => {
      const boxes = [
        ".task-button",
        ".demo-library-trigger",
        ".canvas-top-right",
        ".chat-reopen",
      ]
        .map((s) => ({
          name: s,
          rect: document.querySelector(s)?.getBoundingClientRect(),
        }))
        .filter((b): b is { name: string; rect: DOMRect } =>
          Boolean(b.rect && b.rect.width > 0),
        );
      return boxes.flatMap((a, i) =>
        boxes
          .slice(i + 1)
          .filter(
            (b) =>
              Math.min(a.rect.right, b.rect.right) >
                Math.max(a.rect.left, b.rect.left) &&
              Math.min(a.rect.bottom, b.rect.bottom) >
                Math.max(a.rect.top, b.rect.top),
          )
          .map((b) => `${a.name} / ${b.name}`),
      );
    });
    expect(collisions, state).toEqual([]);
  };
  for (const width of [1920, 1440, 1024, 801, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await checkLayout(`viewport ${width}`);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await checkLayout("chat closed");
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await checkLayout("sidebar collapsed");
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await checkLayout("chat reopened");
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await checkLayout("sidebar expanded");
});

test("缩放和窄屏命中尺寸变化后，加号与删线按钮仍对齐连接位置", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const zoom of ["50%", "100%", "200%"]) {
      await page.locator(".canvas-zoom-trigger").click();
      await page
        .getByRole("menuitemradio", { name: zoom, exact: true })
        .click();
      const positions = await page
        .getByTestId("connector-video1")
        .evaluate((el) => {
          const curve = el as SVGPathElement;
          const screen = (p: DOMPoint) =>
            new DOMPoint(p.x, p.y).matrixTransform(curve.getScreenCTM()!);
          const a = screen(curve.getPointAtLength(0)),
            b = screen(curve.getPointAtLength(curve.getTotalLength()));
          const add = document
            .querySelector("[data-testid=canvas-node-image] .node-add-follow")!
            .getBoundingClientRect();
          const del = curve
            .closest(".connection")!
            .querySelector(".connection-delete")!
            .getBoundingClientRect();
          return {
            gap: add.x - a.x,
            y: add.y + add.height / 2 - a.y,
            size: add.width,
            dx: del.x + del.width / 2 - (a.x + b.x) / 2,
            dy: del.y + del.height / 2 - (a.y + b.y) / 2,
          };
        });
      // The source gap is 8 logical px; desktop letterboxing scales its
      // visual size while the narrow surface retains the 8px contract.
      const surface = 1; // DS1.2 screen controls are never letterboxed/scaled.
      expect(positions.gap).toBeCloseTo(8 * surface, 1);
      expect(positions.y).toBeCloseTo(0, 1);
      expect(positions.dx).toBeCloseTo(0, 1);
      expect(positions.dy).toBeCloseTo(0, 1);
      expect(positions.size).toBeCloseTo((width <= 800 ? 44 : 28) * surface, 1);
    }
  }
});

test("工具菜单互斥并保留键盘焦点，减弱动态不播放动画", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  const toggle = page.getByRole("button", {
    name: "选择画布工具",
    exact: true,
  });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".add-node-menu")).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(toggle).toBeFocused();
  await expect(page.getByTestId("infinite-canvas")).toHaveAttribute(
    "data-tool",
    "hand",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  expect(
    await page
      .locator(".canvas-toolbar")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
