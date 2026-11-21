import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useState, type FormEvent } from "react";

type Mode = "system" | "direct" | "manual";
type Preferences =
  { mode: "system" | "direct" } | { mode: "manual"; proxyUrl: string };
type Route = "local" | "direct" | "system" | "manual";

const modes = {
  system: "跟随系统",
  direct: "直连",
  manual: "手动代理",
} satisfies Record<Mode, string>;

const operations = {
  discovery: "测试连接",
  text: "文字生成",
  image: "图片生成",
};

const routes: Record<Route, string> = {
  local: "本机直连",
  direct: "直连",
  system: "系统代理",
  manual: "手动代理",
};

type Recent = Record<keyof typeof operations, Route | null>;

export default function ProviderNetworkSettings({
  active,
}: {
  active: boolean;
}) {
  const desktop = isTauri();
  const [saved, setSaved] = useState<Preferences>();
  const [mode, setMode] = useState<Mode>("system");
  const [proxyUrl, setProxyUrl] = useState("");
  const [recent, setRecent] = useState<Recent>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!active || !desktop) return;
    let current = true;
    void invoke<Preferences>("provider_network_preferences")
      .then((value) => {
        if (!current) return;
        setSaved(value);
        setMode(value.mode);
        setProxyUrl(value.mode === "manual" ? value.proxyUrl : "");
      })
      .catch(() => {
        if (current) setMessage("无法读取网络设置，可重新选择并保存。");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [active, desktop]);

  useEffect(() => {
    if (!active || !desktop) return;
    let current = true;
    let timer: number | undefined;
    async function refresh() {
      try {
        const value = await invoke<Recent>("provider_network_routes");
        if (current) setRecent(value);
      } catch {
        if (current) setRecent(undefined);
      } finally {
        if (current) timer = window.setTimeout(refresh, 1000);
      }
    }
    void refresh();
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [active, desktop]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const preferences: Preferences =
        mode === "manual" ? { mode, proxyUrl } : { mode };
      const value = await invoke<Preferences>(
        "save_provider_network_preferences",
        {
          preferences,
        },
      );
      setSaved(value);
      setProxyUrl(value.mode === "manual" ? value.proxyUrl : "");
      setMessage("已保存，新请求将使用此设置。");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "网络设置保存失败。");
    } finally {
      setSaving(false);
    }
  }

  if (!desktop)
    return (
      <p className="settings-section-intro">
        模型请求使用浏览器的网络设置。出站代理选项仅适用于桌面端。
      </p>
    );

  return (
    <>
      <form
        className="settings-detail-stack settings-provider-network"
        onSubmit={save}
      >
        <label className="settings-field">
          模型请求线路
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as Mode)}
            disabled={loading || saving}
          >
            {Object.entries(modes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {mode === "manual" && (
          <label className="settings-field">
            HTTP(S) 代理地址
            <input
              type="url"
              placeholder="http://127.0.0.1:7890"
              value={proxyUrl}
              onChange={(event) => setProxyUrl(event.target.value)}
              maxLength={2048}
              autoComplete="off"
              spellCheck={false}
              required
              disabled={loading || saving}
            />
          </label>
        )}
        <p className="settings-section-intro">
          跟随系统时，没有匹配代理的请求会直连。本机模型服务始终直连。
        </p>
        <div className="settings-action-group">
          <button className="settings-action" disabled={loading || saving}>
            {saving ? "正在保存…" : "保存线路设置"}
          </button>
        </div>
        <p className="settings-section-intro" role="status">
          {loading
            ? "正在读取线路设置…"
            : saved
              ? `已启用：${modes[saved.mode]}`
              : ""}
          {message && ` ${message}`}
        </p>
      </form>
      <h3 className="settings-detail-label">最近请求采用的线路</h3>
      {Object.entries(operations).map(([key, label]) => {
        const route = recent?.[key as keyof Recent];
        return (
          <div className="settings-info-row" key={key}>
            <span>{label}</span>
            <strong>{route ? routes[route] : recent ? "暂无记录" : "—"}</strong>
          </div>
        );
      })}
    </>
  );
}
