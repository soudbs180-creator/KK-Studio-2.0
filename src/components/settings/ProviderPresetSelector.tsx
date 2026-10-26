import { useContext, useRef, useState, type MouseEvent } from "react";
import { SettingsNavigationContext } from "./SettingsNavigationContext";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  PROVIDER_PRESETS,
  type ProviderPreset,
} from "../../domain/providerPresets";

export default function ProviderPresetSelector({
  onSelect,
  onOpenGoogle,
  localOnly = false,
}: {
  onSelect: (preset: ProviderPreset) => void;
  onOpenGoogle: () => void;
  localOnly?: boolean;
}) {
  const { busy } = useContext(SettingsNavigationContext);
  const policy = useRef({ busy, localOnly });
  policy.current = { busy, localOnly };

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [feedback, setFeedback] = useState("");
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const lastLocalOnly = useRef(localOnly);
  let effectiveCategory = category;
  let effectiveQuery = query;

  if (localOnly !== lastLocalOnly.current) {
    lastLocalOnly.current = localOnly;
    if (localOnly) {
      if (category !== "全部" && category !== "本地") {
        effectiveCategory = "全部";
        setCategory("全部");
      }
      effectiveQuery = "";
      setQuery("");
    }
  } else if (localOnly && category !== "全部" && category !== "本地") {
    effectiveCategory = "全部";
    setCategory("全部");
  }

  const categories = localOnly
    ? ["全部", "本地"]
    : ["全部", "官方", "网关", "本地"];

  async function openLink(
    event: MouseEvent<HTMLAnchorElement>,
    url: string,
  ): Promise<void> {
    if (policy.current.localOnly) return;
    if (!isTauri()) return;
    event.preventDefault();
    setFeedback("");
    try {
      await invoke("plugin:shell|open", { path: url });
    } catch {
      setFeedback("外部浏览器未能打开，请重试或复制链接到浏览器。");
    }
  }

  function handleSelect(item: ProviderPreset) {
    if (policy.current.busy) return;
    if (policy.current.localOnly && item.category !== "本地") return;
    if (item.id === "gemini") {
      onOpenGoogle();
    } else {
      onSelect(item);
      setAppliedPresetId(item.id);
      if (typeof setTimeout === "function") {
        setTimeout(() => setAppliedPresetId(null), 2000);
      }
    }
  }

  const needle = effectiveQuery.trim().toLocaleLowerCase();
  const matches = PROVIDER_PRESETS.filter(
    (item) =>
      (!localOnly || item.category === "本地") &&
      (effectiveCategory === "全部" || item.category === effectiveCategory) &&
      `${item.label} ${item.name} ${item.protocol} ${item.website}`
        .toLocaleLowerCase()
        .includes(needle),
  );

  return (
    <details className="provider-presets">
      <summary
        aria-disabled={busy}
        title={busy ? "连接操作进行中，完成后可展开预设" : undefined}
        onClick={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        服务商预设与快速填入
      </summary>
      <div className="provider-preset-card-group">
        <div className="preset-card-group-header">
          <div className="preset-header-titles">
            <p className="preset-subtitle">
              点击任意服务商卡片即可一键自动回填 Base URL、通信协议及默认配置。
            </p>
          </div>
          {feedback && (
            <span className="preset-feedback" role="alert">
              {feedback}
            </span>
          )}
        </div>

        <div className="preset-filter-toolbar">
          <div
            className="preset-category-tabs"
            role="group"
            aria-label="服务商分类"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`preset-tab-btn ${effectiveCategory === cat ? "is-active" : ""}`}
                aria-pressed={effectiveCategory === cat}
                disabled={busy}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="preset-search-box">
            <input
              type="search"
              value={effectiveQuery}
              disabled={busy}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索服务商（如 DeepSeek、12ai、SiliconFlow、llama.cpp、OpenAI…）"
              aria-label="搜索服务商"
            />
          </div>
        </div>

        <div className="preset-card-grid" role="list">
          {matches.map((item) => {
            const isApplied = appliedPresetId === item.id;
            return (
              <div
                key={item.id}
                className={`preset-item-card provider-preset-item ${isApplied ? "is-applied" : ""}`}
                role="listitem"
              >
                <div className="preset-card-top">
                  <div className="preset-card-identity">
                    <span className="preset-card-label">{item.label}</span>
                    <span className={`preset-badge badge-${item.category}`}>
                      {item.category}
                    </span>
                  </div>
                  <span className="preset-protocol-tag">{item.protocol}</span>
                </div>

                <div className="preset-card-meta">
                  <span className="preset-card-fullname" title={item.name}>
                    {item.name}
                  </span>
                  {item.baseUrl && (
                    <code className="preset-card-url" title={item.baseUrl}>
                      {item.baseUrl}
                    </code>
                  )}
                </div>

                {item.recommendedModels &&
                  item.recommendedModels.length > 0 && (
                    <div className="preset-recommended-models">
                      <span className="model-tag-label">推荐:</span>
                      {item.recommendedModels.slice(0, 2).map((model) => (
                        <span key={model} className="model-chip" title={model}>
                          {model.split("/").pop()}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="preset-card-actions">
                  <button
                    type="button"
                    className="preset-apply-btn settings-action"
                    disabled={busy}
                    onClick={() => handleSelect(item)}
                  >
                    {isApplied
                      ? "✓ 已填入"
                      : item.id === "gemini"
                        ? "前往 Google 配置"
                        : "一键填入"}
                  </button>

                  <div className="preset-external-links">
                    {item.docsUrl && (
                      <a
                        href={item.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="preset-link"
                        onClick={(e) => void openLink(e, item.docsUrl)}
                      >
                        文档
                      </a>
                    )}
                    {item.keyUrl && (
                      <a
                        href={item.keyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="preset-link"
                        onClick={(e) => void openLink(e, item.keyUrl)}
                      >
                        {item.keyLabel || "密钥"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="preset-empty-state">
              <p>未找到匹配的服务商，请尝试更换分类或清除搜索关键词。</p>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
