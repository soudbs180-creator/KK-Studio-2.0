import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  getBrowserProvider,
  listBrowserProviders,
} from "../../features/browser/browserProviders.ts";
import {
  readBrowserProvider,
  writeBrowserProvider,
} from "../../features/browser/browserPreferences.ts";
import type {
  BrowserInspection,
  BrowserProviderId,
} from "../../features/browser/browserTypes.ts";
import { nativeBrowserRuntime } from "../../integrations/browser/browserRuntime.ts";

export default function BrowserBackendSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const [providerId, setProviderId] = useState<BrowserProviderId>(() =>
    readBrowserProvider(),
  );
  const [inspection, setInspection] = useState<BrowserInspection | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = getBrowserProvider(providerId);

  const inspect = useCallback(async (id: BrowserProviderId) => {
    setChecking(true);
    setError(null);
    try {
      if (!isTauri() && id !== "internal") {
        setInspection({
          provider: id,
          available: false,
          message: "当前浏览器版不会启动桌面外部浏览器，请在桌面版检查。",
        });
        return;
      }
      setInspection(await nativeBrowserRuntime.inspect(id));
    } catch (reason) {
      setInspection(null);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void inspect(providerId);
  }, [inspect, providerId]);

  function handleProviderChange(value: BrowserProviderId) {
    writeBrowserProvider(null, value);
    setProviderId(value);
    onFeedback(`浏览器后端已选择：${getBrowserProvider(value).label}。`);
  }

  const statusClass = checking
    ? "is-pending"
    : error
      ? "is-error"
      : inspection && !inspection.available
        ? "is-offline"
        : "is-online";
  const statusText = checking
    ? "检测中"
    : error
      ? "检查失败"
      : (inspection?.message ?? "等待检查");
  const authorizationText = provider.requiresAuthorization
    ? "每个外部任务开始前确认"
    : "不需要外部授权";

  return (
    <section
      className="browser-backend-card"
      aria-labelledby="browser-backend-title"
    >
      <div className="settings-agent-status">
        <span
          className={`settings-status-dot ${statusClass}`}
          aria-hidden="true"
        />
        <h3 id="browser-backend-title">
          浏览器后端
          <span className="settings-version-tag">{provider.label}</span>
        </h3>
      </div>
      <p>{provider.description}</p>
      <div className="settings-network-field">
        <label htmlFor="browser-backend-provider">浏览器选择</label>
        <select
          id="browser-backend-provider"
          aria-label="浏览器后端"
          value={providerId}
          onChange={(event) =>
            handleProviderChange(event.target.value as BrowserProviderId)
          }
        >
          {listBrowserProviders().map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <p className="browser-backend-status" role="status">
        <strong>状态：</strong>
        {statusText}
        <span aria-hidden="true"> · </span>
        <strong>授权：</strong>
        {authorizationText}
      </p>
      <p className="browser-backend-security" role="note">
        <strong>安全接管：</strong>
        登录、验证码、权限、证书警告和敏感操作会暂停自动化，完成用户确认后才会继续。
      </p>
      {error && (
        <p className="settings-network-error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action secondary"
          disabled={checking}
          onClick={() => void inspect(providerId)}
        >
          {checking ? "检查中…" : "检查状态"}
        </button>
      </div>
    </section>
  );
}
