import { surfaceScale } from "./canvasSurface";

/** Shared physical geometry for the toolbar and selection viewport reveal. */
export function getImageSelectionPosition(
  element: HTMLElement,
  canvas: HTMLElement,
  toolbar: HTMLElement,
) {
  const card = element.getBoundingClientRect();
  const caption = element
    .closest("[data-canvas-node]")
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
      ".canvas-hud-actions,.canvas-hud .chat-reopen,.canvas-top-right,.canvas-zoom-menu,.canvas-background-menu,.canvas-minimap,.canvas-composer-screen,.canvas-toolbar",
    ),
  ]
    .filter((hud) => getComputedStyle(hud).visibility !== "hidden")
    .map((hud) => hud.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0);
  const center = card.left + card.width / 2;
  const firstAction = toolbar.querySelector("button");
  // A clamped button width feeds back into maxWidth; measure its full contents.
  const minimumWidth =
    (firstAction
      ? firstAction.scrollWidth +
        firstAction.offsetWidth -
        firstAction.clientWidth
      : 0) +
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
  // Search both sides of overlays; moving only down can hide actions beneath
  // the phone editor and bottom toolbar even when a clear row exists above.
  const minimumTop = bounds.top + gap;
  const maximumTop =
    Math.min(bounds.bottom, window.innerHeight) - gap - toolbar.offsetHeight;
  const reachableTop =
    [
      Math.max(top, minimumTop),
      ...obstacles.flatMap((box) => [
        box.top - gap - toolbar.offsetHeight,
        box.bottom + gap,
      ]),
    ]
      .filter((value) => value >= minimumTop && value <= maximumTop)
      .sort((left, right) => Math.abs(left - top) - Math.abs(right - top))
      .find((value) => slotAt(value)) ?? Math.max(top, minimumTop);
  const slot = slotAt(reachableTop);
  const maxWidth = slot ? slot[1] - slot[0] : 0;
  const width = Math.min(toolbar.scrollWidth, maxWidth);
  const left = slot
    ? Math.max(slot[0], Math.min(center - width / 2, slot[1] - width))
    : leftEdge;
  return {
    left,
    top: reachableTop,
    maxWidth,
    revealDelta: reachableTop > top ? reachableTop - top + 1 : 0,
    visible:
      !canvas.closest("[inert]") &&
      maxWidth > 0 &&
      reachableTop + toolbar.offsetHeight <=
        Math.min(bounds.bottom, window.innerHeight) - gap &&
      card.bottom > bounds.top &&
      card.top < bounds.bottom &&
      card.right > leftEdge &&
      card.left < rightEdge,
  };
}
