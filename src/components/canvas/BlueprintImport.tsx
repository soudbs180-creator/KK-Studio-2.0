import { Button } from "../ui/Button.tsx";
import { useRef, useState } from "react";
import { useCanvasOperations } from "../../runtime/canvasCommandRuntime.tsx";

export default function BlueprintImport() {
  const input = useRef<HTMLInputElement>(null);
  const operations = useCanvasOperations();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        type="button"
        disabled={busy || !operations}
        onClick={() => input.current?.click()}
      >
        导入架构蓝图
      </Button>
      <Button
        disabled={busy || !operations}
        onClick={async () => {
          if (!operations || busy) return;
          setBusy(true);
          try {
            await operations.flush();
            const { FloorplanCanvasAdapter, serializeFloorplanFile } =
              await import("../../features/canvas/index.ts");
            const state = operations.getState();
            const document = new FloorplanCanvasAdapter().fromCanvas(
              state.items,
              state.canvas.positions,
              state.canvas.edges,
              state.canvas.groups,
            );
            const url = URL.createObjectURL(
              new Blob([serializeFloorplanFile(document)], {
                type: "application/json",
              }),
            );
            try {
              const link = window.document.createElement("a");
              link.href = url;
              link.download = "architecture.json";
              link.click();
            } finally {
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            setMessage(`已导出 ${state.items.length} 个节点及分组、连线和位置`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "蓝图导出失败");
          } finally {
            setBusy(false);
          }
        }}
      >
        导出架构蓝图
      </Button>
      <input
        hidden
        ref={input}
        type="file"
        accept=".json,application/json"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !operations || busy) return;
          setBusy(true);
          setMessage("");
          try {
            const { FloorplanCanvasAdapter, MAX_FLOORPLAN_BYTES } =
              await import("../../features/canvas/index.ts");
            if (!file.size || file.size > MAX_FLOORPLAN_BYTES)
              throw new Error("请选择64MB以内的JSON蓝图");
            const operation = new FloorplanCanvasAdapter().toCanvas(
              JSON.parse(await file.text()),
            );
            const receipt = await operations.executeOperation(operation);
            if (!receipt.success) throw new Error(receipt.error);
            setMessage(
              `已添加 ${operation.payload.document.cards.length} 个蓝图节点`,
            );
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "蓝图导入失败");
          } finally {
            setBusy(false);
          }
        }}
      />
      {message && (
        <span role="status" className="canvas-import-status">
          {message}
        </span>
      )}
    </>
  );
}
