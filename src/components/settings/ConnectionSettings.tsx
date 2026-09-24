import { appVersion } from "../../runtime/appInfo";
import type { SettingsSection } from "./SettingsSectionData";
import ModelProviderSettings from "./ModelProviderSettings";
import GoogleConnectionSettings from "./GoogleConnectionSettings";
import McpSettings from "./McpSettings";
import AgentConnectionSettings from "./AgentConnectionSettings";
import PluginManagerSettings from "./PluginManagerSettings";

const PENDING_SETTINGS: Partial<
  Record<SettingsSection, { title: string; description: string }>
> = {
  account: {
    title: "本地会话",
    description: "当前无需登录即可使用工作台。账号登录与云端同步尚未开放。",
  },
  network: {
    title: "本地服务",
    description:
      "本地 Agent 需要启动服务后连接；转发代理为独立服务，尚未接入全局网络配置。",
  },
  memory: {
    title: "暂无记忆",
    description: "对话记忆功能尚未开放，当前不会自动提取或保存对话记忆。",
  },
  skills: {
    title: "暂无已安装的 Skill",
    description: "Skill 导入和运行功能尚未开放。",
  },
  mcp: {
    title: "暂无 MCP 服务器",
    description: "MCP 连接功能尚未开放，当前不会连接或调用外部工具。",
  },
  comfy: {
    title: "未连接 ComfyUI",
    description: "工作流执行功能尚未开放，当前不会向本地实例提交任务。",
  },
};

export default function ConnectionSettings({
  section,
  onFeedback,
}: {
  section: SettingsSection;
  onFeedback: (message: string) => void;
}) {
  if (section === "providers")
    return (
      <>
        <ModelProviderSettings onFeedback={onFeedback} />
        <GoogleConnectionSettings onFeedback={onFeedback} />
      </>
    );
  if (section === "mcp") return <McpSettings onFeedback={onFeedback} />;
  if (section === "updates")
    return (
      <div className="settings-version">
        <div className="settings-version-card">
          <div className="settings-version-icon" aria-hidden="true">
            ↑
          </div>
          <div className="settings-version-copy">
            <strong>软件更新</strong>
            <span>更新检查尚未接入</span>
          </div>
          <span className="settings-version-tag">Prototype</span>
          <span className="settings-version-current">
            当前版本 {appVersion}
          </span>
          <button
            type="button"
            className="settings-action settings-restart-button"
            disabled
            title="更新服务尚未接入"
          >
            更新服务未接入
          </button>
        </div>
        <div className="settings-version-detail">
          <h3>更新提示</h3>
          <p>当前版本检查、下载和重启安装尚未接入，因此不会伪造更新状态。</p>
        </div>
        <div className="settings-update-row">
          <div>
            <h3>更新详情</h3>
            <p>服务接入后将在这里显示真实版本和变更说明。</p>
          </div>
        </div>
        <div className="settings-update-row settings-update-toggle-row">
          <div>
            <h3>自动安装更新</h3>
            <p>更新服务尚未接入，自动安装暂不可用。</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            aria-disabled="true"
            className="settings-toggle settings-toggle-disabled"
            aria-label="自动安装更新不可用"
            disabled
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  if (section === "account")
    return (
      <div className="settings-detail-stack">
        <h3 className="settings-detail-label">账号信息</h3>
        <div className="settings-detail-card">
          <div>
            <span>账号</span>
            <strong>未登录 · Prototype</strong>
          </div>
          <div>
            <span>UID</span>
            <strong>本地会话</strong>
          </div>
        </div>
        <h3 className="settings-detail-label">团队账号</h3>
        <div className="settings-detail-card">
          <span>暂无团队账号</span>
        </div>
        <div className="settings-danger-row">
          <div>
            <h3>永久删除账号</h3>
            <p>账号服务尚未接入，当前没有可删除的云端账号。</p>
          </div>
          <button
            type="button"
            className="settings-danger-button"
            disabled
            title="Prototype · 账号服务尚未接入"
          >
            删除账号
          </button>
        </div>
      </div>
    );
  if (section === "network")
    return (
      <div className="settings-detail-stack">
        <h3 className="settings-detail-label">本地服务</h3>
        <AgentConnectionSettings onFeedback={onFeedback} />
        <div className="settings-network-row">
          <div>
            <h3>本地转发代理</h3>
            <p>
              需独立启动 · 应用尚未提供全局代理配置。此服务当前供支持
              localProxyUrl 的接口调用，不会自动影响模型请求。
            </p>
            <p className="settings-network-code">
              npm run proxy → http://127.0.0.1:23210
            </p>
          </div>
        </div>
      </div>
    );
  if (section === "plugins")
    return (
      <div className="settings-detail-stack">
        <h3 className="settings-detail-label">画布插件</h3>
        <p className="settings-network-activity">
          在画布「添加节点 › 插件」中使用已启用插件。这里管理画布扩展；MCP
          工具请在 MCP 设置中管理。
        </p>
        <PluginManagerSettings onFeedback={onFeedback} />
      </div>
    );
  if (section === "memory")
    return (
      <div className="settings-detail-stack">
        <div className="settings-memory-tools">
          <input
            aria-label="搜索描述或正文"
            placeholder="搜索描述或正文..."
            disabled
            title="Prototype · 记忆服务尚未接入"
          />
          <select
            aria-label="作用域"
            defaultValue="all"
            disabled
            title="Prototype · 记忆服务尚未接入"
          >
            <option value="all">所有作用域</option>
          </select>
          <select
            aria-label="类型"
            defaultValue="all"
            disabled
            title="Prototype · 记忆服务尚未接入"
          >
            <option value="all">所有类型</option>
          </select>
        </div>
        <button
          type="button"
          className="settings-action"
          disabled
          title="Prototype · 记忆服务尚未接入"
        >
          ＋ 新建
        </button>
        <div className="settings-empty-state">
          <strong>暂无记忆</strong>
          <p>
            Prototype · 记忆服务尚未接入，当前不会创建、搜索或自动保存长期记忆。
          </p>
        </div>
      </div>
    );
  const pending = PENDING_SETTINGS[section];
  if (!pending) return null;
  return (
    <div className="settings-empty-state">
      <strong>{pending.title}</strong>
      <p>{pending.description}</p>
    </div>
  );
}
