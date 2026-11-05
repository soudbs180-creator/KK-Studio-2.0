import { useState } from "react";
import { ModalDialog } from "./ui/ModalDialog.tsx";

export default function RewindMessageAction({
  messageId,
  onRewind,
  disabled,
}: {
  messageId: string;
  onRewind: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        aria-label="回滚到此轮"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        回滚到此轮
      </button>
      {open && (
        <ModalDialog
          isOpen
          title="回滚到此轮"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
          closeOnBackdropClick={!busy}
          footer={
            <>
              <button
                type="button"
                className="primary-button"
                disabled={busy || disabled}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await onRewind(messageId);
                    setOpen(false);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "回滚失败，历史备份已保留",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "回滚中…" : "确认回滚"}
              </button>
              <button
                type="button"
                className="ui-button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                取消回滚
              </button>
            </>
          }
        >
          <p>
            将备份当前消息，再撤回此轮及后续历史。Agent
            工具改动需要补偿核验通过后才会截断历史。已有生成资产保留，用量回滚只影响本地投影，不改变供应商账单。
          </p>
          {error && <p role="alert">{error}</p>}
        </ModalDialog>
      )}
    </>
  );
}
