import { useState, type MouseEvent } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
  type ProviderPreset,
} from "../../domain/providerPresets";

export default function ProviderPresetSelector({
  onSelect,
  onOpenGoogle,
}: {
  onSelect: (preset: ProviderPreset) => void;
  onOpenGoogle: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [selected, setSelected] = useState("openai");
  const [feedback, setFeedback] = useState("");
  async function openLink(event: MouseEvent<HTMLAnchorElement>): Promise<void> {
    if (!isTauri()) return;
    event.preventDefault();
    setFeedback("");
    try {
      await invoke("plugin:shell|open", { path: event.currentTarget.href });
    } catch {
      setFeedback("外部浏览器未能打开，请重试或复制链接到浏览器。");
    }
  }
  const preset = findProviderPreset(selected)!;
  const needle = query.trim().toLocaleLowerCase();
  const matches = PROVIDER_PRESETS.filter(
    (item) =>
      (category === "全部" || item.category === category) &&
      `${item.label} ${item.protocol} ${item.website}`
        .toLocaleLowerCase()
        .includes(needle),
  );
  return (
    <details className="provider-presets">
      <summary>服务商预设与接口文档</summary>
      <label className="settings-field">
        <span>搜索服务商</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名称、协议或网站"
        />
      </label>
      <div
        className="settings-action-group"
        role="group"
        aria-label="服务商分类"
      >
        {["全部", "官方", "网关", "本地"].map((value) => (
          <button
            type="button"
            className="settings-action secondary"
            key={value}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="provider-preset-layout">
        <div
          className="provider-preset-list"
          role="group"
          aria-label="服务商预设"
        >
          {matches.map((item) => (
            <button
              type="button"
              className="provider-preset-item"
              key={item.id}
              aria-pressed={selected === item.id}
              onClick={() => {
                setSelected(item.id);
                setFeedback("");
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.protocol}</span>
            </button>
          ))}
          {!matches.length && (
            <p role="status">没有匹配的服务商，清除搜索或更换分类。</p>
          )}
        </div>
        <section className="provider-preset-detail" aria-label="预设详情">
          <h3>{preset.label}</h3>
          <p>{preset.protocol}</p>
          <div className="provider-preset-links">
            <a
              href={preset.website}
              target="_blank"
              rel="noreferrer"
              onClick={openLink}
            >
              官方网站
            </a>
            <a
              href={preset.keyUrl}
              target="_blank"
              rel="noreferrer"
              onClick={openLink}
            >
              {preset.keyLabel || "获取密钥"}
            </a>
            <a
              href={preset.docsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={openLink}
            >
              接口文档
            </a>
          </div>
          {feedback && <p role="alert">{feedback}</p>}
          <p>
            {preset.unavailableReason ||
              (preset.category === "本地"
                ? "请先启动本地服务；生成需要在服务端开启 API Token。"
                : preset.category === "网关"
                  ? "接口地址和令牌由你的实例提供。选择后填写实例地址，不会自动请求服务。"
                  : "使用预设补全名称和接口地址，模型可检测或手动填写。")}
          </p>
          <button
            type="button"
            className="settings-action"
            disabled={
              preset.id !== "gemini" && Boolean(preset.unavailableReason)
            }
            title={preset.unavailableReason}
            onClick={() =>
              preset.id === "gemini" ? onOpenGoogle() : onSelect(preset)
            }
          >
            {preset.id === "gemini" ? "前往 Google 配置" : "使用此预设"}
          </button>
        </section>
      </div>
    </details>
  );
}
