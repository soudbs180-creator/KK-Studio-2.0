import type { CSSProperties } from "react";
import type { SettingsSection } from "./SettingsSectionData";
import ModelAccessSettings from "./ModelAccessSettings";
import MemorySettingsSection from "./MemorySettingsSection";
import CompanionSettings from "./CompanionSettings";
import SecuritySettings from "./SecuritySettings";
import ProfileUsagePage from "./ProfileUsagePage";
import AppUpdatePage from "./AppUpdatePage";
import ShortcutsManagementPage from "./ShortcutsManagementPage";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--kk-bg-card)",
  border: "1px solid var(--kk-border-subtle)",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

export default function ConnectionSettings({
  section,
  active = true,
  onFeedback,
  initialModelMethod,
  workflows,
}: {
  section: SettingsSection;
  active?: boolean;
  onFeedback: (message: string) => void;
  initialModelMethod?: "local";
  workflows: LocalWorkflowAccess;
}) {
  if (section === "providers")
    return (
      <ModelAccessSettings
        active={active}
        onFeedback={onFeedback}
        initialMethod={initialModelMethod}
        workflows={workflows}
      />
    );
  if (section === "memory")
    return <MemorySettingsSection onFeedback={onFeedback} />;
  if (section === "security") return <SecuritySettings />;
  if (section === "account") return <ProfileUsagePage />;
  if (section === "updates") return <AppUpdatePage />;
  if (section === "shortcuts") return <ShortcutsManagementPage />;

  if (section === "network")
    return (
      <div className="settings-detail-stack" style={{ gap: "16px" }}>
        {/* Network Direct Connection Card */}
        <div className="kk-card-box" style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--kk-text-primary)",
              }}
            >
              全局网络连接
            </span>
            <span
              className="kk-pill-box"
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                backgroundColor: "var(--kk-bg-soft)",
                color: "var(--kk-success)",
                border: "1px solid var(--kk-border-subtle)",
              }}
            >
              互联网直连模式 (Direct)
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--kk-text-secondary)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            模型请求与外部通信直接通过本地物理网络发出；如果需配置中转加速或内网路由，可在「核心功能
            - 模型接入」中为各服务商配置专用 Base URL。
          </p>
        </div>

        {/* Local Proxy Forwarding Card (No <details> arrow) */}
        <div className="kk-card-box" style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--kk-text-primary)",
              }}
            >
              独立转发代理 (Local Proxy)
            </span>
            <span
              className="kk-pill-box"
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                backgroundColor: "var(--kk-bg-soft)",
                color: "var(--kk-text-accent)",
                border: "1px solid var(--kk-border-subtle)",
              }}
            >
              本地伴随代理就绪
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--kk-text-secondary)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            支持通过本地 Proxy 服务中转特定调用，不会影响全局普通网络请求。
          </p>
          <div
            className="kk-control-box"
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--kk-bg-input)",
              fontFamily: "var(--kk-font-mono)",
              fontSize: "12px",
              color: "var(--kk-text-accent)",
              border: "1px solid var(--kk-border-subtle)",
            }}
          >
            npm run proxy → http://127.0.0.1:23210
          </div>
        </div>

        {/* Encrypted Sync & Cloud Storage */}
        <div className="kk-card-box" style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--kk-text-primary)",
              }}
            >
              云端快照与多端同步
            </span>
            <span
              className="kk-pill-box"
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                backgroundColor: "var(--kk-bg-soft)",
                color: "var(--kk-text-secondary)",
                border: "1px solid var(--kk-border-subtle)",
              }}
            >
              本地优先保护
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--kk-text-secondary)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            当前所有项目和媒体素材均保存在本地存储中，不自动上传云端。支持在「数据管理」中一键导出工程离线备份包。
          </p>
        </div>

        <h3 className="settings-detail-label" style={{ margin: "8px 0 0" }}>
          网页本机仓库连接
        </h3>
        <CompanionSettings onFeedback={onFeedback} />
      </div>
    );

  return null;
}
