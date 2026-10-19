import { useEffect, useState } from "react";
import type { SaveState } from "../features/creation/useCreationStorage";
import UiIcon from "./UiIcon";

type Props = {
  state: SaveState;
  message: string;
  hasRecoveryDraft: boolean;
  onRead: () => void;
  onSave: () => void;
  onDownload: () => void;
};

export default function CreationStorageNotice(props: Props) {
  const { state, message, hasRecoveryDraft } = props;
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(false), [state, message, hasRecoveryDraft]);
  const blocked =
    state === "read_error" || state === "conflict" || state === "read_only";
  const failed = blocked || state === "write_error";
  if (!failed && !message && !hasRecoveryDraft && state !== "loading")
    return null;
  return (
    <div
      className={`start-status creation-storage-notice${collapsed ? " is-collapsed" : ""}`}
      role={failed && !collapsed ? "alert" : "status"}
    >
      {state !== "loading" && (
        <button
          className="creation-storage-toggle"
          type="button"
          aria-label={collapsed ? "展开存储提示" : "关闭存储提示"}
          aria-expanded={!collapsed}
          title={collapsed ? "查看存储详情" : "收起提示"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            `${blocked ? "读取保护" : state === "write_error" ? "保存失败" : "存储提示"} · 查看详情`
          ) : (
            <UiIcon name="close" size={16} />
          )}
        </button>
      )}
      {!collapsed && (
        <StorageNoticeDetails {...props} blocked={blocked} failed={failed} />
      )}
    </div>
  );
}

function StorageNoticeDetails({
  state,
  message,
  hasRecoveryDraft,
  onRead,
  onSave,
  onDownload,
  blocked,
  failed,
}: Props & { blocked: boolean; failed: boolean }) {
  return (
    <>
      <span className="creation-storage-message">
        {state === "loading"
          ? "正在读取本地项目…"
          : state === "read_only"
            ? `读取保护：${message} 已暂停编辑和执行，原始数据仍保留。`
            : blocked
              ? `读取保护：${message} 本次修改仅在内存中。`
              : state === "write_error"
                ? `保存失败：${message}`
                : message || "未保存草稿仍可单独下载。"}
      </span>
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
    </>
  );
}
