import { useContext, useRef, useState, type MouseEvent } from "react";
import { SettingsNavigationContext } from "./SettingsNavigationContext";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
  type ProviderPreset,
} from "../../domain/providerPresets";

type PresetBrowserState = {
  localOnly: boolean;
  view: "list" | "detail";
  query: string;
  category: string;
  selected: string;
  feedback: string;
};
function initialBrowser(localOnly: boolean): PresetBrowserState {
  return {
    localOnly,
    view: "list",
    query: "",
    category: "全部",
    selected: localOnly
      ? (PROVIDER_PRESETS.find((item) => item.category === "本地")?.id ??
        "openai")
      : "openai",
    feedback: "",
  };
}

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
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [stored, setBrowser] = useState(() => initialBrowser(localOnly));
  const { view, query, category, selected, feedback } =
    stored.localOnly === localOnly ? stored : initialBrowser(localOnly);
  function update(patch: Partial<PresetBrowserState>): void {
    const scope = policy.current.localOnly;
    if (scope !== localOnly) return;
    setBrowser((current) => ({
      ...(current.localOnly === scope ? current : initialBrowser(scope)),
      ...patch,
      localOnly: scope,
    }));
  }
  function scopeAllows(candidate: ProviderPreset): boolean {
    return (
      policy.current.localOnly === localOnly &&
      (!localOnly || candidate.category === "本地")
    );
  }
  async function openLink(event: MouseEvent<HTMLAnchorElement>): Promise<void> {
    if (!scopeAllows(preset)) {
      event.preventDefault();
      return;
    }
    if (!isTauri()) return;
    event.preventDefault();
    update({ feedback: "" });
    try {
      await invoke("plugin:shell|open", { path: event.currentTarget.href });
    } catch {
      update({ feedback: "外部浏览器未能打开，请重试或复制链接到浏览器。" });
    }
  }
  const preset = findProviderPreset(selected)!;
  const needle = query.trim().toLocaleLowerCase();
  const matches = PROVIDER_PRESETS.filter(
    (item) =>
      (!localOnly || item.category === "本地") &&
      (category === "全部" || item.category === category) &&
      `${item.label} ${item.protocol} ${item.website}`
        .toLocaleLowerCase()
        .includes(needle),
  );
  return (
    <details
      ref={disclosure}
      className="provider-presets"
      onToggle={(event) => {
        if (!event.currentTarget.open) update({ view: "list" });
      }}
    >
      <summary
        aria-disabled={busy}
        title={busy ? "连接操作进行中，完成后可展开预设" : undefined}
        onClick={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        服务商预设与接口文档
      </summary>
      <div hidden={view !== "list"}>
        <label className="settings-field">
          <span>搜索服务商</span>
          <input
            disabled={busy}
            title={busy ? "连接操作进行中，完成后可切换预设" : undefined}
            value={query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="名称、协议或网站"
          />
        </label>
        <div
          className="settings-action-group"
          role="group"
          aria-label="服务商分类"
        >
          {(localOnly
            ? ["全部", "本地"]
            : ["全部", "官方", "网关", "本地"]
          ).map((value) => (
            <button
              type="button"
              className="settings-action secondary"
              key={value}
              disabled={busy}
              title={busy ? "连接操作进行中，完成后可切换预设" : undefined}
              aria-pressed={category === value}
              onClick={() => update({ category: value })}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="provider-preset-layout">
        <div
          className="provider-preset-list"
          hidden={view !== "list"}
          role="group"
          aria-label="服务商预设"
        >
          {matches.map((item) => (
            <button
              type="button"
              className="provider-preset-item"
              key={item.id}
              disabled={busy}
              title={
                busy
                  ? "连接操作进行中，完成后可切换预设"
                  : item.label + " · " + item.protocol
              }
              aria-pressed={selected === item.id}
              onClick={() => {
                if (policy.current.busy || !scopeAllows(item)) return;
                update({ selected: item.id, view: "detail", feedback: "" });
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
        <section
          className="provider-preset-detail"
          hidden={
            view !== "detail" || (localOnly && preset.category !== "本地")
          }
          aria-label="预设详情"
        >
          <div className="settings-subpage-header">
            <button
              type="button"
              className="settings-action secondary"
              disabled={busy}
              title={busy ? "连接操作进行中，完成后可切换预设" : undefined}
              onClick={() => {
                if (!busy) {
                  update({ view: "list" });
                  window.requestAnimationFrame(() =>
                    disclosure.current
                      ?.querySelector<HTMLButtonElement>(
                        '.provider-preset-item[aria-pressed="true"]',
                      )
                      ?.focus({ preventScroll: true }),
                  );
                }
              }}
            >
              返回服务商
            </button>
            <h3>{preset.label}</h3>
          </div>
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
                ? "请先启动本机服务。预设使用本机免密；开启了 Token 认证时，改选 API Key 后填写密钥。"
                : preset.category === "网关"
                  ? "接口地址和令牌由你的实例提供。选择后填写实例地址，不会自动请求服务。"
                  : "使用预设补全名称和接口地址，模型可检测或手动填写。")}
          </p>
          <button
            type="button"
            className="settings-action"
            disabled={
              busy ||
              (localOnly && preset.category !== "本地") ||
              (preset.id !== "gemini" && Boolean(preset.unavailableReason))
            }
            title={
              busy
                ? "连接操作进行中，完成后可使用预设"
                : preset.unavailableReason
            }
            onClick={() => {
              if (
                policy.current.busy ||
                !scopeAllows(preset) ||
                (preset.id !== "gemini" && preset.unavailableReason)
              )
                return;
              if (preset.id === "gemini") onOpenGoogle();
              else onSelect(preset);
              if (disclosure.current) disclosure.current.open = false;
            }}
          >
            {preset.id === "gemini" ? "前往 Google 配置" : "使用此预设"}
          </button>
        </section>
      </div>
    </details>
  );
}
