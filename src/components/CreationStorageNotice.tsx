import type { SaveState } from "../features/creation/index.ts";

export default function CreationStorageNotice({
  state,
  message,
  hasRecoveryDraft,
  onRead,
  onSave,
  onDownload,
}: {
  state: SaveState;
  message: string;
  hasRecoveryDraft: boolean;
  onRead: () => void;
  onSave: () => void;
  onDownload: () => void;
}) {
  const blocked =
    state === "read_error" || state === "conflict" || state === "read_only";
  const failed = blocked || state === "write_error";
  if (!failed && !message && !hasRecoveryDraft && state !== "loading")
    return null;
  return (
    <div
      className="start-status creation-storage-notice"
      role={failed ? "alert" : "status"}
    >
      {state === "loading"
        ? "正在读取本地项目…"
        : state === "read_only"
          ? `读取保护：${message} 已暂停编辑和执行，原始数据仍保留。`
          : blocked
            ? `读取保护：${message} 本次修改仅在内存中。`
            : state === "write_error"
              ? `保存失败：${message}`
              : message || "未保存草稿仍可单独下载。"}
      {blocked && (
        <button className="ui-button" type="button" onClick={onRead}>
          重新读取
        </button>
      )}
      {state === "write_error" && (
        <button className="ui-button" type="button" onClick={onSave}>
          重试保存
        </button>
      )}
      {(failed || hasRecoveryDraft) && (
        <button className="ui-button" type="button" onClick={onDownload}>
          {state === "read_only" ? "下载原始恢复副本" : "下载未保存草稿"}
        </button>
      )}
    </div>
  );
}
