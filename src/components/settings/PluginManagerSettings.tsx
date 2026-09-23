import { useState, useSyncExternalStore } from "react";
import { pluginLoader } from "../../features/plugins/pluginLoader";
import { pluginStore } from "../../features/plugins/pluginStore";
import "./plugin-manager.css";

/** 设置中心 · 插件管理：安装（URL）、更新、卸载、启停。 */
export default function PluginManagerSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const state = useSyncExternalStore(
    pluginStore.subscribe,
    pluginStore.getState,
  );
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function install(): Promise<void> {
    const target = url.trim();
    if (!target) {
      onFeedback("请输入插件 bundle 地址（ESM .js）。");
      return;
    }
    if (!/^https:\/\//i.test(target)) {
      setError("仅支持 HTTPS 插件地址");
      return;
    }
    const id = target.split("/").pop()?.split("?")[0] || "plugin";
    pluginStore.setBusy(id, true);
    setError(null);
    try {
      const plugin = await pluginLoader.installFromUrl(target);
      pluginStore.setError(null);
      setUrl("");
      onFeedback(`已安装并启用插件：${plugin.name} ${plugin.version}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "安装失败";
      setError(message);
      pluginStore.setError(message);
    } finally {
      pluginStore.setBusy(id, false);
    }
  }

  async function toggle(pluginId: string, enabled: boolean): Promise<void> {
    const record = state.plugins.find((item) => item.id === pluginId);
    if (!record) return;
    try {
      await pluginLoader.setPluginEnabled(record, !enabled);
      onFeedback(enabled ? "插件已停用" : "插件已启用");
    } catch (cause) {
      pluginStore.setError(cause instanceof Error ? cause.message : "切换失败");
    }
  }

  async function update(pluginId: string): Promise<void> {
    const record = state.plugins.find((item) => item.id === pluginId);
    if (!record || record.local) return;
    pluginStore.setBusy(pluginId, true);
    try {
      const plugin = await pluginLoader.updatePlugin(record);
      onFeedback(`插件已更新：${plugin.name} ${plugin.version}`);
    } catch (cause) {
      pluginStore.setError(cause instanceof Error ? cause.message : "更新失败");
    } finally {
      pluginStore.setBusy(pluginId, false);
    }
  }

  async function uninstall(pluginId: string): Promise<void> {
    pluginLoader.uninstallPlugin(pluginId);
    onFeedback("插件已卸载");
  }

  return (
    <div className="plugin-manager">
      <h3 className="settings-detail-label">已安装插件</h3>
      {state.plugins.length === 0 && (
        <div className="settings-empty-state">
          <strong>暂无插件</strong>
          <p>
            本地插件随应用启动自动发现（public/plugins）；也可从下方粘贴 ESM
            插件地址安装。
          </p>
        </div>
      )}
      {state.plugins.map((record) => (
        <div key={record.id} className="plugin-manager-row">
          <div className="plugin-manager-info">
            <strong>{record.name}</strong>
            <span>
              {record.version}
              {record.local ? " · 本地" : " · 远程"}
              {record.enabled ? " · 已启用" : " · 已停用"}
            </span>
            {record.description && <p>{record.description}</p>}
          </div>
          <div className="plugin-manager-actions">
            <button
              type="button"
              role="switch"
              aria-checked={record.enabled}
              className="settings-toggle"
              aria-label={`${record.enabled ? "停用" : "启用"} ${record.name}`}
              onClick={() => void toggle(record.id, record.enabled)}
            >
              <span aria-hidden="true" />
            </button>
            {!record.local && (
              <button
                type="button"
                className="settings-action"
                disabled={state.busy.includes(record.id)}
                onClick={() => void update(record.id)}
              >
                {state.busy.includes(record.id) ? "更新中…" : "更新"}
              </button>
            )}
            <button
              type="button"
              className="settings-action settings-danger-button"
              onClick={() => void uninstall(record.id)}
            >
              卸载
            </button>
          </div>
        </div>
      ))}
      <h3 className="settings-detail-label">从 URL 安装</h3>
      <p className="plugin-manager-trust-note">
        远程插件会以应用权限运行。请仅安装你信任的 HTTPS 插件地址。
      </p>
      <div className="plugin-manager-install">
        <input
          aria-label="插件地址"
          placeholder="https://example.com/plugin.js"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void install();
            }
          }}
        />
        <button
          type="button"
          className="settings-action"
          onClick={() => void install()}
          disabled={!url.trim() || state.busy.length > 0}
        >
          安装
        </button>
      </div>
      {(error || state.error) && (
        <p className="settings-network-error" role="alert">
          {error || state.error}
        </p>
      )}
    </div>
  );
}
