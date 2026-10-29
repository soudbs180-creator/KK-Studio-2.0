import {
  reconcileProjectCanvas,
  type ProjectCanvas,
} from "../../domain/projectCanvas.ts";
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  createWorkflowDelivery,
  nativeComfyRuntime,
  type ComfyRuntimePort,
  type WorkflowDelivery,
} from "../../features/comfyui/index.ts";
import {
  CanvasImageCommandContext,
  storeGeneratedAsset,
} from "../../features/creation/index.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { useCanvasControls } from "./useCanvasControls.ts";
import type { CanvasConnection } from "../../domain/canvasGraph.ts";

export interface ComfyCanvasHost {
  projectId: string;
  runtime: ComfyRuntimePort;
  isCurrent: (sourceId: string) => boolean;
  flush: () => Promise<void>;
  delivery(sourceId: string): ReturnType<typeof createWorkflowDelivery>;
}
const Context = createContext<ComfyCanvasHost | null>(null);
export const useComfyCanvasHost = () => useContext(Context);
export default function ComfyWorkflowCanvasHost({
  children,
  projectId,
  items,
  controls,
  connect,
  flush,
  runtime = nativeComfyRuntime,
  canvas,
  onCanvasChange,
}: {
  children: ReactNode;
  projectId?: string;
  items: CanvasCollectionItem[];
  controls: ReturnType<typeof useCanvasControls>;
  connect: (
    source: string,
    target: string,
    kind?: CanvasConnection["kind"],
  ) => void;
  flush?: () => Promise<void>;
  runtime?: ComfyRuntimePort;
  canvas: ProjectCanvas;
  onCanvasChange?: (canvas: ProjectCanvas) => void;
}) {
  const commands = useContext(CanvasImageCommandContext);
  const persist = flush ?? commands?.flush ?? missingWorkflowPersistence;
  const latest = useRef({
    projectId,
    items,
    controls,
    connect,
    flush: persist,
    canvas,
    onCanvasChange,
  });
  latest.current = {
    projectId,
    items,
    controls,
    connect,
    flush: persist,
    canvas,
    onCanvasChange,
  };
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const host = useMemo<ComfyCanvasHost>(
    () => ({
      projectId: projectId ?? "",
      runtime,
      flush: () => latest.current.flush(),
      isCurrent: (sourceId) =>
        alive.current &&
        latest.current.projectId === projectId &&
        latest.current.items.some((i) => i.id === sourceId),
      delivery(sourceId) {
        const boundProject = projectId;
        const current = () =>
          alive.current &&
          latest.current.projectId === boundProject &&
          latest.current.items.some((i) => i.id === sourceId);
        async function applyOps({ id, asset, output }: WorkflowDelivery) {
          if (!current() || latest.current.items.some((i) => i.id === id))
            return;
          const state = latest.current;
          const position = state.controls.nodes[sourceId] ?? { x: 82, y: 107 };
          const index = state.items.filter(
            (i) => i.description === `ComfyUI · ${sourceId}`,
          ).length;
          flushSync(() => {
            state.controls.addNode("image", {
              id,
              assetId: asset.assetId,
              title: output.filename,
              description: `ComfyUI · ${sourceId}`,
              preview: asset.preview,
              referenceOnly: true,
              generationStatus: "ready",
              select: false,
              position: { x: position.x + 444, y: position.y + index * 424 },
              result: {
                id,
                kind: "image",
                title: output.filename,
                src: asset.preview,
                description: "ComfyUI 工作流产物",
                source: "provider",
              },
            });
            state.connect(sourceId, id, "result");
          });
          const updated = latest.current;
          if (!updated.onCanvasChange)
            throw new Error("画布保存入口未就绪，原图已归档");
          flushSync(() =>
            updated.onCanvasChange!(
              reconcileProjectCanvas(updated.canvas, updated.items),
            ),
          );
          await latest.current.flush();
        }
        return createWorkflowDelivery({
          clientId: `kk-comfy-${projectId}-${sourceId}`,
          isCurrent: current,
          hasOutput: (id) => latest.current.items.some((i) => i.id === id),
          readOutput: runtime.readOutput,
          assets: { write: storeGeneratedAsset },
          applyOps,
        });
      },
    }),
    [projectId, runtime],
  );
  return <Context.Provider value={host}>{children}</Context.Provider>;
}

async function missingWorkflowPersistence(): Promise<void> {
  throw new Error("当前画布保存入口未就绪，未提交工作流");
}
