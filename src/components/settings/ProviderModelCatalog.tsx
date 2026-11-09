import { useEffect, useState, useId } from "react";
import { catalogForConnection } from "../../features/models/index.ts";
import {
  connectionFromModelProfile,
  newModelProfileConnection,
  readProviderConnections,
} from "../../features/creation/index.ts";
import { requiresModelProviderSelection } from "./modelProviderSettingsState";
import type { ProviderConnection } from "../../domain/providerConnections";
import type { ModelProviderProfile } from "../../domain/modelProvider";
import { useModelCatalogPreferences } from "../../features/models/index.ts";
import { fetchAndSaveProviderModels } from "./fetchProviderModels";
import ProviderModelCatalogList from "./ProviderModelCatalogList";

// ss2：ImageModelCapabilityFields / ModelDisplayFields 文件保留，展示对用户条件隐藏。

export default function ProviderModelCatalog({
  profile,
  onSelect,
  loading,
  connection: selectedConnection,
}: {
  profile: ModelProviderProfile;
  onSelect: (id: string) => void;
  loading: boolean;
  connection?: ProviderConnection;
}) {
  const customIdInput = useId();
  const selectionRequired = requiresModelProviderSelection(
    profile,
    readProviderConnections(),
  );
  const connection =
    selectedConnection ??
    (selectionRequired
      ? newModelProfileConnection(profile)
      : connectionFromModelProfile(profile));

  const [, setRevision] = useState(0);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [newCustomModelId, setNewCustomModelId] = useState("");
  const [catalogFeedback, setCatalogFeedback] = useState("");

  const connectionKey = connection.id || connection.baseUrl || "default";
  const { setEnabled, setDefault, addCustom, merge } =
    useModelCatalogPreferences(connectionKey);

  const modelId = profile.model.trim();
  const rawModels = catalogForConnection({ ...connection, model: modelId });
  const models = merge(rawModels);

  useEffect(() => {
    const update = () => setRevision((v) => v + 1);
    window.addEventListener("kk:model-provider-changed", update);
    window.addEventListener("kk:model-catalog-prefs-changed", update);
    return () => {
      window.removeEventListener("kk:model-provider-changed", update);
      window.removeEventListener("kk:model-catalog-prefs-changed", update);
    };
  }, []);

  async function handleFetchRemote() {
    if (fetchingRemote || !profile.baseUrl) return;
    setFetchingRemote(true);
    setCatalogFeedback("正在从服务商拉取模型列表…");
    try {
      const res = await fetchAndSaveProviderModels(connection, {
        baseUrl: profile.baseUrl,
        protocol: profile.protocol,
        authMode: profile.authMode,
        credentialRef: connection.credentialRef,
      });
      setCatalogFeedback(res.message);
      if (res.ok && res.models.length > 0 && !modelId)
        onSelect(res.models[0].id);
    } catch (err) {
      setCatalogFeedback(
        err instanceof Error ? err.message : "拉取模型列表失败",
      );
    } finally {
      setFetchingRemote(false);
    }
  }

  function handleAddCustom() {
    const trimmed = newCustomModelId.trim();
    if (!trimmed) return;
    try {
      const added = addCustom({ id: trimmed, kind: "text" });
      onSelect(added.id);
      setNewCustomModelId("");
      setCatalogFeedback(`已添加自定义模型：${added.id}`);
    } catch (err) {
      setCatalogFeedback(err instanceof Error ? err.message : "添加失败");
    }
  }

  return (
    <fieldset
      className="provider-model-catalog inset-grouped-card"
      disabled={selectionRequired}
    >
      {selectionRequired && (
        <p role="status">请先在已登记连接中选择账号，再编辑模型能力。</p>
      )}
      <div className="model-catalog-header">
        <div>
          <h3 className="model-catalog-title">模型目录</h3>
          <p className="model-catalog-subtitle">
            连通测试成功后会自动同步模型列表；勾选启用或设为默认即可。
          </p>
        </div>
      </div>

      {catalogFeedback && (
        <div className="model-catalog-feedback" role="status">
          {catalogFeedback}
        </div>
      )}

      <ProviderModelCatalogList
        models={models}
        modelId={modelId}
        setEnabled={setEnabled}
        setDefault={setDefault}
        onSelect={onSelect}
      />

      <details className="settings-usage-guide">
        <summary>
          <span className="settings-usage-guide-toggle">
            <span className="settings-usage-guide-expand">
              展开高级：手动拉取 / 自定义模型 ID
            </span>
            <span className="settings-usage-guide-collapse">
              收起高级：手动拉取 / 自定义模型 ID
            </span>
          </span>
        </summary>
        <div className="model-custom-add-bar">
          <button
            type="button"
            className="settings-action secondary"
            disabled={fetchingRemote || loading || !profile.baseUrl}
            onClick={() => void handleFetchRemote()}
          >
            {fetchingRemote ? "正在拉取…" : "手动拉取模型列表"}
          </button>
        </div>
        <div className="model-custom-add-bar">
          <label htmlFor={customIdInput} className="custom-add-label">
            添加自定义模型 ID：
          </label>
          <div className="custom-add-input-group">
            <input
              id={customIdInput}
              type="text"
              value={newCustomModelId}
              placeholder="例如 o3-mini、deepseek-ai/DeepSeek-V3"
              onChange={(e) => setNewCustomModelId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
            />
            <button
              type="button"
              className="settings-action secondary"
              disabled={!newCustomModelId.trim()}
              onClick={handleAddCustom}
            >
              添加
            </button>
          </div>
        </div>
      </details>
    </fieldset>
  );
}
