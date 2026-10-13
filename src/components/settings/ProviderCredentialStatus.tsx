import { isTauri } from "@tauri-apps/api/core";
import type { CredentialReadState } from "./useProviderCredentialState";

export default function ProviderCredentialStatus({
  status,
  onRetry,
}: {
  status: CredentialReadState;
  onRetry: () => void;
}) {
  const desktop = isTauri();
  const message =
    status === "saved"
      ? desktop
        ? "当前连接的密钥已在系统凭据库安全保存。"
        : "密钥在本次会话内可用；刷新或关闭后不会保留。"
      : status === "missing"
        ? desktop
          ? "当前连接未读取到已保存的系统密钥；若接口无需密钥，可留空。"
          : "当前连接在本次会话中尚无已保存密钥；若接口无需密钥，可留空。"
        : "正在读取已保存的密钥…";
  return (
    <div
      className="settings-field-help"
      role={status === "error" ? "alert" : "status"}
    >
      {status !== "error" ? (
        message
      ) : (
        <>
          <p>
            无法读取系统凭据，尚不能确认密钥状态；原密钥未被清除，无需重新填写。请重试读取。
          </p>
          <button
            type="button"
            className="settings-action secondary"
            onClick={onRetry}
          >
            重试读取密钥
          </button>
        </>
      )}
    </div>
  );
}
