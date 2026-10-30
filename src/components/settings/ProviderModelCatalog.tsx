import { useEffect, useState, useId, useRef } from "react";
import {
  catalogForConnection,
  saveModelCatalog,
  type ModelKind,
} from "../../features/models/index.ts";
import {
  connectionFromModelProfile,
  newModelProfileConnection,
  readProviderConnections,
} from "../../features/creation/index.ts";
import { requiresModelProviderSelection } from "./modelProviderSettingsState";
import type { ProviderConnection } from "../../domain/providerConnections";
import {
  modelProviderSchema,
  type ModelProviderProfile,
} from "../../domain/modelProvider";
import ImageModelCapabilityFields, {
  imageCapabilityDraft,
  imageDeclarationFromDraft,
} from "./ImageModelCapabilityFields";
import { useModelCatalogPreferences } from "../../features/models/index.ts";
import { fetchAndSaveProviderModels } from "./fetchProviderModels";
import ModelDisplayFields from "./ModelDisplayFields";

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

  const [revision, setRevision] = useState(0);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [newCustomModelId, setNewCustomModelId] = useState("");
  const [catalogFeedback, setCatalogFeedback] = useState("");

  const connectionKey = connection.id || connection.baseUrl || "default";
  const { setEnabled, setDefault, addCustom, merge } =
    useModelCatalogPreferences(connectionKey);

  const modelId = profile.model.trim();
  const rawModels = catalogForConnection({ ...connection, model: modelId });
  const models = merge(rawModels);

  const selected = models.find((m) => m.id === modelId);
  const selectedSignature = JSON.stringify([
    connectionKey,
    modelId,
    selected?.kind,
    selected?.sizes,
    selected?.family,
    selected?.variant,
    selected?.aliases,
    selected?.image,
  ]);
  const loadedSelection = useRef("");
  const [kind, setKind] = useState<ModelKind>(selected?.kind ?? "text");
  const [sizes, setSizes] = useState(selected?.sizes?.join(", ") ?? "");
  const [family, setFamily] = useState(selected?.family ?? "");
  const [variant, setVariant] = useState(selected?.variant ?? "");
  const [aliases, setAliases] = useState(selected?.aliases?.join(", ") ?? "");
  const [image, setImage] = useState(() =>
    imageCapabilityDraft(selected?.image),
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    const update = () => setRevision((v) => v + 1);
    window.addEventListener("kk:model-provider-changed", update);
    window.addEventListener("kk:model-catalog-prefs-changed", update);
    return () => {
      window.removeEventListener("kk:model-provider-changed", update);
      window.removeEventListener("kk:model-catalog-prefs-changed", update);
    };
  }, []);

  useEffect(() => {
    // Catalog reads return fresh objects even when saved metadata is unchanged.
    if (loadedSelection.current === selectedSignature) return;
    loadedSelection.current = selectedSignature;
    if (selected) {
      setKind(selected.kind);
      setSizes(selected.sizes?.join(", ") ?? "");
      setFamily(selected.family ?? "");
      setVariant(selected.variant ?? "");
      setAliases(selected.aliases?.join(", ") ?? "");
      setImage(imageCapabilityDraft(selected.image));
    }
  }, [modelId, revision, selected, selectedSignature]);

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

  function saveModelCapabilities() {
    if (selectionRequired) {
      setStatus("请先选择已登记账号，再保存此模型能力。");
      return;
    }
    const valid = modelProviderSchema.safeParse(profile);
    if (!valid.success) {
      setStatus(valid.error.issues[0]?.message ?? "请检查供应商配置。");
      return;
    }
    const values = sizes.split(/[,，\s]+/).filter(Boolean);
    if (values.some((v) => !/^([1-9]\d{1,4})x([1-9]\d{1,4})$/.test(v))) {
      setStatus("尺寸请填写宽x高，例如 1024x1024。");
      return;
    }
    try {
      const declaration =
        kind === "image" ? imageDeclarationFromDraft(image) : undefined;
      const model = {
        id: valid.data.model,
        family: family.trim() || undefined,
        variant: variant.trim() || undefined,
        aliases: aliases
          .split(/[,，]/)
          .map((v) => v.trim())
          .filter(Boolean),
        kind,
        sizes: kind === "image" ? [...new Set(values)] : undefined,
        image: declaration,
        source: "manual" as const,
      };
      saveModelCatalog(
        connection,
        [...rawModels.filter((item) => item.id !== model.id), model],
        true,
      );
      setStatus("已保存此模型参数声明。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败");
    }
  }

  return (
    <fieldset
      className="provider-model-catalog inset-grouped-card"
      disabled={selectionRequired}
    >
      <div className="model-catalog-header">
        <div>
          <h3 className="model-catalog-title">模型目录与能力管理</h3>
          <p className="model-catalog-subtitle">
            勾选启用/停用模型、设置常用默认模型，或通过 `/v1/models`
            一键同步拉取。
          </p>
        </div>
        <button
          type="button"
          className="settings-action secondary"
          disabled={fetchingRemote || loading || !profile.baseUrl}
          onClick={() => void handleFetchRemote()}
        >
          {fetchingRemote ? "正在拉取…" : "一键拉取模型列表"}
        </button>
      </div>

      {catalogFeedback && (
        <div className="model-catalog-feedback" role="status">
          {catalogFeedback}
        </div>
      )}

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

      <div className="model-catalog-list" role="list">
        <div className="model-catalog-list-head">
          <span className="col-status">启用</span>
          <span className="col-id">模型 ID</span>
          <span className="col-kind">用途</span>
          <span className="col-default">设为主用</span>
          <span className="col-action">操作</span>
        </div>

        {models.map((item) => (
          <div
            key={item.id}
            className={`model-catalog-row ${item.id === modelId ? "is-selected" : ""} ${!item.enabled ? "is-disabled" : ""}`}
            role="listitem"
          >
            <div className="col-status">
              <input
                type="checkbox"
                checked={item.enabled}
                aria-label={`启用 ${item.id}`}
                onChange={(e) => setEnabled(item.id, e.target.checked)}
              />
            </div>
            <div className="col-id">
              <span className="model-item-id">{item.id}</span>
              {item.source === "manual" && (
                <span className="model-source-tag">自定义</span>
              )}
              {item.isDefault && (
                <span className="model-default-tag">默认</span>
              )}
            </div>
            <div className="col-kind">
              <span className={`kind-badge kind-${item.kind}`}>
                {item.kind === "text"
                  ? "对话/推理"
                  : item.kind === "image"
                    ? "图像"
                    : item.kind === "video"
                      ? "视频"
                      : item.kind === "audio"
                        ? "音频"
                        : "未声明"}
              </span>
            </div>
            <div className="col-default">
              <button
                type="button"
                className={`btn-star ${item.isDefault ? "is-active" : ""}`}
                title={
                  item.isDefault ? "已是当前默认常用模型" : "设为默认常用模型"
                }
                aria-pressed={item.isDefault}
                onClick={() => setDefault(item.id)}
              >
                {item.isDefault ? "★ 默认" : "☆ 设为默认"}
              </button>
            </div>
            <div className="col-action">
              <button
                type="button"
                className={`btn-select-model ${item.id === modelId ? "is-active" : ""}`}
                onClick={() => onSelect(item.id)}
              >
                {item.id === modelId ? "已选中" : "选择"}
              </button>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="model-catalog-empty">
            <p>尚未发现模型，点击上方「一键拉取模型列表」或手动添加模型 ID。</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="model-params-editor">
          <h4 className="params-editor-title">
            编辑选中模型参数: <code>{selected.id}</code>
          </h4>
          <div className="params-row">
            <label className="params-field">
              <span>模型用途</span>
              <select
                aria-label="当前模型用途"
                value={kind}
                onChange={(e) => setKind(e.target.value as ModelKind)}
              >
                <option value="text">文本对话 / 深度推理</option>
                <option value="image">图像生成</option>
                <option value="video">视频生成</option>
                <option value="audio">音频合成</option>
                <option value="unknown">未声明</option>
              </select>
            </label>
            {kind === "image" && (
              <label className="params-field">
                <span>支持的图片尺寸</span>
                <input
                  aria-label="支持的图片尺寸"
                  value={sizes}
                  placeholder="例如 1024x1024, 1536x1024"
                  onChange={(e) => setSizes(e.target.value)}
                />
              </label>
            )}
          </div>
          {kind === "image" && (
            <ImageModelCapabilityFields
              value={image}
              onChange={setImage}
              disabled={loading}
            />
          )}

          <ModelDisplayFields
            family={family}
            variant={variant}
            aliases={aliases}
            setFamily={setFamily}
            setVariant={setVariant}
            setAliases={setAliases}
          />

          <div className="params-footer">
            <button
              type="button"
              className="settings-action primary"
              disabled={loading}
              onClick={saveModelCapabilities}
            >
              保存此模型参数声明
            </button>
            {status && (
              <span className="params-status-text" role="status">
                {status}
              </span>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
