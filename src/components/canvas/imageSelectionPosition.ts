import { surfaceScale } from "./canvasSurface";

/** Shared physical geometry for the toolbar and selection viewport reveal. */
export function getImageSelectionPosition(
  element: HTMLElement,
  canvas: HTMLElement,
  toolbar: HTMLElement,
) {
  const card = element.getBoundingClientRect();
  const caption = element.parentElement
    ?.querySelector(".image-caption")
    ?.getBoundingClientRect();
  const bounds = canvas.getBoundingClientRect();
  const scale = surfaceScale(canvas);
  const gap = parseFloat(
    getComputedStyle(toolbar).getPropertyValue("--kk-space-2"),
  );
  const usableWidth =
    parseFloat(canvas.style.getPropertyValue("--canvas-usable-width")) * scale;
  const leftEdge = Math.max(0, bounds.left) + gap;
  const rightEdge =
    Math.min(window.innerWidth, bounds.right, bounds.left + usableWidth) - gap;
  const top =
    Math.min(card.top, caption?.top ?? card.top) - toolbar.offsetHeight - gap;
  const obstacles = [
    ...canvas.querySelectorAll<HTMLElement>(
      ".canvas-hud-actions,.canvas-top-right,.canvas-minimap",
    ),
  ]
    .filter((hud) => getComputedStyle(hud).visibility !== "hidden")
    .map((hud) => hud.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0);
  const center = card.left + card.width / 2;
  const minimumWidth =
    (toolbar.querySelector("button")?.getBoundingClientRect().width ?? 0) +
    gap * 2;
  const slotAt = (actionTop: number): [number, number] | undefined => {
    let slots: Array<[number, number]> = [[leftEdge, rightEdge]];
    for (const box of obstacles) {
      if (
        actionTop < box.bottom + gap &&
        actionTop + toolbar.offsetHeight > box.top - gap
      ) {
        slots = slots.flatMap(([start, end]) => {
          if (box.right + gap <= start || box.left - gap >= end)
            return [[start, end]];
          const remaining: Array<[number, number]> = [];
          if (box.left - gap > start) remaining.push([start, box.left - gap]);
          if (box.right + gap < end) remaining.push([box.right + gap, end]);
          return remaining;
        });
      }
    }
    return slots
      .filter(([start, end]) => end - start >= minimumWidth)
      .sort(
        (a, b) =>
          Math.abs(Math.max(a[0], Math.min(center, a[1])) - center) -
          Math.abs(Math.max(b[0], Math.min(center, b[1])) - center),
      )[0];
  };
  const slot = slotAt(top);
  const maxWidth = slot ? slot[1] - slot[0] : 0;
  const width = Math.min(toolbar.scrollWidth, maxWidth);
  const left = slot
    ? Math.max(slot[0], Math.min(center - width / 2, slot[1] - width))
    : leftEdge;
  // Find the nearest row that can hold the first action. Compact HUD rows can
  // jointly occupy the full width even when each row leaves a horizontal gap.
  let reachableTop = Math.max(top, bounds.top + gap);
  for (
    let index = 0;
    !slotAt(reachableTop) && index <= obstacles.length;
    index++
  ) {
    const blocking = obstacles.filter(
      (box) =>
        reachableTop < box.bottom + gap &&
        reachableTop + toolbar.offsetHeight > box.top - gap,
    );
    if (!blocking.length) break;
    reachableTop = Math.max(...blocking.map((box) => box.bottom + gap));
  }
  return {
    left,
    top,
    maxWidth,
    revealDelta: reachableTop > top ? reachableTop - top + 1 : 0,
    visible:
      !canvas.closest("[inert]") &&
      maxWidth > 0 &&
      top >= bounds.top + gap &&
      card.bottom > bounds.top &&
      card.top < bounds.bottom &&
      card.right > leftEdge &&
      card.left < rightEdge,
  };
}
