import { useState } from "react";
import { useComfyCanvasHost } from "./ComfyWorkflowCanvasHost.tsx";
import CanvasMarquee from "./CanvasMarquee";
import AddNodeMenu from "./AddNodeMenu";
import BlueprintWorkbench from "./BlueprintWorkbench";
import DirectorConsole from "../nodes/DirectorConsole";
import { Button } from "../ui/Button.tsx";
import { formatOpticsBadge } from "../../domain/cameraOptics.ts";
import { useCanvasOperations } from "../../runtime/canvasCommandRuntime.tsx";
import CanvasContextMenu, {
  type CanvasContextMenuState,
} from "./CanvasContextMenu";
import ConnectionFeedback from "./ConnectionFeedback";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { useCanvasAddMenu } from "./useCanvasAddMenu";
import type { useCanvasControls } from "./useCanvasControls";

interface CanvasOverlaysProps {
  marquee: ReturnType<typeof useCanvasControls>["marquee"];
  addMenu: ReturnType<typeof useCanvasAddMenu>;
  contextMenu: CanvasContextMenuState | null;
  onDismissContextMenu: (restoreFocus?: boolean) => void;
  onAddContextNode: (
    point: { x: number; y: number },
    trigger: HTMLElement,
  ) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLayers: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  removedEdge: CanvasConnection | null;
  onUndoConnection: () => void;
  onDismissConnection: () => void;
  connectionNotice: string;
  onDismissConnectionNotice: () => void;
  selectedNode?: string | null;
  onOpenStoryboard?: () => void;
}

export default function CanvasOverlays({
  marquee,
  addMenu,
  contextMenu,
  onDismissContextMenu,
  onAddContextNode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleLayers,
  snapEnabled,
  onToggleSnap,
  removedEdge,
  onUndoConnection,
  onDismissConnection,
  connectionNotice,
  onDismissConnectionNotice,
  selectedNode,
  onOpenStoryboard,
}: CanvasOverlaysProps) {
  const comfy = useComfyCanvasHost();
  const operations = useCanvasOperations();
  const [studio, setStudio] = useState<"" | "director" | "blueprint">("");
  return (
    <>
      <CanvasMarquee rect={marquee} />
      {addMenu.menu && (
        <AddNodeMenu
          menu={addMenu.menu}
          onChoose={addMenu.choose}
          onChooseWorkflow={
            comfy?.runtime.desktop ? addMenu.chooseWorkflow : undefined
          }
          onChoosePlugin={addMenu.choosePlugin}
          onOpenStoryboard={onOpenStoryboard}
          onOpenDirector={() => {
            addMenu.dismiss();
            setStudio("director");
          }}
          onOpenBlueprint={() => {
            addMenu.dismiss();
            setStudio("blueprint");
          }}
          onDismiss={addMenu.dismiss}
        />
      )}
      {studio === "blueprint" && (
        <BlueprintWorkbench onClose={() => setStudio("")} />
      )}
      {studio === "director" && (
        <div className="director-stage">
          <DirectorConsole
            onChange={(optics) => {
              if (!selectedNode || !optics) return;
              window.postMessage(
                {
                  type: "storyai:director-apply",
                  nodeId: selectedNode,
                  optics,
                },
                window.location.origin,
              );
            }}
            onCapture={(optics) => {
              const id = `director-ref-${crypto.randomUUID()}`;
              void operations?.executeOperation({
                op: "add_card",
                payload: {
                  card: {
                    id,
                    kind: "image",
                    title: "导演参考图",
                    description: formatOpticsBadge(optics).slice(0, 500),
                    prompt: `参考构图 ${formatOpticsBadge(optics)}`.slice(
                      0,
                      4000,
                    ),
                    referenceOnly: true,
                  },
                  position: { x: 120, y: 120 },
                },
              });
              if (selectedNode)
                window.postMessage(
                  {
                    type: "storyai:director-apply",
                    nodeId: selectedNode,
                    optics,
                  },
                  window.location.origin,
                );
              window.dispatchEvent(
                new CustomEvent("kk:focus-node", {
                  detail: selectedNode ?? id,
                }),
              );
            }}
          />
          <Button isPill onClick={() => setStudio("")}>
            关闭导演台
          </Button>
        </div>
      )}
      {contextMenu && (
        <CanvasContextMenu
          menu={contextMenu}
          onDismiss={onDismissContextMenu}
          onAddNode={onAddContextNode}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onToggleLayers={onToggleLayers}
          snapEnabled={snapEnabled}
          onToggleSnap={onToggleSnap}
        />
      )}
      {removedEdge && (
        <ConnectionFeedback
          onUndo={onUndoConnection}
          onDismiss={onDismissConnection}
        />
      )}
      {connectionNotice && (
        <div
          className="canvas-feedback connection-limit-feedback"
          role="status"
        >
          {connectionNotice}
          <button aria-label="关闭连接提示" onClick={onDismissConnectionNotice}>
            关闭
          </button>
        </div>
      )}
    </>
  );
}
