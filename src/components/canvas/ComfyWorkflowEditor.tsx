import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
export default function ComfyWorkflowEditor({
  clientId,
  open,
  onBack,
}: {
  clientId: string;
  open: boolean;
  onBack: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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
        onBack();
      }}
    >
      <header>
        <button
          autoFocus
          className="kk-button kk-button--secondary"
          onClick={onBack}
        >
          ← 返回画布
        </button>
      </header>
      <iframe
        name={clientId}
        src="http://127.0.0.1:8188"
        title="ComfyUI 原生编辑器"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </dialog>,
    document.body,
  );
}
