import CanvasGroupHud from "./CanvasGroupHud";
import CanvasNavigation from "./CanvasNavigation";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasGroups } from "./useCanvasGroups";

export default function CanvasWorkbenchNavigation({
  controls,
  groups,
  items,
  minimapVisible,
  setMinimapVisible,
}: {
  controls: ReturnType<typeof useCanvasControls>;
  groups: ReturnType<typeof useCanvasGroups>;
  items: CanvasCollectionItem[];
  minimapVisible: boolean;
  setMinimapVisible: (visible: boolean) => void;
}) {
  return (
    <>
      <CanvasGroupHud controls={controls} groups={groups} items={items} />
      <CanvasNavigation
        minimapVisible={minimapVisible}
        onMinimapVisible={setMinimapVisible}
        transform={controls.transform}
        nodes={controls.nodes}
        items={items}
        onZoom={controls.setZoom}
        onChangeZoom={controls.changeZoom}
        onFit={controls.fitView}
        showConnections={controls.preferences.showConnections}
        snapEnabled={controls.preferences.snapEnabled}
        onToggleSnap={() =>
          controls.setSnapEnabled(!controls.preferences.snapEnabled)
        }
        onToggleConnections={() =>
          controls.setShowConnections(!controls.preferences.showConnections)
        }
        backgroundColor={controls.preferences.backgroundColor}
        onBackgroundColor={controls.setBackgroundColor}
        backgroundPattern={controls.preferences.backgroundPattern}
        onToggleBackgroundPattern={() =>
          controls.setBackgroundPattern(
            controls.preferences.backgroundPattern === "dots" ? "grid" : "dots",
          )
        }
        onArrange={controls.arrangeNodes}
        onLocate={controls.locateNode}
      />
    </>
  );
}
