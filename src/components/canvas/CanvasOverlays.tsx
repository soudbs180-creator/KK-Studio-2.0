import CanvasMarquee from "./CanvasMarquee";
import AddNodeMenu from "./AddNodeMenu";
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
}: CanvasOverlaysProps) {
  return (
    <>
      <CanvasMarquee rect={marquee} />
      {addMenu.menu && (
        <AddNodeMenu
          menu={addMenu.menu}
          onChoose={addMenu.choose}
          onChoosePlugin={addMenu.choosePlugin}
          onDismiss={addMenu.dismiss}
        />
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
