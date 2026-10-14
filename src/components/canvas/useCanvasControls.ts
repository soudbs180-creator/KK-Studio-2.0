import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useCanvasPointer, isInteractiveTarget } from "./useCanvasPointer";
import { zoomAtPoint } from "../../domain/canvasViewport";
import { cardLayout, cardSelectionLayout } from "../../domain/canvasGraph";
import { useCanvasNodeActions } from "./useCanvasNodeActions";
import { useCanvasView } from "./useCanvasView";
import { useCanvasViewport } from "./useCanvasViewport";
import { surfaceScale, toSurfacePoint } from "./canvasSurface";
import { getImageSelectionPosition } from "./imageSelectionPosition";
import { visibleComposerExtraHeight } from "./composerLayout";
import { useCanvasPreferences } from "./useCanvasPreferences";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  WheelEvent as ReactWheelEvent,
  Dispatch,
  SetStateAction,
} from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  createProjectCanvas,
  mergeCanvasPositions,
  projectCanvasFingerprint,
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
}

function hasDraftComposer(item: CanvasCollectionItem): boolean {
  return (
    !item.plugin &&
    !item.result &&
    !item.referenceOnly &&
    !item.generationStatus
  );
}

export function useCanvasControls({
  items,
  onItemsChange,
  initialCanvas,
}: CanvasControlsOptions) {
  const canvasPreferences = useCanvasPreferences();
  const [transform, setTransform] = useState<ViewTransform>(
    () => initialCanvas?.viewport ?? INITIAL_TRANSFORM,
  );
  const automaticViewport = useRef<ViewTransform | null>(null);
  const skipSelectionReveal = useRef(false);
  const [nodes, setNodes] = useState(
    () => initialCanvas?.positions ?? createProjectCanvas(items).positions,
  );
  const [observedCanvas, setObservedCanvas] = useState(initialCanvas);
  const publishedCanvas = useRef("");
  const isCanvasEcho =
    initialCanvas !== undefined &&
    projectCanvasFingerprint(initialCanvas) === publishedCanvas.current;
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
    selectedNode,
    setTransform,
    setSelectedNode,
    usableViewport,
    composerExtraHeight,
  });
  const pointer = useCanvasPointer({
    containerRef,
    nodes,
    setNodes,
    transform,
    setTransform,
    selectedNode,
    setSelectedNode,
    snapEnabled: canvasPreferences.preferences.snapEnabled,
  });
  // Re-render with external geometry before persistence can publish the old graph.
  if (observedCanvas !== initialCanvas) {
    setObservedCanvas(initialCanvas);
    if (initialCanvas && !isCanvasEcho) {
      const drag = pointer.dragRef.current;
      setNodes((current) => {
        const next = mergeCanvasPositions(
          current,
          observedCanvas?.positions ?? {},
          initialCanvas.positions,
        );
        if (drag?.kind === "node" && drag.nodeId) {
          const ids = drag.selection.has(drag.nodeId)
            ? drag.selection
            : new Set([drag.nodeId]);
          // A saved preview is still a local edit until the pointer is released.
          for (const id of ids)
            if (current[id] && next[id] && next[id] !== current[id])
              next[id] = current[id];
        }
        return next;
      });
    }
  }
  useLayoutEffect(() => {
    if (!selectedNode) {
      revealSelection.current = null;
      return;
    }
    if (pointer.dragging) return;
    if (skipSelectionReveal.current) {
      skipSelectionReveal.current = false;
      return;
    }
    const node = nodes[selectedNode];
    const item = items.find((item) => item.id === selectedNode);
    if (!node || !item) return;
    const viewport = usableViewport();
    const isNewSelection = revealSelection.current !== selectedNode;
    if (isNewSelection) {
      revealSelection.current = selectedNode;
      revealBaselineHeight.current = 0;
    }
    const hasComposer = hasDraftComposer(item);
    // 选中后等待编辑器基准高度（composer 挂载后一次报告），避免 0→基线 的双重位移
    if (isNewSelection && hasComposer && composerExtraHeight === 0) return;
    const viewportChanged =
      revealViewport.current.width !== viewport.width ||
      revealViewport.current.height !== viewport.height;
    revealViewport.current = { width: viewport.width, height: viewport.height };
    const canvas = containerRef.current;
    const frame = canvas?.querySelector<HTMLElement>(
      ".canvas-node.is-selected",
    );
    const image = frame?.querySelector<HTMLElement>(
      ".demo-result-node,.image-preview",
    );
    const toolbar = document.querySelector<HTMLElement>(
      ".image-selection-toolbar",
    );
    const actionAnchor = item.kind === "image" ? image : frame;
    const imageActions =
      canvas && actionAnchor && toolbar
        ? getImageSelectionPosition(actionAnchor, canvas, toolbar)
        : undefined;
    const needsImageActions = Boolean(imageActions?.revealDelta);
    const minimumTop = imageActions?.revealDelta
      ? Math.max(
          70,
          node.y * transform.scale +
            transform.y +
            imageActions.revealDelta / (canvas ? surfaceScale(canvas) : 1),
        )
      : 70;
    if (
      !needsImageActions &&
      !isNewSelection &&
      !viewportChanged &&
      composerExtraHeight === revealBaselineHeight.current
    )
      return;
    revealBaselineHeight.current = composerExtraHeight;
    const layout = cardSelectionLayout(item);
    const compact = item.result || ["audio", "text"].includes(item.kind);
    const viewWidth = layout.width;
    const actionSpace = compact ? 52 : 0;
    const height =
      layout.height + visibleComposerExtraHeight(composerExtraHeight);
    const left = node.x + layout.left;
    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        transform.scale,
        (viewport.width - 32 - actionSpace) / viewWidth,
        (viewport.height - 100 - minimumTop) / height,
      ),
    );
    let x = transform.x;
    let y = transform.y;
    if (left * scale + x < 16) x = 16 - left * scale;
    if ((left + viewWidth) * scale + x > viewport.width - 16 - actionSpace)
      x = viewport.width - 16 - actionSpace - (left + viewWidth) * scale;
    if (node.y * scale + y < minimumTop) y = minimumTop - node.y * scale;
    if ((node.y + height) * scale + y > viewport.height - 100)
      y = viewport.height - 100 - (node.y + height) * scale;
    if (x !== transform.x || y !== transform.y || scale !== transform.scale) {
      const next = { x, y, scale };
      automaticViewport.current = next;
      setTransform(next);
    }
    // Reveal once on selection; dragging a selected node must remain pointer-driven.
  }, [
    items,
    nodes,
    selectedNode,
    transform,
    composerExtraHeight,
    pointer.dragging,
    viewport.width,
    viewport.height,
  ]);
  // 用 useLayoutEffect 让"选中→高度报告→reveal"链路在首帧绘制前完成，
  // 避免编辑器挂载后（0→60 基准高度）的二次位移被用户/测试观察到。

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
      skipSelectionReveal.current = true;
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
        if (pointer.dragRef.current) pointer.cancelGesture();
        else setSelectedNode(null);
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
    [items, onItemsChange],
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
    setTransform: (next) => {
      skipSelectionReveal.current = true;
      setTransform(next);
    },
  });

  return {
    publishedCanvas,
    isCanvasEcho,
    ...view,
    setComposerExtraHeight,
    composerExtraHeight,
    ...actions,
    ...canvasPreferences,
    containerRef,
    ...pointer,
    moveNodeWithKeyboard,
    nodes,
    setNodes,
    resetCanvas,
    selectedNode,
    setSelectedNode,
    transform,
    zoomCanvas,
    automaticViewport,
    setTransform,
    viewport,
  };
}
