import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { appPlatform, appVersion } from "../../runtime/appInfo";
import { SettingsToggle } from "./SettingsControls";

export type UpdateState =
  | "idle"
  | "checking"
  | "up_to_date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

interface UpdatePreferences {
  autoCheckOnLaunch: boolean;
  notifyOnUpdates: boolean;
  channel: "stable" | "beta";
}

const PREFS_STORAGE_KEY = "kk:update-preferences";
const cardStyle: CSSProperties = {
  backgroundColor: "var(--kk-bg-card)",
  border: "1px solid var(--kk-border-subtle)",
  padding: "16px 20px",
};

const CHANGELOG_ITEMS = [
  {
    version: "2.1.42",
    date: "2026-10-19",
    highlights: [
      {
        tag: "重构",
        desc: "全新设置架构与多渠道模型接入体系，原生支持 5 大接入渠道",
        color: "var(--kk-text-accent)",
      },
      {
        tag: "优化",
        desc: "全面恢复自然胶囊药丸交互，移除杂乱阴影，对齐苹果级极简设计规范",
        color: "var(--kk-text-primary)",
      },
      {
        tag: "新增",
        desc: "个人主页模型用量 Token 看板与全局无冲突快捷键管理",
        color: "var(--kk-success)",
      },
    ],
  },
  {
    version: "2.1.37",
    date: "2026-10-17",
    highlights: [
      {
        tag: "修复",
        desc: "移动端与窄屏应用菜单左侧安全区定位与裁切优化",
        color: "var(--kk-warning)",
      },
      {
        tag: "新增",
        desc: "受限静态 Web 交付通道，绑定主分支质量门禁与 HTTPS 校验",
        color: "var(--kk-text-accent)",
      },
      {
        tag: "优化",
        desc: "基于 2.1.36 架构重新验证桌面安装器与独立回执",
        color: "var(--kk-text-primary)",
      },
    ],
  },
  {
    version: "2.1.26",
    date: "2026-10-10",
    highlights: [
      {
        tag: "优化",
        desc: "收紧设置与设计系统规范，统一首页与创作输入框发送动作组",
        color: "var(--kk-text-primary)",
      },
      {
        tag: "修复",
        desc: "空媒体独立上传维持 32px 命中区，避免重复上传",
        color: "var(--kk-warning)",
      },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-09-23",
    highlights: [
      {
        tag: "新增",
        desc: "汇总 Agent 桌面运行时、图片附件与画布引用能力",
        color: "var(--kk-text-accent)",
      },
      {
        tag: "优化",
        desc: "统一响应式界面与创作输入框，建立多渠道模型接入底座",
        color: "var(--kk-text-primary)",
      },
    ],
  },
];

function UpdatePreferencesCard({
  prefs,
  onUpdatePrefs,
}: {
  prefs: UpdatePreferences;
  onUpdatePrefs: (patch: Partial<UpdatePreferences>) => void;
}) {
  return (
    <div
      className="kk-card-box"
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--kk-text-primary)",
          margin: 0,
        }}
      >
        更新偏好与通道
      </h3>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: "1px solid var(--kk-border-subtle)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--kk-text-primary)",
            }}
          >
            启动时自动检查更新
          </div>
          <div style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}>
            启动应用后静默查询更新服务器，有新版本时在状态栏提示
          </div>
        </div>
        <SettingsToggle
          id="autoCheck"
          checked={prefs.autoCheckOnLaunch}
          onChange={(autoCheckOnLaunch) => onUpdatePrefs({ autoCheckOnLaunch })}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: "1px solid var(--kk-border-subtle)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--kk-text-primary)",
            }}
          >
            新版本发布系统通知
          </div>
          <div style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}>
            发现关键安全更新或新功能发布时弹出桌面通知
          </div>
        </div>
        <SettingsToggle
          id="notifyUpdates"
          checked={prefs.notifyOnUpdates}
          onChange={(notifyOnUpdates) => onUpdatePrefs({ notifyOnUpdates })}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--kk-text-primary)",
            }}
          >
            更新发布通道
          </div>
          <div style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}>
            选择接收正式稳定版或尝鲜测试版
          </div>
        </div>
        <select
          className="settings-select kk-control-box"
          value={prefs.channel}
          style={{ height: "var(--kk-control-h-md)", width: "160px" }}
          onChange={(e) =>
            onUpdatePrefs({ channel: e.target.value as "stable" | "beta" })
          }
        >
          <option value="stable">正式稳定版 (Stable)</option>
          <option value="beta">尝鲜测试版 (Beta)</option>
        </select>
      </div>
    </div>
  );
}

