import type { SettingsSection } from "./SettingsSectionData";
import ModelAccessSettings from "./ModelAccessSettings";
import MemorySettingsSection from "./MemorySettingsSection";
import CompanionSettings from "./CompanionSettings";
import SecuritySettings from "./SecuritySettings";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";

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
  if (section === "account")
    return (
      <div className="settings-detail-stack">
        <div className="settings-info-row">
          <span>账号</span>
          <strong>未登录 · 本地使用</strong>
        </div>
        <p className="settings-section-intro">
          无需登录即可使用本地项目和素材。统一账号登录服务尚未接入。
        </p>
        <div className="settings-info-row">
          <span>云端个人资料</span>
          <strong>未连接</strong>
        </div>
        <p className="settings-section-intro">
          登录不代表自动上传；项目、素材与同步需要分别授权。
        </p>
      </div>
    );
  if (section === "network")
    return (
      <div className="settings-detail-stack">
        <div className="settings-info-row">
          <span>全局代理</span>
          <strong>尚未接入</strong>
        </div>
        <p className="settings-section-intro">
          当前没有可保存的全局代理配置；模型连接与本地推理服务在「模型接入」中管理。
        </p>
        <details className="settings-disclosure">
          <summary>独立转发代理</summary>
          <p className="settings-section-intro">
            仅支持配置了 localProxyUrl 的调用，不会自动影响所有模型请求。
          </p>
          <p className="settings-network-code">
            npm run proxy → http://127.0.0.1:23210
          </p>
        </details>
        <div className="settings-info-row">
          <span>加密云同步与备份</span>
          <strong>尚未接入</strong>
        </div>
        <p className="settings-section-intro">
          当前不会自动上传项目与素材。Cloudinary、WebDAV、S3
          的完整加密备份与恢复尚未开放。
        </p>
        <h3 className="settings-detail-label">网页本机仓库连接</h3>
        <CompanionSettings onFeedback={onFeedback} />
      </div>
    );
  return null;
}
