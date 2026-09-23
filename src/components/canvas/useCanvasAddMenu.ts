import { useState, type RefObject, type MouseEvent } from "react";
import type { CanvasItemKind } from "../../domain/canvasItems";
import { cardVisualBounds } from "../../domain/canvasGraph";
import type { Point, ViewTransform } from "../../domain/canvasViewport";
import type { AddNodeOptions } from "./useCanvasNodeActions";
import { toSurfacePoint } from "./canvasSurface";
import { getPluginNodeDefinition } from "../../features/plugins/nodeRegistry";

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
    if (
      menu &&
      menu.trigger === request.trigger &&
      !request.atPoint &&
      !menu.atPoint
    ) {
      dismiss();
      return;
    }
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
  /** 从已激活插件中选择一个节点类型创建。 */
  function choosePlugin(type: string): void {
    if (!menu) return;
    const definition = getPluginNodeDefinition(type);
    const size = definition?.defaultSize ?? { width: 380, height: 300 };
    const position = menu.world
      ? { x: menu.world.x - size.width / 2, y: menu.world.y - size.height / 2 }
      : undefined;
    const id = add("text", {
      parentId: menu.parentId,
      position,
      plugin: {
        type,
        width: size.width,
        height: size.height,
        metadata: definition?.defaultMetadata,
      },
      title: definition?.title,
      description: definition?.description,
    });
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
  return { menu, open, dismiss, choose, choosePlugin, openAtPoint };
}
