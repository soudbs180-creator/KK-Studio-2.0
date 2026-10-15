import { useState, type MouseEvent } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export default function GoogleConnectionActions({
  cli,
  disabled,
  canSave,
  busy,
  hasRequest,
  onSaveCli,
  onSaveKey,
  onCheck,
  onCancel,
}: {
  cli: boolean;
  disabled: boolean;
  canSave: boolean;
  busy: boolean;
  hasRequest: boolean;
  onSaveCli: () => void;
  onSaveKey: () => void;
  onCheck: () => void;
  onCancel: () => void;
}) {
  const [linkError, setLinkError] = useState("");
  async function openKeyLink(event: MouseEvent<HTMLAnchorElement>) {
    if (!isTauri()) return;
    event.preventDefault();
    setLinkError("");
    try {
      await invoke("plugin:shell|open", { path: event.currentTarget.href });
    } catch {
      setLinkError("外部浏览器未能打开，请重试或复制链接到浏览器。");
    }
  }
  return (
    <div className="settings-network-actions">
      {cli ? (
        <button
          type="button"
          className="settings-action secondary"
          disabled={disabled}
          onClick={onSaveCli}
        >
          保存登录方式
        </button>
      ) : (
        <button
          type="button"
          className="settings-action secondary"
          disabled={disabled || !canSave}
          onClick={onSaveKey}
        >
          保存 Google
        </button>
      )}
      <button
        type="button"
        className="settings-action secondary"
        disabled={disabled || (!cli && !canSave)}
        onClick={onCheck}
      >
        {cli ? "检测 Gemini CLI" : "测试 Google 连接"}
      </button>
      {busy && hasRequest && (
        <button
          type="button"
          className="settings-action secondary"
          onClick={onCancel}
        >
          取消检测
        </button>
      )}
      {!cli && (
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          onClick={openKeyLink}
        >
          获取 API Key
        </a>
      )}
      {linkError && <p role="alert">{linkError}</p>}
    </div>
  );
}
