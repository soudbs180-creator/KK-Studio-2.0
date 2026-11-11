import type { ModelCatalogEntry } from "../../features/models/index.ts";

export default function ProviderModelCatalogList({
  models,
  modelId,
  setEnabled,
  setDefault,
  onSelect,
}: {
  models: ModelCatalogEntry[];
  modelId: string;
  setEnabled: (id: string, enabled: boolean) => void;
  setDefault: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
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
            {item.isDefault && <span className="model-default-tag">默认</span>}
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
  );
}
