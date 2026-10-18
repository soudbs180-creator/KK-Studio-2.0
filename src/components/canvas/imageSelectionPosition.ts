import { surfaceScale, toSurfacePoint } from "./canvasSurface";

/** Keep screen-sized actions centered on their card within the canvas. */
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
  const upload = element
    .closest("[data-canvas-node]")
    ?.querySelector(".upload-image")
    ?.getBoundingClientRect();
  const gap = parseFloat(
    getComputedStyle(toolbar).getPropertyValue("--kk-space-2"),
  );
  const top =
    Math.min(
      card.top,
      caption?.top ?? card.top,
      upload?.height ? upload.top : card.top,
    ) -
    toolbar.offsetHeight -
    gap;
  const point = toSurfacePoint(canvas, {
    x: card.left + card.width / 2 - toolbar.offsetWidth / 2,
    y: top,
  });
  return {
    left: point.x,
    top: point.y,
    scale: 1 / surfaceScale(canvas),
    visible: !canvas.closest("[inert]"),
  };
}
