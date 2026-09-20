import { useRef } from "react";
import {
  createImportedWorkflow,
  parseComfyWorkflow,
  type WorkflowRecord,
} from "../features/comfyui/workflowRegistry";

export function downloadWorkflow(workflow: WorkflowRecord): void {
  const blob = new Blob([JSON.stringify(workflow.workflow, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${workflow.name || "comfy-workflow"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function WorkflowImportButton({
  onImported,
  onError,
}: {
  onImported: (workflow: WorkflowRecord, nodeCount: number) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className="ui-button"
        onClick={() => input.current?.click()}
        title="从本地 JSON 导入 ComfyUI 工作流"
      >
        导入工作流
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            const parsed = parseComfyWorkflow(JSON.parse(await file.text()));
            onImported(
              createImportedWorkflow(file.name.replace(/\.json$/i, ""), parsed),
              parsed.nodeCount,
            );
          } catch (error) {
            onError(
              error instanceof Error
                ? error.message
                : "工作流导入失败，请检查 JSON 格式。",
            );
          }
        }}
      />
    </>
  );
}
