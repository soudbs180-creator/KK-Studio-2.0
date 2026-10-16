import { isTauri } from "@tauri-apps/api/core";

export default function SecuritySettings() {
  return (
    <div className="settings-detail-stack">
      <div className="settings-info-row">
        <span>模型密钥</span>
        <strong>{isTauri() ? "系统凭据库" : "仅当前会话"}</strong>
      </div>
      <p className="settings-section-intro">
        模型连接与密钥在「模型接入」中管理。密钥不会包含在偏好备份或项目包中。
      </p>
      <div className="settings-info-row">
        <span>账号与同步</span>
        <strong>尚未接入</strong>
      </div>
      <p className="settings-section-intro">
        当前可免登录使用。统一登录、加密同步与设备授权管理尚未开放；本机服务配对在「网络」中管理。
      </p>
      <div className="settings-info-row">
        <span>项目与扩展权限</span>
        <strong>统一管理尚未接入</strong>
      </div>
      <p className="settings-section-intro">
        现有操作仍按各工具自己的权限提示确认；这里暂不能统一查看或撤销授权。
      </p>
    </div>
  );
}
