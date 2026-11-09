import type { CreationProject } from "../../features/creation/index.ts";
import type { SettingsSection } from "./SettingsSectionData";
import ModelAccessSettings from "./ModelAccessSettings";
import MemorySettingsSection from "./MemorySettingsSection";
import CompanionSettings from "./CompanionSettings";
import SecuritySettings from "./SecuritySettings";
import ProfileUsagePage from "./ProfileUsagePage";
import AppUpdatePage from "./AppUpdatePage";
import ShortcutsManagementPage from "./ShortcutsManagementPage";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";
import SettingsInfoHint from "./SettingsInfoHint";

export default function ConnectionSettings({
  section,
  active = true,
  onFeedback,
  initialModelMethod,
  workflows,
  activeProject,
}: {
  section: SettingsSection;
  active?: boolean;
  onFeedback: (message: string) => void;
  initialModelMethod?: "local";
  workflows: LocalWorkflowAccess;
  activeProject?: CreationProject;
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
    return (
      <MemorySettingsSection
        onFeedback={onFeedback}
        activeProject={activeProject}
      />
    );
  if (section === "security") return <SecuritySettings />;
  if (section === "account") return <ProfileUsagePage />;
  if (section === "updates") return <AppUpdatePage />;
  if (section === "shortcuts") return <ShortcutsManagementPage />;

  if (section === "network")
    return (
      <div className="settings-detail-stack settings-network">
        <section
          className="settings-network-section"
          data-figma-node="655:143029"
        >
          <div className="settings-network-heading">
            <div className="settings-title-row">
              <h3>全局网络连接</h3>
              <SettingsInfoHint
                id="network-global"
                label="查看全局网络连接说明"
              >
                模型请求与外部通信直接通过本地物理网络发出；如果需配置中转加速或内网路由，可在「核心功能
                - 模型接入」中为各服务商配置专用 Base URL。
              </SettingsInfoHint>
            </div>
            <span className="settings-network-status">
              互联网直连模式 (Direct)
            </span>
          </div>
        </section>
        <section
          className="settings-network-section"
          data-figma-node="655:143036"
        >
          <div className="settings-network-heading">
            <h3>独立转发代理 (Local Proxy)</h3>
            <span className="settings-network-status">本地伴随代理就绪</span>
          </div>
          <p>支持通过本地 Proxy 服务中转特定调用，不会影响全局普通网络请求。</p>
          <div
            className="settings-network-command"
            data-figma-node="655:143044"
          >
            npm run proxy → http://127.0.0.1:23210
          </div>
        </section>
        <section
          className="settings-network-section"
          data-figma-node="655:143046"
        >
          <div className="settings-network-heading">
            <div className="settings-title-row">
              <h3>云端快照与多端同步</h3>
              <SettingsInfoHint
                id="network-sync"
                label="查看云端快照与多端同步说明"
              >
                当前所有项目和媒体素材均保存在本地存储中，不自动上传云端。支持在「数据管理」中一键导出工程离线备份包。
              </SettingsInfoHint>
            </div>
            <span className="settings-network-status">本地优先保护</span>
          </div>
        </section>
        <h3 className="settings-detail-label">网页本机仓库连接</h3>
        <CompanionSettings onFeedback={onFeedback} />
      </div>
    );

  return null;
}