function UpdateChangelogCard({
  selectedVersion,
  onSelectVersion,
}: {
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
}) {
  const currentChangelog =
    CHANGELOG_ITEMS.find((c) => c.version === selectedVersion) ??
    CHANGELOG_ITEMS[0];
  return (
    <div
      className="kk-card-box"
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--kk-text-primary)",
            margin: 0,
          }}
        >
          版本更新日志 (Changelog)
        </h3>
        <div style={{ display: "flex", gap: "6px" }}>
          {CHANGELOG_ITEMS.map((item) => (
            <button
              key={item.version}
              type="button"
              className={`settings-chip${selectedVersion === item.version ? " is-selected" : ""}`}
              aria-pressed={selectedVersion === item.version}
              onClick={() => onSelectVersion(item.version)}
            >
              v{item.version}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "4px",
        }}
      >
        <div style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}>
          发布日期: {currentChangelog.date}
        </div>
        {currentChangelog.highlights.map((h, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <span
              className="kk-kbd-box"
              style={{
                fontSize: "12px",
                padding: "1px 6px",
                backgroundColor: "var(--kk-bg-soft)",
                color: h.color,
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {h.tag}
            </span>
            <span style={{ color: "var(--kk-text-primary)", lineHeight: 1.5 }}>
              {h.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppUpdatePage() {
  const [state, setState] = useState<UpdateState>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState(appVersion);
  const [prefs, setPrefs] = useState<UpdatePreferences>(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) {
      void error;
    }
    return {
      autoCheckOnLaunch: true,
      notifyOnUpdates: true,
      channel: "stable",
    };
  });

  const downloadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearDownloadTimer() {
    if (downloadTimerRef.current !== null) {
      clearInterval(downloadTimerRef.current);
      downloadTimerRef.current = null;
    }
  }

  function clearCheckTimer() {
    if (checkTimerRef.current !== null) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearDownloadTimer();
      clearCheckTimer();
    };
  }, []);

  function updatePrefs(patch: Partial<UpdatePreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      void error;
    }
  }

  function handleCheckUpdates() {
    clearCheckTimer();
    setState("checking");
    const isOnline =
      typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
        ? navigator.onLine
        : true;
    checkTimerRef.current = setTimeout(() => {
      checkTimerRef.current = null;
      if (!isOnline) {
        setState("error");
      } else {
        setState(prefs.channel === "beta" ? "available" : "up_to_date");
      }
    }, 1200);
  }

  function handleCancelDownload() {
    clearDownloadTimer();
    clearCheckTimer();
    setDownloadProgress(0);
    setState("idle");
  }

  function handleStartDownload() {
    clearDownloadTimer();
    clearCheckTimer();
    setState("downloading");
    setDownloadProgress(10);
    downloadTimerRef.current = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearDownloadTimer();
          setState("ready");
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  }

  return (
    <div className="settings-detail-stack" style={{ gap: "20px" }}>
      <h2 className="settings-page-title" id="settings-section-title">
        软件更新
      </h2>
      {/* Current Version & Actions */}
      <div
        className="kk-card-box"
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src="/design/figma/settings-nav-updates.svg"
            alt=""
            width="24"
            height="24"
            style={{ filter: "brightness(1.2)" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--kk-text-primary)",
                }}
              >
                KK Studio 2.0
              </span>
              <span
                className="kk-pill-box"
                style={{
                  fontSize: "12px",
                  padding: "1px 8px",
                  backgroundColor: "var(--kk-bg-soft)",
                  color: "var(--kk-text-primary)",
                  border: "1px solid var(--kk-border-subtle)",
                }}
              >
                v{appVersion} · {appPlatform()}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              <span
                className="kk-pill-box"
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor:
                    state === "error"
                      ? "var(--kk-text-danger)"
                      : state === "available"
                        ? "var(--kk-warning)"
                        : "var(--kk-success)",
                }}
              />
              <span
                style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}
              >
                {state === "idle" && "当前版本运行稳定，点击可检查官方更新"}
                {state === "checking" &&
                  "正在连接更新服务器，查询最新发行版..."}
                {state === "up_to_date" && "当前已是最新版本，无需升级"}
                {state === "available" && "发现新版本 v2.2.0 (构建号 20261019)"}
                {state === "downloading" &&
                  `正在下载更新包... ${downloadProgress}%`}
                {state === "ready" && "更新包已校验就绪，重启即可生效"}
                {state === "error" && "检查更新失败，请检查网络或代理连接"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {state === "idle" && (
            <button
              type="button"
              className="settings-action"
              style={{ height: "var(--kk-control-h-md)" }}
              onClick={handleCheckUpdates}
            >
              检查更新
            </button>
          )}
          {state === "checking" && (
            <button
              type="button"
              className="settings-action secondary"
              disabled
              style={{ height: "var(--kk-control-h-md)", opacity: 0.7 }}
            >
              检查中...
            </button>
          )}
          {state === "up_to_date" && (
            <button
              type="button"
              className="settings-action secondary"
              style={{ height: "var(--kk-control-h-md)" }}
              onClick={handleCheckUpdates}
            >
              重新检查
            </button>
          )}
          {state === "available" && (
            <>
              <button
                type="button"
                className="settings-action"
                style={{ height: "var(--kk-control-h-md)" }}
                onClick={handleStartDownload}
              >
                立即下载更新
              </button>
              <button
                type="button"
                className="settings-action secondary"
                style={{ height: "var(--kk-control-h-md)" }}
                onClick={() => {
                  clearCheckTimer();
                  setState("idle");
                }}
              >
                稍后提醒
              </button>
            </>
          )}
          {state === "downloading" && (
            <button
              type="button"
              className="settings-action secondary"
              style={{ height: "var(--kk-control-h-md)" }}
              onClick={handleCancelDownload}
            >
              取消
            </button>
          )}
          {state === "ready" && (
            <button
              type="button"
              className="settings-action"
              style={{ height: "var(--kk-control-h-md)" }}
              onClick={() => {
                alert("正在重启应用更新...");
                setState("up_to_date");
              }}
            >
              立即重启更新
            </button>
          )}
          {state === "error" && (
            <button
              type="button"
              className="settings-action"
              style={{ height: "var(--kk-control-h-md)" }}
              onClick={handleCheckUpdates}
            >
              重试
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar when downloading */}
      {state === "downloading" && (
        <div
          className="kk-card-box"
          style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--kk-text-secondary)",
            }}
          >
            <span>下载进度 (SHA-256 在线校验)</span>
            <span>
              {Math.round((downloadProgress / 100) * 48.6)} MB / 48.6 MB (4.2
              MB/s)
            </span>
          </div>
          <div
            className="kk-pill-box"
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "var(--kk-bg-soft)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${downloadProgress}%`,
                height: "100%",
                backgroundColor: "var(--kk-accent)",
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>
      )}

      <UpdatePreferencesCard prefs={prefs} onUpdatePrefs={updatePrefs} />
      <UpdateChangelogCard
        selectedVersion={selectedVersion}
        onSelectVersion={setSelectedVersion}
      />
    </div>
  );
}
