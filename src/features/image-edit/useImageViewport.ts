import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Point } from "./mask.ts";
export type ImageTool = "browse" | "rectangle" | "brush" | "color";
export function useImageViewport(options: {
  width: number;
  height: number;
  tool: ImageTool;
  start: (point: Point) => void;
  move: (point: Point) => void;
  end: () => void;
  cancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    callbacks = useRef(options);
  callbacks.current = options;
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 }),
    state = useRef(view),
    fit = useRef(1);
  const pointers = useRef(new Map<number, Point>()),
    mode = useRef<"draw" | "pan">("pan"),
    blocked = useRef(false),
    space = useRef(false),
    multiTouch = useRef(false);
  const update = (next: typeof view) => {
    state.current = next;
    setView(next);
  };
  function reset() {
    const element = ref.current;
    if (!element) return;
    const scale = Math.min(
      (element.clientWidth - 32) / Math.max(1, options.width),
      (element.clientHeight - 32) / Math.max(1, options.height),
    );
    fit.current = Math.max(0.001, scale);
    update({
      scale: fit.current,
      x: (element.clientWidth - options.width * fit.current) / 2,
      y: (element.clientHeight - options.height * fit.current) / 2,
    });
  }
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(reset);
    observer.observe(element);
    reset();
    return () => observer.disconnect();
  }, [options.width, options.height]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    function wheel(event: WheelEvent) {
      if ((event.target as Element).closest("[data-ui-overlay]")) return;
      event.preventDefault();
      callbacks.current.cancel();
      const rect = element!.getBoundingClientRect(),
        x = event.clientX - rect.x,
        y = event.clientY - rect.y,
        old = state.current;
      const scale = Math.max(
        fit.current * 0.2,
        Math.min(fit.current * 16, old.scale * Math.exp(-event.deltaY * 0.002)),
      );
      update({
        scale,
        x: x - ((x - old.x) * scale) / old.scale,
        y: y - ((y - old.y) * scale) / old.scale,
      });
    }
    const blur = () => {
      space.current = false;
      pointers.current.clear();
      callbacks.current.cancel();
    };
    element.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", blur);
    return () => {
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const local = (event: ReactPointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.x, y: event.clientY - rect.y };
  };
  const imagePoint = (point: Point) => ({
    x: Math.max(
      0,
      Math.min(
        options.width,
        (point.x - state.current.x) / state.current.scale,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        options.height,
        (point.y - state.current.y) / state.current.scale,
      ),
    ),
  });
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target as Element).closest("[data-ui-overlay]")
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Synthetic tests have no active OS pointer. */
    }
    const point = local(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size > 1) {
      multiTouch.current = true;
      blocked.current = true;
      callbacks.current.cancel();
      return;
    }
    multiTouch.current = false;
    blocked.current = false;
    mode.current = options.tool === "browse" || space.current ? "pan" : "draw";
    if (mode.current === "draw") {
      const raw = {
        x: (point.x - state.current.x) / state.current.scale,
        y: (point.y - state.current.y) / state.current.scale,
      };
      if (
        raw.x < 0 ||
        raw.x >= options.width ||
        raw.y < 0 ||
        raw.y >= options.height
      ) {
        blocked.current = true;
        return;
      }
      options.start(imagePoint(point));
    }
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    const previous = [...pointers.current.values()];
    const oldPoint = pointers.current.get(event.pointerId)!;
    const point = local(event);
    pointers.current.set(event.pointerId, point);
    const current = [...pointers.current.values()];
    if (current.length >= 2) {
      const center = (p: Point[]) => ({
          x: (p[0].x + p[1].x) / 2,
          y: (p[0].y + p[1].y) / 2,
        }),
        distance = (p: Point[]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        before = center(previous),
        after = center(current),
        old = state.current,
        scale = Math.max(
          fit.current * 0.2,
          Math.min(
            fit.current * 16,
            (old.scale * distance(current)) / Math.max(1, distance(previous)),
          ),
        );
      update({
        scale,
        x: after.x - ((before.x - old.x) * scale) / old.scale,
        y: after.y - ((before.y - old.y) * scale) / old.scale,
      });
      return;
    }
    if (blocked.current) return;
    if (mode.current === "pan")
      update({
        ...state.current,
        x: state.current.x + point.x - oldPoint.x,
        y: state.current.y + point.y - oldPoint.y,
      });
    else options.move(imagePoint(point));
  }
  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    event.stopPropagation();
    if (
      pointers.current.size === 1 &&
      !blocked.current &&
      mode.current === "draw"
    ) {
      options.move(imagePoint(local(event)));
      options.end();
    }
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) blocked.current = false;
  }
  function onPointerCancel() {
    pointers.current.clear();
    blocked.current = false;
    options.cancel();
  }
  function centerOn(point: Point) {
    const element = ref.current;
    if (element)
      update({
        ...state.current,
        x: element.clientWidth / 2 - point.x * state.current.scale,
        y: element.clientHeight / 2 - point.y * state.current.scale,
      });
  }
  return {
    ref,
    view,
    reset,
    centerOn,
    fit: fit.current,
    multiTouch,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: (event: ReactPointerEvent) => {
        if (pointers.current.has(event.pointerId)) onPointerCancel();
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.code === "Space" && event.target === event.currentTarget) {
          space.current = true;
          event.preventDefault();
        }
      },
      onKeyUp: (event: React.KeyboardEvent) => {
        if (event.code === "Space") space.current = false;
      },
    },
  };
}
