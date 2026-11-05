import { useRef, useState } from "react";
import { useCanvasOperations } from "../../runtime/canvasCommandRuntime.tsx";

export default function BlueprintImport() {
  const input = useRef<HTMLInputElement>(null);
  const operations = useCanvasOperations();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ui-button"
        disabled={busy || !operations}
        onClick={() => input.current?.click()}
      >
        导入架构蓝图
      </button>
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
            if (!file.size || file.size > 2 * 1024 * 1024)
              throw new Error("请选择2MB以内的JSON蓝图");
            const { FloorplanCanvasAdapter } =
              await import("../../features/canvas/index.ts");
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
