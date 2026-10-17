import { useCallback } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react";

interface GestureState {
  x: number;
  y: number;
  moved: boolean;
}

interface UseCanvasGesturesProps {
  rightGesture: MutableRefObject<GestureState | null>;
  controls: {
    tool: string;
    spaceHeld: boolean;
    startCanvasPan: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  addMenu: {
    openAtPoint: (
      event: ReactMouseEvent<HTMLDivElement>,
      condition: boolean,
    ) => void;
  };
  movePointer: (event: ReactPointerEvent<HTMLDivElement>) => void;
  finishPointer: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function useCanvasGestures({
  rightGesture,
  controls,
  addMenu,
  movePointer,
  finishPointer,
}: UseCanvasGesturesProps) {
  const handlePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button === 2) {
        rightGesture.current = {
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
      } else if (rightGesture.current) {
        rightGesture.current = null;
      }
    },
    [rightGesture],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const right = rightGesture.current;
      if (
        right &&
        (event.buttons & 2) !== 0 &&
        Math.hypot(event.clientX - right.x, event.clientY - right.y) > 4
      ) {
        right.moved = true;
      }
      movePointer(event);
    },
    [rightGesture, movePointer],
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      addMenu.openAtPoint(
        event,
        controls.tool === "select" && !controls.spaceHeld,
      );
    },
    [addMenu, controls.tool, controls.spaceHeld],
  );

  return {
    onPointerDownCapture: handlePointerDownCapture,
    onPointerDown: controls.startCanvasPan,
    onDoubleClick: handleDoubleClick,
    onPointerMove: handlePointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onLostPointerCapture: finishPointer,
  };
}
