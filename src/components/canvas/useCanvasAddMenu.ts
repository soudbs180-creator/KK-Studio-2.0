import { useState, type RefObject, type MouseEvent } from "react";
import type { CanvasItemKind } from "../../domain/canvasItems";
import { cardVisualBounds } from "../../domain/canvasGraph";
import type { Point, ViewTransform } from "../../domain/canvasViewport";
import type { AddNodeOptions } from "./useCanvasNodeActions";
import { toSurfacePoint } from "./canvasSurface";

export interface AddMenuRequest {
  client: Point;
  trigger: HTMLElement;
  parentId?: string;
  atPoint?: boolean;
}
export interface AddMenuState extends AddMenuRequest {
  world?: Point;
}
export function useCanvasAddMenu(
  container: RefObject<HTMLDivElement>,
  transform: ViewTransform,
  add: (kind: CanvasItemKind, options?: AddNodeOptions) => string,
  connect: (parentId: string, targetId: string) => void,
) {
  const [menu, setMenu] = useState<AddMenuState | null>(null);
  function dismiss(restoreFocus = true): void {
    if (restoreFocus) menu?.trigger.focus({ preventScroll: true });
    setMenu(null);
  }
  function open(request: AddMenuRequest): void {
    const canvas = container.current;
    if (!canvas) return;
    const point = toSurfacePoint(canvas, request.client);
    const world = request.atPoint
      ? {
          x: (point.x - transform.x) / transform.scale,
          y: (point.y - transform.y) / transform.scale,
        }
      : undefined;
    setMenu({ ...request, world });
  }
  function choose(kind: CanvasItemKind): void {
    if (!menu) return;
    const visual = cardVisualBounds({
      id: "pending",
      kind,
      title: "",
      description: "",
    });
    const position = menu.world
      ? {
          x: menu.world.x - visual.x,
          y: menu.world.y - visual.y - visual.height / 2,
        }
      : undefined;
    const id = add(kind, { parentId: menu.parentId, position });
    if (menu.parentId) connect(menu.parentId, id);
    setMenu(null);
  }
  function openAtPoint(
    event: MouseEvent<HTMLDivElement>,
    enabled: boolean,
  ): void {
    if (!enabled || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        "[data-canvas-node],button,input,textarea,.canvas-hud,.canvas-toolbar,.connection",
      )
    )
      return;
    open({
      client: { x: event.clientX, y: event.clientY },
      trigger: event.currentTarget,
      atPoint: true,
    });
  }
  return { menu, open, dismiss, choose, openAtPoint };
}
