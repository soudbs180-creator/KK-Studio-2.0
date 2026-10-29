import {
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { newCanvasNodeId } from "../../domain/projectCanvas";
import {
  CANVAS_KIND_LABELS,
  type CanvasCollectionItem,
  type CanvasItemKind,
  type DemoResult,
} from "../../domain/canvasItems";
import { cardLayout, cardSelectionLayout } from "../../domain/canvasGraph";
import { MIN_SCALE, type Point, type ViewTransform } from "./canvasModel";
import { fitRects } from "../../domain/canvasViewport";
import { visibleComposerExtraHeight } from "./composerLayout";
import { shadowEventBus } from "../../features/sync/index.ts";

export interface AddNodeOptions {
  id?: string;
  comfyWorkflow?: CanvasCollectionItem["comfyWorkflow"];
  parentId?: string;
  result?: DemoResult;
  title?: string;
  description?: string;
  preview?: string;
  position?: Point;
  prompt?: string;
  model?: string;
  referenceMode?: boolean;
  referenceOnly?: boolean;
  referenceSlot?: CanvasCollectionItem["referenceSlot"];
  referenceFrame?: CanvasCollectionItem["referenceFrame"];
  assetId?: string;
  generationStatus?: CanvasCollectionItem["generationStatus"];
  generationIndex?: number;
  select?: boolean;
  /** 插件节点负载：提供后以 kind=text 承载插件节点。 */
  plugin?: CanvasCollectionItem["plugin"];
}
interface Options {
  items: CanvasCollectionItem[];
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  nodes: Record<string, Point>;
  setNodes: Dispatch<SetStateAction<Record<string, Point>>>;
  transform: ViewTransform;
  selectedNode: string | null;
  setTransform: Dispatch<SetStateAction<ViewTransform>>;
  setSelectedNode: Dispatch<SetStateAction<string | null>>;
  usableViewport: () => { width: number; height: number };
  composerExtraHeight: number;
}
export function useCanvasNodeActions({
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
}: Options) {
  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const node = document.querySelector<HTMLElement>(
      `[data-testid="canvas-node-${pendingFocus.current}"]`,
    );
    if (!node) return;
    pendingFocus.current = null;
    node.focus({ preventScroll: true });
  });

  function addNode(kind: CanvasItemKind, options: AddNodeOptions = {}): string {
    const id = options.id ?? newCanvasNodeId(kind);
    const item: CanvasCollectionItem = {
      id,
      node_rev: 1,
      comfyWorkflow: options.comfyWorkflow,
      kind,
      plugin: options.plugin,
      title:
        options.title ??
        (options.plugin
          ? (options.plugin.type.split(":")[1] ?? options.plugin.type)
          : `新${CANVAS_KIND_LABELS[kind]}卡片`),
      description:
        options.description ??
        options.result?.description ??
        (options.plugin ? "插件节点" : `${CANVAS_KIND_LABELS[kind]} · 待编辑`),
      result: options.result,
      preview:
        options.preview ??
        options.result?.poster ??
        (kind === "image" ? options.result?.src : undefined),
      prompt: options.prompt ?? options.result?.text,
      model: options.model,
      referenceMode: options.referenceMode,
      referenceOnly: options.referenceOnly,
      referenceSlot: options.referenceSlot,
      referenceFrame: options.referenceFrame,
      assetId: options.assetId,
      generationStatus: options.generationStatus,
      generationIndex: options.generationIndex,
      updatedAt: Date.now(),
    };
    const layout = cardLayout(item);
    const viewport = usableViewport();
    const worldCenter = {
      x: (viewport.width / 2 - transform.x) / transform.scale,
      y: ((viewport.height - 30) / 2 - transform.y) / transform.scale,
    };
    const parent = options.parentId ? nodes[options.parentId] : undefined;
    const source = items.find((current) => current.id === options.parentId);
    const position =
      options.position ??
      (parent && source
        ? {
            x: parent.x + cardLayout(source).anchor.x + 160 - layout.left,
            y: parent.y,
          }
        : {
            x: worldCenter.x - layout.width / 2 - layout.left,
            y: worldCenter.y - layout.height / 2,
          });
    setNodes((current) => ({ ...current, [id]: position }));
    onItemsChange((current) => [...current, item]);
    shadowEventBus.setNodeRevision(id, 1);
    shadowEventBus.emit({
      eventType: "canvas.node.created",
      targetNodeId: id,
      actor: "designer",
      baseRev: 0,
      newRev: 1,
      payload: { item, position },
    });
    if (options.select !== false) {
      pendingFocus.current = id;
      setSelectedNode(id);
    }
    return id;
  }
  function removeNode(id: string): void {
    const currentItem = items.find((item) => item.id === id);
    const baseRev = currentItem?.node_rev ?? shadowEventBus.getNodeRevision(id);
    const newRev = baseRev + 1;
    shadowEventBus.setNodeRevision(id, newRev);
    shadowEventBus.emit({
      eventType: "canvas.node.deleted",
      targetNodeId: id,
      actor: "designer",
      baseRev,
      newRev,
      payload: { id },
    });
    onItemsChange((current) => {
      const removed = current.find((item) => item.id === id);
      return current
        .filter((item) => item.id !== id)
        .map((item) =>
          /^comfy-output-[a-f0-9]{24}$/.test(id) &&
          item.comfyWorkflow &&
          removed?.description === `ComfyUI · ${item.id}`
            ? {
                ...item,
                comfyWorkflow: {
                  ...item.comfyWorkflow,
                  dismissedOutputIds: [
                    ...new Set([
                      ...(item.comfyWorkflow.dismissedOutputIds ?? []),
                      id,
                    ]),
                  ],
                },
              }
            : item,
        );
    });
    setNodes((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)),
    );
    setSelectedNode((current) => (current === id ? null : current));
  }
  function locateNode(id: string): void {
    const item = items.find((item) => item.id === id);
    if (!item || !nodes[id]) return;
    const layout = cardSelectionLayout(item);
    const height =
      layout.height +
      (selectedNode === id
        ? visibleComposerExtraHeight(composerExtraHeight)
        : 0);
    const viewport = usableViewport();
    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        1,
        (viewport.width - 40) / layout.width,
        (viewport.height - 180) / height,
      ),
    );
    setTransform({
      scale,
      x:
        viewport.width / 2 -
        (nodes[id].x + layout.left + layout.width / 2) * scale,
      y: (viewport.height - 30) / 2 - (nodes[id].y + height / 2) * scale,
    });
    pendingFocus.current = id;
    setSelectedNode(id);
  }
  function arrangeNodes(): void {
    const viewport = usableViewport();
    const columns = viewport.width < 700 ? 1 : 2;
    setNodes(
      Object.fromEntries(
        items.map((item, index) => [
          item.id,
          {
            x: 30 + (index % columns) * 650 - cardLayout(item).left,
            y: 90 + Math.floor(index / columns) * 780,
          },
        ]),
      ),
    );
    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        1,
        (viewport.width - 40) / (columns * 650),
        (viewport.height - 140) /
          Math.max(1, Math.ceil(items.length / columns) * 780),
      ),
    );
    setTransform({ scale, x: 10, y: 50 });
    setSelectedNode(null);
  }
  function focusNodes(ids: string[]): void {
    const viewport = usableViewport();
    const rects = items
      .filter((item) => ids.includes(item.id) && nodes[item.id])
      .map((item) => {
        const layout = cardLayout(item);
        return {
          x: nodes[item.id].x + layout.left,
          y: nodes[item.id].y,
          width: layout.width,
          height:
            layout.height +
            (item.id === selectedNode
              ? visibleComposerExtraHeight(composerExtraHeight)
              : 0),
        };
      });
    setTransform(
      fitRects(rects, {
        x: 16,
        y: 70,
        // Reserve the screen-space 8px gap and the largest 44px follow control.
        width: viewport.width - 32 - 52,
        height: viewport.height - 170,
      }),
    );
    setSelectedNode(null);
  }
  return { addNode, removeNode, locateNode, arrangeNodes, focusNodes };
}
