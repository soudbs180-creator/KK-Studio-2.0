import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useComfyEditorBridge,
  nativeComfyRuntime,
  type WorkflowRecord,
  type ComfyRuntimePort,
} from "../../features/comfyui/index.ts";

export default function ComfyWorkflowEditor({
  clientId,
  open,
  workflowRecord,
  onBack,
  onSave,
  runtime = nativeComfyRuntime,
  savedRoot,
}: {
  clientId: string;
  open: boolean;
  workflowRecord?: WorkflowRecord;
  onBack: () => void;
  onSave: (record: WorkflowRecord) => Promise<void>;
  runtime?: ComfyRuntimePort;
  savedRoot?: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const bridge = useComfyEditorBridge({
    frame,
    record: workflowRecord,
    open,
    clientId,
    runtime,
    savedRoot,
    onSave,
    onBack,
  });
  const [frameEndpoint, setFrameEndpoint] = useState(bridge.endpoint);
  useEffect(() => {
    if (open) setFrameEndpoint(bridge.endpoint);
  }, [open, bridge.endpoint]);
  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement)
        previous.focus({ preventScroll: true });
    };
  }, [open]);
  return createPortal(
    <dialog
      ref={dialog}
      className="comfy-workflow-editor"
      aria-label="ComfyUI 原生工作流"
      onCancel={(e) => {
        e.preventDefault();
        void bridge.back();
      }}
    >
      <header className="comfy-workflow-editor-header">
        <button
          autoFocus
          className="kk-button kk-button--secondary"
          disabled={bridge.busy}
          onClick={() => void bridge.back()}
        >
          ← 返回画布
        </button>
        {workflowRecord && (
          <span className="comfy-workflow-editor-title">
            当前卡片工作流：{workflowRecord.name}
          </span>
        )}
        <span role="status">{bridge.message}</span>
        {!bridge.ready && runtime.installEditorBridge && (
          <button
            className="kk-button kk-button--secondary"
            disabled={bridge.busy}
            onClick={() => void bridge.install()}
          >
            启用编辑同步
          </button>
        )}
      </header>
      <iframe
        ref={frame}
        name={clientId}
        src={frameEndpoint}
        onLoad={bridge.onLoad}
        title="ComfyUI 原生编辑器"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </dialog>,
    document.body,
  );
}
