import { useState } from "react";
import {
  serializeSettings,
  type SettingsPreferences,
} from "../../domain/settings";
import {
  isDesktopProviderDurable,
  persistProviderConnectionsDurable,
  readProviderConnections,
  saveProviderConnection,
  withProviderStoreLock,
  writeProviderConnections,
} from "../../features/creation/index.ts";
import {
  buildDeeplinkConnection,
  exportProviderConfig,
  mergeProviderConnections,
  parseCcSwitchDeeplink,
  parseProviderConfig,
} from "../../features/providers/index.ts";

function downloadJsonBlob(filename: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PreferencesBackup({
  preferences,
  onFeedback,
}: {
  preferences: SettingsPreferences;
  onFeedback: (message: string) => void;
}) {
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  function exportPreferences(): void {
    downloadJsonBlob(
      "kk-studio-preferences.json",
      serializeSettings(preferences),
    );
    onFeedback("已导出非敏感偏好；文件不包含账号、密钥、项目或资产。");
  }

  function exportProviders(): void {
    try {
      const json = exportProviderConfig(readProviderConnections());
      downloadJsonBlob("kk-provider-config.json", json);
      onFeedback(
        "已导出供应商非敏感配置（kk-provider-config-v1）；不包含 API Key 明文。",
      );
    } catch (error) {
      onFeedback(
        error instanceof Error ? error.message : "导出供应商配置失败。",
      );
    }
  }

  async function importProviders(): Promise<void> {
    const trimmed = importText.trim();
    if (!trimmed || importing) return;
    setImporting(true);
    try {
      if (trimmed.toLowerCase().startsWith("ccswitch:")) {
        const payload = parseCcSwitchDeeplink(trimmed);
        const { connection, rawApiKey } = buildDeeplinkConnection(payload);
        if (rawApiKey?.trim()) {
          await saveProviderConnection(connection, rawApiKey.trim());
        } else {
          await withProviderStoreLock(isDesktopProviderDurable(), async () => {
            const merged = mergeProviderConnections(
              readProviderConnections(),
              [connection],
              "replace",
            );
            if (isDesktopProviderDurable()) {
              await persistProviderConnectionsDurable(merged);
            }
            writeProviderConnections(merged);
          });
        }
      } else {
        const parsed = parseProviderConfig(trimmed);
        await withProviderStoreLock(isDesktopProviderDurable(), async () => {
          const merged = mergeProviderConnections(
            readProviderConnections(),
            parsed.connections,
            "keep-existing",
          );
          if (isDesktopProviderDurable()) {
            await persistProviderConnectionsDurable(merged);
          }
          writeProviderConnections(merged);
        });
      }
      setImportText("");
      window.dispatchEvent(new CustomEvent("kk:model-provider-changed"));
      onFeedback("已导入供应商连接配置。");
    } catch (error) {
      onFeedback(
        error instanceof Error ? error.message : "导入供应商配置失败。",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <details className="settings-disclosure">
      <summary>偏好备份</summary>
      <div className="settings-detail-stack">
        <p className="settings-section-intro">
          仅导出主题、布局与供应商非敏感连接配置（不包含密钥明文）。项目与原件通过项目包单独备份。
        </p>
        <div className="settings-action-group">
          <button
            type="button"
            className="settings-action secondary"
            onClick={exportPreferences}
          >
            导出偏好备份
          </button>
          <button
            type="button"
            className="settings-action secondary"
            onClick={exportProviders}
          >
            导出供应商配置
          </button>
        </div>
        <label className="settings-field">
          <span>导入供应商配置 JSON 或 CC Switch Deeplink</span>
          <input
            type="text"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="粘贴 kk-provider-config JSON 或 ccswitch://v1/import?..."
            disabled={importing}
          />
        </label>
        <button
          type="button"
          className="settings-action secondary"
          disabled={!importText.trim() || importing}
          onClick={() => void importProviders()}
        >
          {importing ? "正在导入…" : "导入供应商配置"}
        </button>
      </div>
    </details>
  );
}
