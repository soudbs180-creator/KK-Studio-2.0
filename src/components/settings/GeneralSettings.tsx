import {
  ACCENT_PRESETS,
  type SettingsPreferences,
} from "../../domain/settings";
import { SettingRow, SettingsToggle } from "./SettingsControls";

interface GeneralSettingsProps {
  preferences: SettingsPreferences;
  onChange: (patch: Partial<SettingsPreferences>, message?: string) => void;
}

export default function GeneralSettings({
  preferences,
  onChange,
}: GeneralSettingsProps) {
  const desktopReason = "Prototype · 系统集成尚未接入，当前不可用。";
  return (
    <>
      <h2 className="settings-page-title" id="settings-section-title">
        通用
      </h2>
      <div className="settings-general-rows">
        <SettingRow id="language" title="语言" description="选择应用显示的语言">
          <span title="当前原型仅提供中文，其他语言尚未翻译。">
            <select
              className="settings-select"
              aria-labelledby="language-label"
              aria-describedby="language-reason"
              value="zh-CN"
              disabled
            >
              <option value="zh-CN">中文</option>
            </select>
          </span>
          <span className="settings-visually-hidden" id="language-reason">
            当前原型仅提供中文，其他语言尚未翻译。
          </span>
        </SettingRow>
        <SettingRow
          id="theme"
          title="主题"
          description="选择浅色、深色或跟随系统主题"
        >
          <select
            className={`settings-select${preferences.theme === "dark" ? " is-dark-theme" : ""}`}
            aria-labelledby="theme-label"
            value={preferences.theme}
            onChange={(event) =>
              onChange({
                theme: event.target.value as SettingsPreferences["theme"],
              })
            }
          >
            <option value="dark">深色</option>
            <option value="light">浅色</option>
            <option value="system">跟随系统</option>
          </select>
        </SettingRow>
        <SettingRow
          id="accent"
          title="强调色"
          description="应用于按钮、链接、焦点和选中状态"
        >
          <select
            className="settings-select"
            aria-labelledby="accent-label"
            aria-describedby="accent-description"
            value={preferences.accent}
            onChange={(event) =>
              onChange({
                accent: event.target.value as SettingsPreferences["accent"],
              })
            }
          >
            {ACCENT_PRESETS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow
          id="floating"
          title="浮岛布局"
          description="使用带有玻璃边框的浮动卡片布局"
        >
          <SettingsToggle
            id="floating"
            checked={preferences.floatingLayout}
            onChange={(floatingLayout) => onChange({ floatingLayout })}
          />
        </SettingRow>
        <SettingRow
          id="watermark"
          title="去除水印"
          description="关闭AI生成内容中的可见水印。仅对未来生成内容生效，已生成的资产保留原状。"
          className="settings-watermark-row"
        >
          <SettingsToggle
            id="watermark"
            checked={preferences.removeWatermark}
            hint="仅保存本地偏好；当前模型协议未支持水印选项，不会修改已有资产。"
            onChange={(removeWatermark) =>
              onChange(
                { removeWatermark },
                "已保存本地偏好。当前模型协议未支持水印选项，不会修改已有资产。",
              )
            }
          />
        </SettingRow>
        <p className="settings-system-label">
          系统 <span title={desktopReason}>仅桌面端</span>
        </p>
        <SettingRow
          id="tray"
          title="系统托盘"
          description="在系统托盘显示应用图标"
        >
          <SettingsToggle
            id="tray"
            checked={false}
            disabledReason={desktopReason}
          />
        </SettingRow>
        <SettingRow
          id="sleep"
          title="防止系统休眠"
          description="应用运行时阻止系统进入睡眠状态"
        >
          <SettingsToggle
            id="sleep"
            checked={false}
            disabledReason={desktopReason}
          />
        </SettingRow>
        <SettingRow
          id="autostart"
          title="开机自启动"
          description="登录时自动启动应用"
        >
          <SettingsToggle
            id="autostart"
            checked={false}
            disabledReason={desktopReason}
          />
        </SettingRow>
      </div>
    </>
  );
}
