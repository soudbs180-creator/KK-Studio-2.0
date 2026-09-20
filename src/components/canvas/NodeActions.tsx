import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { cardLayout } from "../../domain/canvasGraph";
import type { Point } from "../../domain/canvasViewport";
import type { AddMenuRequest } from "./useCanvasAddMenu";

type Drag = {
  pointerId: number;
  origin: Point;
  from: Point;
  to: Point;
  moved: boolean;
};
export default function NodeActions({
  item,
  onOpenMenu,
  menuOpen,
  onConnect,
  onConnectionTargetChange,
}: {
  item: CanvasCollectionItem;
  onOpenMenu: (request: AddMenuRequest) => void;
  menuOpen: boolean;
  onConnect?: (sourceId: string, targetId: string) => void;
  onConnectionTargetChange?: (
    sourceId: string,
    targetId: string | null,
  ) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<Drag | null>(null);
  const [active, setActive] = useState(false);
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });
  function cancel(): void {
    const current = drag.current;
    drag.current = null;
    if (current) suppressClick.current = true;
    setPreview(null);
    setActive(false);
    setMagnet({ x: 0, y: 0 });
    onConnectionTargetChange?.(item.id, null);
    if (current && trigger.current?.hasPointerCapture(current.pointerId))
      trigger.current.releasePointerCapture(current.pointerId);
  }
  useEffect(() => {
    if (!active) return;
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && drag.current && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        cancel();
        trigger.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    return () => {
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
    };
  }, [active]);
  function move(event: PointerEvent<HTMLButtonElement>): void {
    const current = drag.current;
    if (current && current.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const to = { x: event.clientX, y: event.clientY };
      const moved =
        current.moved ||
        Math.hypot(to.x - current.origin.x, to.y - current.origin.y) > 4;
      drag.current = { ...current, to, moved };
      setPreview(moved ? drag.current : null);
      const target = nodeAtPoint(to.x, to.y);
      const targetId = target?.dataset.nodeId;
      onConnectionTargetChange?.(
        item.id,
        moved && targetId && targetId !== item.id ? targetId : null,
      );
    } else if (!event.buttons && event.pointerType !== "touch") {
      const box = trigger.current!.getBoundingClientRect();
      setMagnet({
        x: Math.max(
          -10,
          Math.min(10, (event.clientX - box.x - box.width / 2) * 0.45),
        ),
        y: Math.max(
          -16,
          Math.min(16, (event.clientY - box.y - box.height / 2) * 0.45),
        ),
      });
    }
  }
  function release(event: PointerEvent<HTMLButtonElement>): void {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setPreview(null);
    setActive(false);
    setMagnet({ x: 0, y: 0 });
    onConnectionTargetChange?.(item.id, null);
    event.stopPropagation();
    if (trigger.current?.hasPointerCapture(event.pointerId))
      trigger.current.releasePointerCapture(event.pointerId);
    if (!current.moved) return;
    suppressClick.current = true;
    const releaseTarget = document.elementFromPoint(
      event.clientX,
      event.clientY,
    );
    const targetNode = nodeAtPoint(event.clientX, event.clientY);
    const targetId = targetNode?.dataset.nodeId;
    if (targetId === item.id) return;
    if (targetId && targetId !== item.id) {
      onConnect?.(item.id, targetId);
      return;
    }
    if (
      !releaseTarget?.closest(".canvas") ||
      releaseTarget.closest(".canvas-hud,.canvas-toolbar,.conversation-panel")
    )
      return;
    onOpenMenu({
      client: { x: event.clientX, y: event.clientY },
      trigger: event.currentTarget,
      parentId: item.id,
      atPoint: true,
    });
  }
  function nodeAtPoint(x: number, y: number): HTMLElement | null {
    const hit = document.elementFromPoint(x, y);
    if (hit?.closest(".canvas-hud,.canvas-toolbar,.conversation-panel"))
      return null;
    const direct = hit?.closest<HTMLElement>(
      ".image-preview,.video-placeholder,.demo-result-node,.creation-composer",
    );
    if (direct) return direct.closest<HTMLElement>("[data-canvas-node]");
    /* Image cards keep their outer shell transparent to pointer events. Check
       the visible body rectangles as a fallback, while leaving the label,
       composer and empty world space available for the add menu. */
    const candidates = [
      ...document.querySelectorAll<HTMLElement>("[data-canvas-node]"),
    ];
    return (
      candidates.reverse().find((node) => {
        const body = node.querySelector<HTMLElement>(
          ".image-preview,.video-placeholder,.demo-result-node,.creation-composer",
        );
        if (!body) return false;
        const box = body.getBoundingClientRect();
        return (
          x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
        );
      }) ?? null
    );
  }
  const anchor = cardLayout(item).anchor;
  const bend = preview
    ? Math.max(48, Math.abs(preview.to.x - preview.from.x) * 0.45)
    : 0;
  return (
    <>
      <div
        className="node-actions"
        style={{ left: anchor.x, top: anchor.y }}
        onWheel={(event) => event.stopPropagation()}
      >
        <button
          ref={trigger}
          className="node-add-follow"
          aria-label={`从${item.title}添加下游`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="拖出并释放以添加节点；也可点击或按回车"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            suppressClick.current = false;
            setActive(true);
            const box = event.currentTarget.getBoundingClientRect();
            const point = { x: event.clientX, y: event.clientY };
            drag.current = {
              pointerId: event.pointerId,
              origin: point,
              to: point,
              from: { x: box.x - 8, y: box.y + box.height / 2 },
              moved: false,
            };
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={cancel}
          onLostPointerCapture={() => {
            if (drag.current) cancel();
          }}
          onPointerLeave={() => {
            if (!drag.current) setMagnet({ x: 0, y: 0 });
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (suppressClick.current) {
              suppressClick.current = false;
              if (event.detail > 0) return;
            }
            const box = event.currentTarget.getBoundingClientRect();
            onOpenMenu({
              client: { x: box.right + 6, y: box.top },
              trigger: event.currentTarget,
              parentId: item.id,
            });
          }}
        >
          <span
            className="node-add-visual"
            style={{ translate: `${magnet.x}px ${magnet.y}px` }}
          >
            <span className="node-port-plus" aria-hidden="true" />
          </span>
        </button>
      </div>
      {preview &&
        createPortal(
          <svg
            className="connection-drag-preview"
            aria-hidden="true"
            data-testid="connection-drag-preview"
          >
            <path
              d={`M ${preview.from.x} ${preview.from.y} C ${preview.from.x + bend} ${preview.from.y}, ${preview.to.x - bend} ${preview.to.y}, ${preview.to.x} ${preview.to.y}`}
            />
          </svg>,
          document.body,
        )}
    </>
  );
}
