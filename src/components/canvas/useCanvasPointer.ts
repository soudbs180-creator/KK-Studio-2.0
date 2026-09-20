import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Point, ViewTransform } from "./canvasModel";
import { surfaceScale, toSurfacePoint } from "./canvasSurface";

export type CanvasTool = "select" | "hand";
type SelectionRect = { x: number; y: number; width: number; height: number };
type Gesture = {
  kind: "pan" | "node" | "marquee";
  pointerId: number;
  client: Point;
  transform: ViewTransform;
  nodes: Record<string, Point>;
  selection: Set<string>;
  nodeId?: string;
  additive: boolean;
};
export function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "button,input,textarea,select,a,video,audio,dialog,[contenteditable='true'],[data-no-node-drag]",
      ),
    )
  );
}

export function useCanvasPointer({
  containerRef,
  nodes,
  setNodes,
  transform,
  setTransform,
  selectedNode,
  setSelectedNode,
}: {
  containerRef: RefObject<HTMLDivElement>;
  nodes: Record<string, Point>;
  setNodes: Dispatch<SetStateAction<Record<string, Point>>>;
  transform: ViewTransform;
  setTransform: Dispatch<SetStateAction<ViewTransform>>;
  selectedNode: string | null;
  setSelectedNode: Dispatch<SetStateAction<string | null>>;
}) {
  const [tool, setTool] = useState<CanvasTool>("select");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<SelectionRect | null>(null);
  const [dragging, setDragging] = useState<Gesture["kind"] | null>(null);
  const dragRef = useRef<Gesture | null>(null);
  const selection = selectedNode ? new Set([selectedNode]) : selectedIds;
  function select(ids: Set<string>): void {
    setSelectedIds(ids.size === 1 ? new Set() : ids);
    setSelectedNode(ids.size === 1 ? [...ids][0] : null);
  }
  function cancelGesture(): void {
    const drag = dragRef.current;
    if (drag) {
      if (drag.kind === "pan") setTransform(drag.transform);
      if (drag.kind === "node") setNodes(drag.nodes);
      select(drag.selection);
    }
    dragRef.current = null;
    setDragging(null);
    setMarquee(null);
    if (drag && containerRef.current?.hasPointerCapture(drag.pointerId))
      containerRef.current.releasePointerCapture(drag.pointerId);
  }
  useEffect(() => {
    const down = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !containerRef.current?.getClientRects().length
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          "input,textarea,select,dialog,[contenteditable='true'],[role='menu']",
        )
      )
        return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (dragRef.current) cancelGesture();
        else select(new Set());
      }
      if (event.code === "Space" && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        setSpaceHeld(true);
      }
      if (!event.shiftKey && ["v", "h"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setTool(event.key.toLowerCase() === "h" ? "hand" : "select");
      }
    };
    const up = (event: KeyboardEvent): void => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    const blur = (): void => {
      setSpaceHeld(false);
      cancelGesture();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  function start(event: PointerEvent<HTMLDivElement>, nodeId?: string): void {
    if (
      isInteractiveTarget(event.target) ||
      ![0, 1, 2].includes(event.button) ||
      dragRef.current
    )
      return;
    event.preventDefault();
    const pan = event.button !== 0 || tool === "hand" || spaceHeld;
    const kind = pan ? "pan" : nodeId ? "node" : "marquee";
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      client: { x: event.clientX, y: event.clientY },
      transform,
      nodes,
      selection: new Set(selection),
      nodeId,
      additive: event.shiftKey,
    };
    setDragging(kind);
    (kind === "node" ? event.currentTarget : containerRef.current)?.focus({
      preventScroll: true,
    });
    containerRef.current?.setPointerCapture(event.pointerId);
  }
  function startCanvasPan(event: PointerEvent<HTMLDivElement>): void {
    start(event);
  }
  function startNodeDrag(
    event: PointerEvent<HTMLDivElement>,
    nodeId: string,
  ): void {
    event.stopPropagation();
    start(event, nodeId);
  }
  function movePointer(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    const canvas = containerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas) return;
    event.preventDefault();
    const dx = event.clientX - drag.client.x;
    const dy = event.clientY - drag.client.y;
    const displayScale = surfaceScale(canvas);
    const logicalDx = dx / displayScale;
    const logicalDy = dy / displayScale;
    if (Math.hypot(dx, dy) <= 4) return;
    if (drag.kind === "pan") {
      setTransform({
        ...drag.transform,
        x: drag.transform.x + logicalDx,
        y: drag.transform.y + logicalDy,
      });
      return;
    }
    if (drag.kind === "node" && drag.nodeId) {
      const ids = drag.selection.has(drag.nodeId)
        ? drag.selection
        : new Set([drag.nodeId]);
      setNodes((current) => ({
        ...current,
        ...Object.fromEntries(
          [...ids]
            .filter((id) => drag.nodes[id])
            .map((id) => [
              id,
              {
                x: drag.nodes[id].x + logicalDx / drag.transform.scale,
                y: drag.nodes[id].y + logicalDy / drag.transform.scale,
              },
            ]),
        ),
      }));
      return;
    }
    const left = Math.min(event.clientX, drag.client.x);
    const top = Math.min(event.clientY, drag.client.y);
    const right = Math.max(event.clientX, drag.client.x);
    const bottom = Math.max(event.clientY, drag.client.y);
    const point = toSurfacePoint(canvas, { x: left, y: top });
    setMarquee({
      x: point.x,
      y: point.y,
      width: (right - left) / displayScale,
      height: (bottom - top) / displayScale,
    });
    const ids = drag.additive ? new Set(drag.selection) : new Set<string>();
    canvas
      .querySelectorAll<HTMLElement>("[data-canvas-node]")
      .forEach((node) => {
        // Select visible card bodies; invisible composer shells must not capture the marquee.
        const card = node.querySelector(
          ".image-preview,.video-placeholder,.demo-result-node",
        );
        const rect = (card ?? node).getBoundingClientRect();
        if (
          rect.left < right &&
          rect.right > left &&
          rect.top < bottom &&
          rect.bottom > top &&
          node.dataset.nodeId
        )
          ids.add(node.dataset.nodeId);
      });
    // Keep composers closed during selection to avoid changing the geometry being measured.
    setSelectedNode(null);
    setSelectedIds(ids);
  }
  function finishPointer(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.type !== "pointerup") {
      cancelGesture();
      return;
    }
    const clicked =
      Math.hypot(
        event.clientX - drag.client.x,
        event.clientY - drag.client.y,
      ) <= 4;
    if (clicked && drag.kind !== "pan") {
      const ids = drag.additive ? new Set(drag.selection) : new Set<string>();
      if (drag.nodeId) {
        if (ids.has(drag.nodeId)) ids.delete(drag.nodeId);
        else ids.add(drag.nodeId);
      }
      select(ids);
    }
    dragRef.current = null;
    setDragging(null);
    setMarquee(null);
    if (containerRef.current?.hasPointerCapture(event.pointerId))
      containerRef.current.releasePointerCapture(event.pointerId);
  }
  return {
    tool,
    setTool,
    spaceHeld,
    selectedIds: selection,
    marquee,
    dragging,
    dragRef,
    startCanvasPan,
    startNodeDrag,
    movePointer,
    finishPointer,
    cancelGesture,
  };
}
