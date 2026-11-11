import { expect } from "@playwright/test";

/** Reveal a clipped action with a real pan, leaving node data intact. */
export async function panCanvasToRevealAction(page, action) {
  const hit = () =>
    action.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const target = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return element === target || Boolean(target && element.contains(target));
    });
  if (await hit()) return;
  const canvas = page.getByTestId("infinite-canvas");
  const bounds = await canvas.boundingBox();
  const usableWidth = await canvas.evaluate(
    (element) =>
      (parseFloat(element.style.getPropertyValue("--canvas-usable-width")) *
        element.getBoundingClientRect().width) /
      element.offsetWidth,
  );
  const button = await action.boundingBox();
  const hud = await page.locator(".canvas-hud").boundingBox();
  const editorShell = page.locator(".canvas-composer-screen");
  const editor = (await editorShell.count())
    ? await editorShell.boundingBox()
    : null;
  const targetY = editor
    ? (hud.y + hud.height + editor.y) / 2
    : bounds.y + bounds.height / 2;
  const dx = bounds.x + usableWidth / 2 - (button.x + button.width / 2);
  const dy = targetY - (button.y + button.height / 2);
  const startX =
    dx < 0
      ? Math.min(bounds.x + usableWidth - 20, bounds.x + bounds.width - 20)
      : bounds.x + 20;
  const start = await canvas.evaluate(
    (element, preferred) => {
      for (const y of [0, -16, 16, -32, 32]) {
        for (const x of [0, -16, 16]) {
          const point = { x: preferred.x + x, y: preferred.y + y };
          if (document.elementFromPoint(point.x, point.y) === element)
            return point;
        }
      }
      // A card may cover the preferred edge; find another real canvas point.
      for (let y = preferred.top + 8; y < preferred.bottom - 8; y += 24) {
        for (let x = preferred.left + 8; x < preferred.right - 8; x += 24) {
          if (document.elementFromPoint(x, y) === element) return { x, y };
        }
      }
      throw new Error("没有找到可平移的空白画布，未从编辑器发起拖动");
    },
    {
      x: startX,
      y: targetY,
      left: bounds.x,
      right: bounds.x + usableWidth,
      top: bounds.y,
      bottom: bounds.y + bounds.height,
    },
  );
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await expect.poll(hit).toBe(true);
}
