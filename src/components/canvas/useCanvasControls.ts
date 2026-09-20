import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useCanvasPointer, isInteractiveTarget } from "./useCanvasPointer";
import { zoomAtPoint } from "../../domain/canvasViewport";
import { cardLayout } from "../../domain/canvasGraph";
import { useCanvasNodeActions } from "./useCanvasNodeActions";
import { useCanvasView } from "./useCanvasView";
import { useCanvasViewport } from "./useCanvasViewport";
import { toSurfacePoint } from "./canvasSurface";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  WheelEvent as ReactWheelEvent,
  Dispatch,
  SetStateAction,
} from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  createProjectCanvas,
  type ProjectCanvas,
} from "../../domain/projectCanvas";
import {
  copyInitialNodes,
  INITIAL_TRANSFORM,
  MIN_SCALE,
  type CanvasNodeId,
  type Point,
  type ViewTransform,
} from "./canvasModel";

interface CanvasControlsOptions {
  initialCanvas?: ProjectCanvas;
  items: CanvasCollectionItem[];
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
}

export function useCanvasControls({
  items,
  onItemsChange,
  favoriteIds,
  onToggleFavorite,
  initialCanvas,
}: CanvasControlsOptions) {
  const [transform, setTransform] = useState<ViewTransform>(
    () => initialCanvas?.viewport ?? INITIAL_TRANSFORM,
  );
  const [nodes, setNodes] = useState(
    () => initialCanvas?.positions ?? createProjectCanvas(items).positions,
  );
  const [selectedNode, setSelectedNode] = useState<CanvasNodeId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, measure: usableViewport } = useCanvasViewport(containerRef);
  const [composerExtraHeight, setComposerExtraHeight] = useState(0);
  const revealSelection = useRef<CanvasNodeId | null>(null);
  const revealBaselineHeight = useRef(0);
  const revealViewport = useRef({ width: 0, height: 0 });

  // A project can add a result while the canvas remains mounted. Keep a
  // deterministic world position for new persisted nodes instead of letting
  // them render at (0, 0) or disappear behind the shell.
  useEffect(() => {
    setNodes((current) => {
      const next = { ...current };
      items.forEach((item, index) => {
        if (next[item.id]) return;
        const layout = cardLayout(item);
        next[item.id] = {
          x: 82 + (index % 2) * 650 - layout.left,
          y: 107 + Math.floor(index / 2) * 520,
        };
      });
      const entries = Object.entries(next).filter(([id]) =>
        items.some((item) => item.id === id),
      );
      return entries.length === Object.keys(current).length &&
        entries.every(([id, point]) => point === current[id])
        ? current
        : Object.fromEntries(entries);
    });
  }, [items]);

  const actions = useCanvasNodeActions({
    items,
    onItemsChange,
    nodes,
    setNodes,
    transform,
    setTransform,
    setSelectedNode,
    usableViewport,
  });
  useLayoutEffect(() => {
    if (!selectedNode) return;
    const node = nodes[selectedNode];
    const item = items.find((item) => item.id === selectedNode);
    if (!node || !item) return;
    const viewport = usableViewport();
    const isNewSelection = revealSelection.current !== selectedNode;
    if (isNewSelection) {
      revealSelection.current = selectedNode;
      revealBaselineHeight.current = 0;
    }
    const hasComposer =
      !item.result && !item.referenceOnly && !item.generationStatus;
    // 选中后等待编辑器基准高度（composer 挂载后一次报告），避免 0→基线 的双重位移
    if (isNewSelection && hasComposer && composerExtraHeight === 0) return;
    const viewportChanged =
      revealViewport.current.width !== viewport.width ||
      revealViewport.current.height !== viewport.height;
    revealViewport.current = { width: viewport.width, height: viewport.height };
    if (
      !isNewSelection &&
      !viewportChanged &&
      composerExtraHeight === revealBaselineHeight.current
    )
      return;
    revealBaselineHeight.current = composerExtraHeight;
    const layout = cardLayout(item);
    const compact = item.result || ["audio", "text"].includes(item.kind);
    const viewWidth = layout.width;
    const actionSpace = compact ? 52 : 0;
    const height =
      layout.height +
      (item.result
        ? Math.max(0, composerExtraHeight - 60)
        : composerExtraHeight);
    const left = node.x + layout.left;
    setTransform((current) => {
      const scale = Math.max(
        MIN_SCALE,
        Math.min(
          current.scale,
          (viewport.width - 32 - actionSpace) / viewWidth,
          (viewport.height - 170) / height,
        ),
      );
      let x = current.x;
      let y = current.y;
      if (left * scale + x < 16) x = 16 - left * scale;
      if ((left + viewWidth) * scale + x > viewport.width - 16 - actionSpace)
        x = viewport.width - 16 - actionSpace - (left + viewWidth) * scale;
      if (node.y * scale + y < 70) y = 70 - node.y * scale;
      if ((node.y + height) * scale + y > viewport.height - 100)
        y = viewport.height - 100 - (node.y + height) * scale;
      return x === current.x && y === current.y && scale === current.scale
        ? current
        : { x, y, scale };
    });
    // Reveal once on selection; dragging a selected node must remain pointer-driven.
  }, [
    items,
    selectedNode,
    composerExtraHeight,
    viewport.width,
    viewport.height,
  ]);
  // 用 useLayoutEffect 让"选中→高度报告→reveal"链路在首帧绘制前完成，
  // 避免编辑器挂载后（0→60 基准高度）的二次位移被用户/测试观察到。

  const pointer = useCanvasPointer({
    containerRef,
    nodes,
    setNodes,
    transform,
    setTransform,
    selectedNode,
    setSelectedNode,
  });

  const zoomCanvas = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>): void => {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const point = toSurfacePoint(containerRef.current!, {
        x: event.clientX,
        y: event.clientY,
      });
      const pointerX = point.x;
      const pointerY = point.y;
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      setTransform((current) =>
        zoomAtPoint(
          current,
          { x: pointerX, y: pointerY },
          current.scale * zoomFactor,
        ),
      );
    },
    [],
  );

  const moveNodeWithKeyboard = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, nodeId: CanvasNodeId): void => {
      if (event.key === "Escape" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        setSelectedNode(null);
        event.currentTarget.focus({ preventScroll: true });
        return;
      }
      if (event.currentTarget !== event.target) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelectedNode(nodeId);
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        nodeId.startsWith("added-")
      ) {
        event.preventDefault();
        actions.removeNode(nodeId);
        if (favoriteIds.has(nodeId)) onToggleFavorite(nodeId);
        setSelectedNode(null);
        return;
      }
      const step = event.shiftKey ? 24 : 8;
      const deltaByKey: Partial<Record<string, Point>> = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      };
      const delta = deltaByKey[event.key];
      if (!delta) return;
      event.preventDefault();
      setNodes((current) => ({
        ...current,
        [nodeId]: {
          x: current[nodeId].x + delta.x,
          y: current[nodeId].y + delta.y,
        },
      }));
    },
    [favoriteIds, items, onItemsChange, onToggleFavorite],
  );

  const resetCanvas = useCallback((): void => {
    pointer.cancelGesture();
    setTransform(INITIAL_TRANSFORM);
    setNodes((current) => ({ ...current, ...copyInitialNodes() }));
    setSelectedNode(null);
  }, []);

  const view = useCanvasView({
    nodes,
    items,
    selectedNode,
    composerExtraHeight,
    getViewport: usableViewport,
    setTransform,
  });

  return {
    ...view,
    setComposerExtraHeight,
    ...actions,
    containerRef,
    ...pointer,
    moveNodeWithKeyboard,
    nodes,
    resetCanvas,
    selectedNode,
    setSelectedNode,
    transform,
    zoomCanvas,
    viewport,
  };
}
