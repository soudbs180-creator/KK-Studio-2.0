/** Physical browser pixels to the fixed 1920×1080 canvas coordinate space. */
export function surfaceScale(element: HTMLElement): number {
  const layoutWidth = element.offsetWidth;
  const visualWidth = element.getBoundingClientRect().width;
  return layoutWidth > 0 && visualWidth > 0 ? visualWidth / layoutWidth : 1;
}

export function toSurfaceDelta(element: HTMLElement, value: number): number {
  return value / surfaceScale(element);
}

export function toSurfacePoint(
  element: HTMLElement,
  point: { x: number; y: number },
): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  const scale = surfaceScale(element);
  return {
    // Browser client coordinates and DOMRect are visual pixels; clientLeft/
    // clientTop remain logical border widths even when the surface scales.
    x: (point.x - box.left) / scale - element.clientLeft,
    y: (point.y - box.top) / scale - element.clientTop,
  };
}
