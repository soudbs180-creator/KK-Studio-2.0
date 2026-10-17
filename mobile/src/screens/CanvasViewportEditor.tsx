import { useState } from "react";
import type {
  MobileProject,
  MobileCanvasOperation,
} from "../core/mobileModel.ts";
import { canvasInputNumber } from "../application/canvasInput.ts";
import { Action, Field, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
import { useApplication } from "../application/AppProvider.tsx";
export function CanvasViewportEditor({
  viewport,
  onApply,
  onClose,
}: {
  viewport: MobileProject["canvas"]["viewport"];
  onApply: (ops: MobileCanvasOperation[]) => void;
  onClose: () => void;
}) {
  const { state } = useApplication();
  const [x, setX] = useState(String(viewport.x)),
    [y, setY] = useState(String(viewport.y)),
    [zoom, setZoom] = useState(String(viewport.zoom)),
    { busy, run } = useAction();
  const exit = useUnsavedExit(
    x !== String(viewport.x) ||
      y !== String(viewport.y) ||
      zoom !== String(viewport.zoom),
    state.accountId!,
  );
  return (
    <>
      <Sheet
        title="设置保存的视口"
        open={!exit.confirming}
        onClose={() => exit.requestClose(onClose)}
      >
        <Field label="视口 X" value={x} onChangeText={setX} maxLength={32} />
        <Field label="视口 Y" value={y} onChangeText={setY} maxLength={32} />
        <Field
          label="缩放（大于 0，最多 100）"
          value={zoom}
          onChangeText={setZoom}
          maxLength={32}
        />
        <Label muted>
          节点概览仍自动缩放。这些值会随提案批准保存到项目视口。
        </Label>
        <Action
          primary
          label="加入本次视口编辑"
          busy={busy}
          onPress={() =>
            void run(async () => {
              onApply([
                {
                  type: "set_viewport",
                  viewport: {
                    x: canvasInputNumber(x),
                    y: canvasInputNumber(y),
                    zoom: canvasInputNumber(zoom, 100, true),
                  },
                },
              ]);
              exit.allow();
              onClose();
            })
          }
        />
      </Sheet>
      {exit.dialog}
    </>
  );
}
