import {
  ACCENT_PRESETS,
  type SettingsPreferences,
} from "../../domain/settings";
import { appPlatform, appVersion } from "../../runtime/appInfo";
import { SettingRow, SettingsToggle } from "./SettingsControls";
import AppUpdateSettings from "./AppUpdateSettings";
import GeneralAdvancedPreferences from "./GeneralAdvancedPreferences";

interface GeneralSettingsProps {
  preferences: SettingsPreferences;
  onChange: (patch: Partial<SettingsPreferences>, message?: string) => void;
  onReset: () => void;
  generalDetail?: "updates" | "advanced";
}

export default function GeneralSettings({
  preferences,
  onChange,
  onReset,
  generalDetail,
}: GeneralSettingsProps) {
  const desktopHint = "桌面客户端专属能力（在桌面运行环境中自动激活）";

  if (generalDetail === "updates") {
    return <AppUpdateSettings />;
  }

  return (
    <>
      <h2 className="settings-page-title" id="settings-section-title">
        通用设置
      </h2>
      <div className="settings-general-rows">
        <SettingRow
          id="language"
          title="语言"
          description="选择应用显示的语言界面"
        >
          <select
            className="settings-select"
            aria-labelledby="language-label"
            value="zh-CN"
            disabled
            title="当前默认提供简体中文界面"
          >
            <option value="zh-CN">简体中文 (zh-CN)</option>
          </select>
        </SettingRow>

        <SettingRow
          id="theme"
          title="主题"
          description="选择浅色、深色或跟随系统主题自动切换"
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
            <option value="dark">深色 (Dark)</option>
            <option value="light">浅色 (Light)</option>
            <option value="system">跟随系统 (System)</option>
          </select>
        </SettingRow>

        <SettingRow
          id="accent"
          title="强调色"
          description="应用于高亮选中、聚焦光晕与交互标识"
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
          description="启用带有毛玻璃拟态质感的浮动卡片工作区"
        >
          <SettingsToggle
            id="floating"
            checked={preferences.floatingLayout}
            onChange={(floatingLayout) => onChange({ floatingLayout })}
          />
        </SettingRow>

        <SettingRow
          id="historyLimit"
          title="画布历史步数"
          description="画布撤销 / 重做的可撤回步数（范围 5~100 步，默认 20 步）"
        >
          <div className="settings-stepper-wrap">
            <button
              type="button"
              className="settings-stepper-btn"
              aria-label="减少步数"
              onClick={() => {
                const current = preferences.historyLimit ?? 20;
                onChange({ historyLimit: Math.max(5, current - 5) });
              }}
            >
              −
            </button>
            <input
              type="number"
              id="historyLimit"
              className="settings-stepper-input"
              aria-labelledby="historyLimit-label"
              aria-describedby="historyLimit-description"
              min={5}
              max={100}
              value={preferences.historyLimit ?? 20}
              onChange={(event) => {
                const val = parseInt(event.target.value, 10);
                if (!isNaN(val)) {
                  onChange({ historyLimit: Math.max(5, Math.min(100, val)) });
                }
              }}
            />
            <button
              type="button"
              className="settings-stepper-btn"
              aria-label="增加步数"
              onClick={() => {
                const current = preferences.historyLimit ?? 20;
                onChange({ historyLimit: Math.min(100, current + 5) });
              }}
            >
              +
            </button>
          </div>
        </SettingRow>

        {/* Clean System & Desktop Preferences Card Group (No <details> arrow) */}
        <div
          className="settings-card-group kk-card-box"
          style={{
            backgroundColor: "var(--kk-bg-card)",
            border: "1px solid var(--kk-border-subtle)",
            padding: "16px 20px",
            marginTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--kk-text-primary)",
                margin: 0,
              }}
            >
              系统偏好与桌面集成
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--kk-text-secondary)",
                margin: "4px 0 0",
              }}
            >
              深度系统集成能力。在桌面应用环境下运行时可联动系统原生托盘与生命周期。
            </p>
          </div>

          <SettingRow
            id="watermark"
            title="生成内容水印"
            description="当前接入的模型协议默认由各服务商返回原始未篡改图像"
            className="settings-watermark-row"
          >
            <SettingsToggle
              id="watermark"
              checked={false}
              disabledReason="服务商协议暂未开放水印开关"
            />
          </SettingRow>

          <SettingRow
            id="tray"
            title="系统托盘图标"
            description="在系统任务栏托盘常驻显示应用图标，便于后台唤起"
          >
            <SettingsToggle
              id="tray"
              checked={false}
              disabledReason={desktopHint}
            />
          </SettingRow>

          <SettingRow
            id="sleep"
            title="防止系统休眠"
            description="在执行批量生图或长耗时 Agent 任务时阻止系统进入待机状态"
          >
            <SettingsToggle
              id="sleep"
              checked={false}
              disabledReason={desktopHint}
            />
          </SettingRow>

          <SettingRow
            id="autostart"
            title="开机自启动"
            description="计算机开机登录后在后台自动静默启动服务"
          >
            <SettingsToggle
              id="autostart"
              checked={false}
              disabledReason={desktopHint}
            />
          </SettingRow>
        </div>

        {/* Version Summary Card */}
        <div
          className="kk-card-box"
          style={{
            backgroundColor: "var(--kk-bg-card)",
            border: "1px solid var(--kk-border-subtle)",
            padding: "14px 18px",
            marginTop: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--kk-text-primary)",
              }}
            >
              版本状态
            </span>
            <div
              style={{
                fontSize: "12px",
                color: "var(--kk-text-secondary)",
                marginTop: "2px",
              }}
            >
              当前运行版本 v{appVersion} · {appPlatform()}
              。检查更新请前往「软件系统 - 软件更新」。
            </div>
          </div>
          <span
            className="kk-pill-box"
            style={{
              fontSize: "12px",
              color: "var(--kk-success)",
              padding: "2px 8px",
              backgroundColor: "var(--kk-bg-soft)",
            }}
          >
            已就绪
          </span>
        </div>
      </div>

      <GeneralAdvancedPreferences
        open={generalDetail === "advanced"}
        onReset={onReset}
      />
    </>
  );
}
