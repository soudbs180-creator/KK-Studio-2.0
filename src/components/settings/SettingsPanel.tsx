import { useState } from "react";
import { X } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  parseSettings,
  serializeSettings,
} from "../../domain/settings";
import type { SettingsPreferences } from "../../domain/settings";
import GeneralSettings from "./GeneralSettings";
import SettingsSections, { SETTINGS_SECTIONS } from "./SettingsSections";
import type { SettingsSection } from "./SettingsSections";
import type { SaveState } from "../../features/creation/useCreationStorage";
import "./settings.css";

function readInitialSettings(): {
  preferences: SettingsPreferences;
  message: string;
  error: boolean;
} {
  try {
    const result = parseSettings(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY),
    );
    return {
      preferences: result.preferences,
      message: result.recovered
        ? "保存的偏好无法读取，已暂用默认设置。原始记录保留，修改设置后将保存新偏好。"
        : "",
      error: result.recovered,
    };
  } catch {
    return {
      preferences: { ...DEFAULT_SETTINGS },
      message:
        "浏览器阻止了本地存储。设置可在本次打开期间使用，关闭后不会保留。",
      error: true,
    };
  }
}

export default function SettingsPanel({
  onClose,
  initialSection = "general",
  saveState = "loading",
  revision = 0,
}: {
  onClose: () => void;
  initialSection?: SettingsSection;
  saveState?: SaveState;
  revision?: number;
}) {
  const [initial] = useState(readInitialSettings);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [feedback, setFeedback] = useState({
    message: initial.message,
    error: initial.error,
  });

  function updatePreferences(
    patch: Partial<SettingsPreferences>,
    message = "偏好已保存在当前浏览器。",
  ): void {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    const systemIsDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.dataset.theme =
      next.theme === "system" ? (systemIsDark ? "dark" : "light") : next.theme;
    document.documentElement.dataset.floatingLayout = String(
      next.floatingLayout,
    );
    window.dispatchEvent(
      new CustomEvent<SettingsPreferences>("kk:settings-changed", {
        detail: next,
      }),
    );
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        serializeSettings(next),
      );
      setFeedback({ message, error: false });
    } catch {
      setFeedback({
        message:
          "更改已在当前页面生效，但浏览器无法保存。请允许本地存储后重试。",
        error: true,
      });
    }
  }

  return (
    <div className="settings-panel" data-figma-node="399:27506">
      <aside className="settings-sidebar">
        <h1 id="settings-dialog-title">设置</h1>
        <nav className="settings-nav" aria-label="设置分类">
          {SETTINGS_SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`settings-nav-item${section === item.id ? " is-active" : ""}`}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => {
                setSection(item.id);
                setFeedback({ message: "", error: false });
              }}
            >
              <img
                className="settings-nav-icon"
                src={`/design/figma/settings-nav-${item.id}.svg`}
                alt=""
                width="22"
                height="22"
              />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main
        className="settings-content"
        aria-labelledby="settings-section-title"
        tabIndex={0}
      >
        {section === "general" ? (
          <GeneralSettings
            preferences={preferences}
            onChange={updatePreferences}
          />
        ) : (
          <SettingsSections
            key={section}
            section={section}
            saveState={saveState}
            revision={revision}
            preferences={preferences}
            onReset={() =>
              updatePreferences(
                { ...DEFAULT_SETTINGS },
                "已恢复默认偏好。项目和资产未改动。",
              )
            }
            onFeedback={(message) => setFeedback({ message, error: false })}
          />
        )}
      </main>
      <button
        type="button"
        className="settings-close"
        aria-label="关闭设置"
        onClick={onClose}
      >
        <img
          src="/design/figma/settings-close.svg"
          width="14"
          height="14"
          alt=""
        />
      </button>
      {feedback.message && (
        <div
          className={`settings-feedback${feedback.error ? " is-error" : ""}`}
          role={feedback.error ? "alert" : "status"}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            aria-label="收起设置提示"
            onClick={() => setFeedback({ message: "", error: false })}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
